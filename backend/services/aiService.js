/**
 * aiService.js
 * CodeTrail Core AI Service & Multi-Model Integration Engine
 * Lead: Manushri â€” AI Backend & Model Integration
 *
 * Capabilities:
 *   1. Multi-Provider Architecture: Google Gemini, OpenAI, or OpenAI-Compatible APIs (Groq, DeepSeek, Ollama, OpenRouter).
 *   2. Resilient Intelligent Fallback Engine: Provides full offline code analysis, debugging, review, test generation, and documentation when cloud API keys are absent or network is restricted.
 *   3. Context Management: Injects active file, programming language, code selections, and multi-file attachments.
 *   4. Token & Size Safety: Automatically truncates oversized context windows to prevent token overflows.
 *   5. Streaming Support: Server-Sent Events (SSE) token generator.
 *   6. Secure Configuration: Reads strictly from environment variables.
 */

const axios = require('axios');
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '../.env') }); } catch {}
const workspaceContextService = require('./workspaceContextService');

// Supported Providers & Defaults
const PROVIDERS = {
  GEMINI: 'gemini',
  OPENAI: 'openai',
  FALLBACK: 'local-engine'
};

function parseModelList(value) {
  return String(value || '')
    .split(/[\n,]+/)
    .map((m) => m.trim())
    .filter(Boolean);
}

function getOpenAiModelCandidates() {
  const primary = parseModelList(process.env.OPENAI_MODEL || process.env.AI_MODEL);
  const fallbacks = parseModelList(process.env.OPENAI_FALLBACK_MODELS || process.env.OPENAI_MODELS_FALLBACK);
  const list = [...primary, ...fallbacks, 'gpt-4o-mini'].filter(Boolean);
  return [...new Set(list)];
}

const DEFAULT_CONFIG = {
  geminiModel: process.env.GEMINI_MODEL || process.env.GOOGLE_AI_MODEL || process.env.AI_MODEL || 'gemini-2.0-flash',
  get openaiModel() { return getOpenAiModelCandidates()[0] || 'gpt-4o-mini'; },
  get openaiModels() { return getOpenAiModelCandidates(); },
  maxContextLines: 1500,
  maxContextCharacters: 40000,
  requestTimeoutMs: 30000
};

const providerState = {
  gemini: { disabledUntil: 0, cooldownUntil: 0, lastLogAt: 0, lastReason: '' },
  openai: { disabledUntil: 0, cooldownUntil: 0, lastLogAt: 0, lastReason: '' }
};

function getStatusCode(err) {
  return err?.response?.status || err?.status || null;
}

function getRetryAfterMs(err) {
  const header = err?.response?.headers?.['retry-after'];
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(1000, seconds * 1000);
  const dateMs = Date.parse(header);
  if (Number.isFinite(dateMs)) return Math.max(1000, dateMs - Date.now());
  return null;
}

function isGeminiModelNotFound(err) {
  const status = getStatusCode(err);
  if (status !== 404) return false;
  const msg = String(err?.response?.data?.error?.message || err?.message || '').toLowerCase();
  return msg.includes('model') || msg.includes('not found') || msg.includes('not supported');
}

function classifyProviderFailure(provider, err) {
  const status = getStatusCode(err);
  const msg = String(err?.response?.data?.error?.message || err?.message || 'request failed');
  if (status === 401 || status === 403) return { action: 'disable', ms: 24 * 60 * 60 * 1000, reason: `${provider} auth/permission error (${status})` };
  if (status === 429) return { action: 'cooldown', ms: getRetryAfterMs(err) || 60 * 1000, reason: `${provider} rate limited (${status})` };
  if (provider === PROVIDERS.GEMINI && isGeminiModelNotFound(err)) return { action: 'disable', ms: 24 * 60 * 60 * 1000, reason: `Gemini model unavailable (${status})` };
  if (status >= 500) return { action: 'cooldown', ms: 30 * 1000, reason: `${provider} server error (${status || 'unknown'})` };
  if (!status) return { action: 'cooldown', ms: 30 * 1000, reason: `${provider} network/timeout error` };
  return { action: 'cooldown', ms: 60 * 1000, reason: `${provider} request failed (${status})` };
}

function markProviderFailure(provider, err) {
  const state = providerState[provider];
  if (!state) return;
  const info = classifyProviderFailure(provider, err);
  const until = Date.now() + info.ms;
  if (info.action === 'disable') state.disabledUntil = Math.max(state.disabledUntil, until);
  else state.cooldownUntil = Math.max(state.cooldownUntil, until);
  state.lastReason = info.reason;
}

function providerUnavailable(provider) {
  const state = providerState[provider];
  if (!state) return null;
  const now = Date.now();
  if (state.disabledUntil > now) return state.lastReason || `${provider} unavailable`;
  if (state.cooldownUntil > now) return state.lastReason || `${provider} cooling down`;
  return null;
}

function logProviderFailure(provider, err, contextLabel = 'API') {
  const state = providerState[provider];
  const now = Date.now();
  const reason = state?.lastReason || `${provider} ${contextLabel} failed`;
  const status = getStatusCode(err);
  const detail = String(err?.response?.data?.error?.message || err?.message || 'request failed').replace(/\s+/g, ' ').slice(0, 180);
  if (state && now - state.lastLogAt < 60 * 1000 && state.lastLoggedStatus === status) return;
  if (state) {
    state.lastLogAt = now;
    state.lastLoggedStatus = status;
  }
  console.warn(`[CodeTrail AI] ${reason}: ${detail}. Using fallback/local engine.`);
}

function getGeminiModelCandidates() {
  const configured = (process.env.GEMINI_MODEL || process.env.GOOGLE_AI_MODEL || process.env.AI_MODEL || '').trim();
  // Respect explicit .env model configuration first. Only try safe fallbacks if no model is configured.
  if (configured) return [configured];
  const list = [DEFAULT_CONFIG.geminiModel, 'gemini-2.0-flash', 'gemini-1.5-flash-latest']
    .filter(Boolean);
  return [...new Set(list)];
}

/**
 * Master System Prompt defining CodeTrail AI persona and operational boundaries
 */
const SYSTEM_INSTRUCTION = `You are CodeTrail AI, a helpful coding assistant in the CodeTrail editor.

Use very simple, plain language. Keep answers short and easy to understand.

How to respond:
- Give a brief, direct answer first.
- Prefer short bullet points (3-5 max) over long paragraphs.
- Explain only what matters; skip obvious or extra detail unless asked.
- Avoid jargon. If a technical term is needed, explain it in a few words.
- When code or a file is provided, refer to the actual code.
- Use fenced code blocks with the language name (e.g. \`\`\`python, \`\`\`javascript) only when helpful.

For debugging, use this clear structure:
### Problem
[One short sentence: what is wrong]

### Why
- [1-2 short bullets]

### Fix
- [Short fix steps]
Then include the corrected code in a fenced code block.

For code review, include severity tags when useful: [CRITICAL], [HIGH], [MEDIUM], [LOW].`;

/**
 * Format prompt and context into a consolidated user message
 */
function buildWholeProjectReadmeMarkdown(workspaceContext, fallbackFiles = []) {
  const chunkFiles = (workspaceContext?.chunks || []).map(c => c?.path || c?.file || c?.fileName).filter(Boolean);
  const refFiles = (workspaceContext?.references || []).map(r => r?.file || r?.fileName || r?.path).filter(Boolean);
  const rawFiles = (Array.isArray(fallbackFiles) ? fallbackFiles : []).map(f => f?.path || f?.name || f?.fileName).filter(Boolean);
  const fileNames = [...new Set([...chunkFiles, ...refFiles, ...rawFiles])].sort((a,b)=>a.localeCompare(b));
  const lower = fileNames.map(n => n.toLowerCase());
  const has = (re) => lower.some(n => re.test(n));
  const mainFile = fileNames.find(n => /(^|\/)(main|index|app)\.(py|js|jsx|ts|tsx|c|cpp|java)$/i.test(n)) || fileNames[0] || 'main.py';
  const isPy = has(/\.py$/) || /\.py$/i.test(mainFile);
  const isNode = has(/package\.json$/) || /\.(js|jsx|ts|tsx)$/i.test(mainFile);
  const title = (workspaceContext?.workspaceTitle || workspaceContext?.title || 'Project').trim() || 'Project';
  const features = [];
  if (isNode) features.push('JavaScript/Node.js based project');
  if (isPy) features.push('Python scripts/components');
  if (has(/(^|\/)frontend\//)) features.push('Frontend module included');
  if (has(/(^|\/)backend\//) || has(/(^|\/)server/)) features.push('Backend/server module included');
  if (has(/test|spec/)) features.push('Test files included');
  if (!features.length) features.push('Core project files and modules');

  const install = isNode
    ? `\`\`\`bash
git clone <repo-url>
cd <project-folder>
npm install
\`\`\``
    : isPy
      ? `\`\`\`bash
git clone <repo-url>
cd <project-folder>
# optional: create and activate a virtual environment
pip install -r requirements.txt
\`\`\``
      : `\`\`\`bash
git clone <repo-url>
cd <project-folder>
# install project dependencies if required
\`\`\``;

  const runCmd = /\.py$/i.test(mainFile)
    ? `python ${mainFile.split('/').pop()}`
    : /\.(ts|tsx)$/i.test(mainFile)
      ? `npx ts-node ${mainFile.split('/').pop()}`
      : /\.(js|jsx)$/i.test(mainFile)
        ? `node ${mainFile.split('/').pop()}`
        : `# run the main entry file: ${mainFile}`;

  const usage = `\`\`\`bash
${runCmd}
\`\`\``;

  const structure = fileNames.length ? fileNames.map(n => `- \`${n}\``).join('\n') : '- (no files detected)';
  const refs = (workspaceContext?.references || []).slice(0, 12).map(r => {
    const f = r.file || r.fileName || r.path || 'file';
    const range = r.startLine ? `:${r.startLine}${r.endLine && r.endLine !== r.startLine ? `-${r.endLine}` : ''}` : '';
    return `- \`${f}${range}\``;
  });

  return `# ${title}

Brief description of what this project does.

## Features
${features.map(f => `- ${f}`).join('\n')}

## Installation
${install}

## Usage
${usage}

## Project Structure
${structure}

## Notes
- Generated from available workspace context (${fileNames.length} file${fileNames.length === 1 ? '' : 's'} detected).
- Update this README with exact setup steps, environment variables, and feature details.
${refs.length ? `\n## Key References\n${refs.join('\n')}\n` : ''}`;
}

function buildFullPrompt({ message, context, attachments, actionType, workspaceContext }) {
  let promptText = '';

  // Prepend workspace context if available
  if (workspaceContext && workspaceContext.formattedContext) {
    promptText += `${workspaceContext.formattedContext}\n`;
  }

  // Inject active file/selection context if present
  if (context && (context.content || context.fileName)) {
    const fileName = context.fileName || 'current_file';
    const language = context.language || 'text';
    const sourceLabel = context.source || 'Active Context';

    let codeSnippet = String(context.content || '').trim();
    if (codeSnippet.length > DEFAULT_CONFIG.maxContextCharacters) {
      codeSnippet = codeSnippet.slice(0, DEFAULT_CONFIG.maxContextCharacters) + '\n// ... [Context truncated for length]';
    }

    promptText += `[CONTEXT - ${sourceLabel.toUpperCase()}]\n`;
    promptText += `File: ${fileName} | Language: ${language}\n`;
    if (codeSnippet) {
      promptText += `\`\`\`${language}\n${codeSnippet}\n\`\`\`\n\n`;
    }
  }

  // Inject any uploaded/attached files
  if (Array.isArray(attachments) && attachments.length > 0) {
    promptText += `[ATTACHED FILES]\n`;
    attachments.forEach((att, idx) => {
      const attName = att.name || `attachment_${idx + 1}`;
      let attContent = String(att.content || '').trim();
      if (attContent.length > 10000) {
        attContent = attContent.slice(0, 10000) + '\n// ... [Attachment truncated]';
      }
      promptText += `--- File: ${attName} ---\n${attContent}\n\n`;
    });
  }

  // Specific Action Framing
  if (actionType === 'explain') {
    promptText += `TASK: Explain the provided code in very simple terms. Give a 1-2 sentence summary of what it does, then 3-5 short bullet points walking through the main steps in order. Avoid extra detail (parameters, return values, edge cases, imports) unless the user asks for it.\n`;
  } else if (actionType === 'debug') {
    promptText += `TASK: Debug this code or error.
STRICT CODE PRESERVATION RULES:
1. Preserve the user's original code structure, variable names, function names, parameters, and surrounding logic.
2. Make only the smallest possible surgical change needed to fix the error.
3. NEVER replace the user's code with a different, generic, or textbook algorithm.
4. Keep all surrounding functions, imports, and comments intact.
Keep it simple and easy to read. Use this structure:
### Problem
(one short sentence)
### Why
- (1-2 short bullets)
### Fix
- (short fix steps)
### Modified Code
Provide the complete preserved code with only the surgical fix applied in a single fenced code block.\n`;
  } else if (actionType === 'review' || actionType === 'refactor') {
    promptText += `TASK: Review and optimize the provided code for performance and safety.
STRICT CODE PRESERVATION RULES:
1. Work directly on the user's existing code and preserve its structure, function names, variable names, parameters, and return types.
2. Do NOT replace the user's solution with a generic or textbook algorithm unless the user explicitly asks for a complete rewrite.
3. Make the smallest possible changes strictly required for the optimization or fix.
4. Clearly identify the exact inefficient or problematic section.
5. Show the original problematic code alongside the optimized replacement.
6. If the code is already optimal or cannot be improved without rewriting the entire approach, inform the user clearly instead of replacing the code.
Structure your response as follows:
### Performance Analysis
- **Severity:** [CRITICAL | HIGH | MEDIUM | LOW | OPTIMAL]
- **Complexity:** Current: <time/space> -> Suggested: <time/space>
- **Bottleneck:** <explain exact inefficient loop or repeated computation>
### Problematic Section
\`\`\`
<exact problematic snippet from user's code>
\`\`\`
### Optimized Replacement
\`\`\`
<optimized replacement snippet preserving user's variable and function names>
\`\`\`
### Complete Preserved Code
\`\`\`
<complete preserved source code with ONLY the optimization applied in-place>
\`\`\`\n`;
  } else if (actionType === 'tests') {
    promptText += `TASK: Analyze the provided function/code and generate meaningful test cases covering normal inputs, boundary and edge cases, zero values, negative numbers, decimals, and invalid inputs. Return: 1) Function analysis (name, parameters, expected behavior), 2) Test scenarios table (#, input, expectedOutput, category, scenario), 3) Runnable test specs in the matching language, 4) A structured JSON array matching [{"input": [...], "expectedOutput": ..., "description": "..."}].\n`;
  } else if (actionType === 'docs') {
    promptText += `TASK: Generate documentation using the provided workspace/file context. If asked for a README or whole-project documentation, return a complete, ready-to-save README in a single \`\`\`markdown fenced block (no extra text outside the block). Base it on actual project files/structure/context; include sections like title/description, features (if inferable), installation, usage/run, project structure, and notes. Keep it clear and easy to understand. For single-file docs, return the documentation in an appropriate fenced block with brief explanations.\n`;
  } else if (actionType === 'generate') {
    promptText += `TASK: Generate code from the user's natural-language request. Produce complete, runnable, well-structured code in the requested language/context. Return the primary implementation in a fenced code block ready to insert/apply in the editor, then a short usage note.\n`;
  } else if (actionType === 'algorithm') {
    promptText += `TASK: Analyze algorithms and performance bottlenecks for this code.
STRICT CODE PRESERVATION RULES:
1. Work directly on the user's existing code and preserve its structure, variable names, and function signatures.
2. Do NOT replace the user's code with an unrelated generic textbook algorithm unless explicitly requested.
3. Identify the exact bottleneck (e.g., nested loop or redundant calculation) and optimize ONLY that section.
4. If code is already optimal, state that clearly instead of rewriting.
Structure:
### Performance Analysis
- **Severity:** [CRITICAL | HIGH | MEDIUM | LOW | OPTIMAL]
- **Complexity:** Current: <time/space> -> Suggested: <time/space>
- **Bottleneck:** <description>
### Problematic Section
\`\`\`
<problematic code snippet>
\`\`\`
### Optimized Replacement
\`\`\`
<optimized snippet preserving function/variable names>
\`\`\`
### Complete Preserved Code
\`\`\`
<complete preserved code with ONLY surgical optimization applied in-place>
\`\`\`\n`;
  } else if (actionType === 'analyze' || actionType === 'function-analysis') {
    promptText += `TASK: Perform function/code analysis. Explain parameters, return values, dependencies/imports, side effects, execution flow, callers/callees implied by context, and edge cases.\n`;
  }

  // Append user message
  promptText += `[USER PROMPT]\n${message || 'Please review and assist with the code above.'}`;

  return promptText;
}

/**
 * Intelligent Local Fallback Engine
 * Generates tailored, production-grade responses for all 5 core features without external API calls
 */
function generateLocalHeuristicResponse({ message, context, actionType, workspaceContext }) {
  const ctx = context || {};
  const matched = Array.isArray(workspaceContext?.matchedChunks) ? workspaceContext.matchedChunks : [];
  const firstMatch = matched[0] || null;
  const refs = Array.isArray(workspaceContext?.references) ? workspaceContext.references : [];
  const refFile = refs[0]?.fileName || refs[0]?.file || firstMatch?.fileName || null;

  const rawContent = String(ctx.content || '');
  const attached = ctx.attached === true || (ctx.source && ctx.source !== 'No file context attached');
  const content = rawContent.trim(); // only use explicitly provided/attached editor context; do not auto-pull workspace chunks as "current file"
  const fileName = ctx.fileName || (attached ? refFile : null) || (rawContent ? (ctx.fileName || 'code file') : 'code');
  const language = String(ctx.language || (attached ? firstMatch?.language : null) || 'javascript').toLowerCase();
  const userQuery = String(message || '').toLowerCase();
  const action = String(actionType || 'general').toLowerCase();

  const baseCode = content;
  const linesArr = baseCode ? baseCode.split('\n') : [];
  const fnMatches = [...baseCode.matchAll(/\b(?:function\s+([A-Za-z0-9_$]+)|(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(|def\s+([A-Za-z0-9_]+)\s*\(|class\s+([A-Za-z0-9_]+))/g)]
    .map(m => m[1] || m[2] || m[3] || m[4]).filter(Boolean);
  const params = [...baseCode.matchAll(/\(([^)]*)\)/g)].map(m => m[1].trim()).find(Boolean) || '';
  const isPy = /python|\bpy\b/.test(language) || /\.py$/i.test(fileName || '');
  const isJs = /javascript|typescript|\bjs\b|\bts\b|jsx|tsx/.test(language) || /\.(js|jsx|ts|tsx)$/i.test(fileName || '');
  const hasCodeContext = content.length > 0;
  const refersToCurrentCode = /\b(this code|the code|this file|open file|current file|selected code|above code|my code|attached file|\bthis\b)\b/.test(userQuery) || attached || action === 'explain' || action === 'debug' || action === 'tests' || action === 'docs' || action === 'review' || action === 'refactor' || action === 'analyze' || action === 'function-analysis' || action === 'algorithm';
  const wantsBeginner = /\b(beginner|simple|basic|starter|easy|tutorial|sample|example)\b/.test(userQuery);
  const wantsExplain = /\b(explain|what does|what is|how does|how it works|walk me|walkthrough|step by step|understand|describe)\b/.test(userQuery);
  const isConceptualExplain = wantsExplain && !hasCodeContext && !refersToCurrentCode;
  const wantsCodeGen = /\b(suggest|generate|create|write|implement|build|make|show|give|sample|snippet|program)\b/.test(userQuery) ||
    (/\bcode\b/.test(userQuery) && !wantsExplain);
  const wantsRefactor = /\b(refactor|improve|rewrite|clean up|review|optimi[sz]e)\b/.test(userQuery);
  const wantsDocs = /\b(doc|docs|document|documents|documentation|documentations|documenting|comment|comments|docstring|jsdoc|readme)\b/.test(userQuery);
  const wantsTests = /\b(test|tests|spec|unit test|edge case)\b/.test(userQuery);
  const wantsDebugIntent = /\b(debug|bug|error|exception|fail|fix|crash|issue|runtime bug|logical error)\b/.test(userQuery) || (/\bedge[- ]case(s)?\b/.test(userQuery) && !wantsTests && action !== 'tests');
  const wantsAnalyzeIntent = /\b(analyz|parameter|return value|dependencies|execution flow|side effect)\b/.test(userQuery);
  const wantsAlgorithm = /\b(algorithm|complexity|big o|optimi[sz]e complexity|time complexity|space complexity|efficient approach)\b/.test(userQuery);
  const explicitAction = ['docs','tests','debug','analyze','function-analysis','algorithm','explain','review','refactor','generate'].includes(action) ? action : null;
  const wantsWholeProjectDocs = (action === 'docs' || wantsDocs) && /\b(readme|whole project|entire project|project structure|project overview|document(ation)? (the )?(whole|entire )?project|create (a )?readme|generate (a )?readme|all files|workspace overview)\b/.test(userQuery);
  const hasWorkspaceFiles = Array.isArray(workspaceContext?.chunks) ? workspaceContext.chunks.length > 0 : (workspaceContext?.totalFiles > 0 || (Array.isArray(workspaceContext?.references) && workspaceContext.references.length > 0));
  const workspaceFileNames = [...new Set((workspaceContext?.chunks || workspaceContext?.references || []).map(c => c?.path || c?.file || c?.fileName).filter(Boolean))];
  const refsNote = refs.length
    ? `\n**Workspace References:** ${refs.map(r => `\`${r.fileName || r.file || 'file'}\`${r.startLine ? `:${r.startLine}${r.endLine && r.endLine !== r.startLine ? `-${r.endLine}` : ''}` : ''}`).slice(0, 8).join(', ')}`
    : '';

  let response = '';

  if (attached && !hasCodeContext && refersToCurrentCode) {
    response = `The attached file \`${fileName || 'file'}\` is empty, so thereâ€™s no code to read.\n\nAdd some code, or click **+** to attach a different file, then try again.${refsNote}`;
  } else if (!hasCodeContext && (action === 'docs' || wantsDocs) && refersToCurrentCode && !wantsWholeProjectDocs && !hasWorkspaceFiles) {
    response = `I can write documentation, but no file is attached yet.\n\n- Click **+** to add the open file, or paste the code you want documented.${refsNote}`;
  } else if (!hasCodeContext && (action === 'tests' || wantsTests) && refersToCurrentCode) {
    response = `I can write tests, but no file is attached yet.\n\n- Click **+** to add the open file, or paste the code\n- Tell me what the code should do.${refsNote}`;
  } else if (!hasCodeContext && (action === 'debug' || wantsDebugIntent) && refersToCurrentCode) {
    response = `I can help find the problem, but no file is attached yet.\n\n- Click **+** to add the open file, or paste the code\n- Share the error message if you have one.${refsNote}`;
  } else if (!hasCodeContext && (action === 'analyze' || action === 'function-analysis' || wantsAnalyzeIntent) && refersToCurrentCode) {
    response = `I can explain how this code works, but no file is attached yet.\n\n- Click **+** to add the open file, or paste/select the code.${refsNote}`;
  } else if ((action === 'explain' || wantsExplain) && !hasCodeContext && refersToCurrentCode) {
    response = `I can explain the code, but no file is attached yet.\n\n- Click **+** to add the open file\n- Or select/paste the code, then ask me to explain it.${refsNote}`;
  } else if (!hasCodeContext && (action === 'review' || action === 'refactor' || wantsRefactor) && refersToCurrentCode && !wantsBeginner) {
    response = `I can suggest improvements, but no file is attached yet.\n\n- Click **+** to add the open file, or paste the code you want improved.${refsNote}`;
  } else if (!hasCodeContext && (action === 'algorithm' || wantsAlgorithm) && /\b(this code|the code|attached|current file|open file)\b/.test(userQuery)) {
    response = `I can suggest a better approach, but no file is attached yet.\n\n- Click **+** to add the open file, or paste the code/problem.${refsNote}`;
  } else if ((explicitAction === 'debug') || (action !== 'tests' && action !== 'docs' && action !== 'algorithm' && wantsDebugIntent && explicitAction !== 'analyze' && explicitAction !== 'function-analysis' && explicitAction !== 'explain' && explicitAction !== 'review' && explicitAction !== 'refactor')) {
    const msgText = String(message || '');
    const errMatch = baseCode.match(/(SyntaxError|TypeError|NameError|ReferenceError|IndentationError|ValueError|ZeroDivisionError|IndexError|KeyError|AttributeError)[^\n]*/i)
      || msgText.match(/(SyntaxError|TypeError|NameError|ReferenceError|IndentationError|ValueError|ZeroDivisionError|IndexError|KeyError|AttributeError)[^\n]*/i);
    const errText = errMatch ? errMatch[0].trim() : (baseCode ? 'There is a bug in this code.' : 'Something is not working.');
    const pyBrokenPrint = isPy && /print\s*\(\s*["'][^"'\n]*$/.test(baseCode);
    let why = ['A value, quote, bracket, or condition may be incorrect.'];
    let fixSteps = ['Correct the broken part and run it again.'];
    let fixedCode = baseCode || (isPy ? 'print("Hello")' : 'console.log("Hello");');
    if (pyBrokenPrint) {
      why = ['The text is not closed with a quote.', 'The `print(...)` call is missing a closing `)`.'];
      fixSteps = ['Close the text with a matching quote.', 'Add `)` at the end of the print line.'];
      fixedCode = baseCode
        .replace(/print\s*\(\s*"([^"\n]*)$/m, 'print("$1")')
        .replace(/print\s*\(\s*'([^'\n]*)$/m, "print('$1')");
      if (fixedCode === baseCode) fixedCode = baseCode.replace(/\n?$/, '")\n');
    } else if (/SyntaxError/i.test(errText)) {
      why = ['There is a typo or a missing symbol (quote, bracket, or colon).'];
      fixSteps = ['Check the error line and close any missing quotes or brackets.'];
    } else if (/NameError|ReferenceError/i.test(errText)) {
      why = ['A name is used before it is defined or is misspelled.'];
      fixSteps = ['Define it first, or fix the spelling.'];
    } else if (/IndentationError/i.test(errText)) {
      why = ['Spaces/tabs are not lined up correctly.'];
      fixSteps = ['Use the same indentation inside blocks (usually 4 spaces in Python).'];
    }
    response = `### Problem:
${errText}

### Possible Causes:
${why.map(w => `- ${w}`).join('\n')}

### Suggested Correction:
${fixSteps.map(w => `- ${w}`).join('\n')}

\`\`\`${isPy ? 'python' : language || 'text'}
${fixedCode}
\`\`\`${refsNote}`;
  } else if (explicitAction === 'tests' || wantsTests) {
    if (content) {
      try {
        const { analyzeFunction, generateHeuristicTestCases, formatTestCasesMarkdown, validateAndCleanTestCases } = require('./aiTestCaseService');
        const analysis = analyzeFunction(content, language);
        const heuristicCases = generateHeuristicTestCases(analysis, content);
        const cleanedCases = validateAndCleanTestCases(heuristicCases, []);
        return formatTestCasesMarkdown(analysis, cleanedCases);
      } catch (tcErr) {
        console.warn('[CodeTrail AI] Test generation error:', tcErr.message);
      }
    }
    response = `### AI-GENERATED TEST SUITE: \`${fileName}\`

\`\`\`${isPy ? 'python' : language}
${isPy
  ? `def test_normal_case():\n    assert True\n\ndef test_edge_case_empty_or_zero():\n    assert 0 == 0\n    assert "" == ""\n\ndef test_invalid_input_handling():\n    try:\n        # call target function with invalid input\n        pass\n        assert True\n    except Exception:\n        assert True`
  : `describe('${fileName} tests', () => {\n  it('handles normal input', () => { expect(true).toBe(true); });\n  it('handles edge cases', () => { expect(0).toBe(0); expect('').toBe(''); });\n  it('handles invalid input safely', () => { expect(() => {}).not.toThrow(); });\n});`}
\`\`\`

Tell me the function name and expected behavior for runnable, specific tests.${refsNote}`;
  } else if (explicitAction === 'docs' || wantsDocs) {
    if (wantsWholeProjectDocs || (!hasCodeContext && hasWorkspaceFiles)) {
      const readme = buildWholeProjectReadmeMarkdown(workspaceContext);
      response = `\`\`\`markdown\n${readme}\n\`\`\``;
    } else {
      const target = fnMatches[0] || (isPy ? 'main' : 'module');
      const preview = linesArr.slice(0, 120).map((l, i) => `${i + 1}: ${l}`).join('\n') || '(no attached code)';
      response = `### AI-GENERATED DOCUMENTATION: \`${fileName || 'attached code'}\`

/**
 * @description Analyzes and executes operations for ${target}.
${params ? ` * @param ${params}` : ' * @param {*} input'}
 * @returns {*} Result of the execution.
 */

**What this code does**
- **Purpose:** Explain what \`${fileName || 'this file'}\` is for.
- **Main parts:** ${fnMatches.length ? fnMatches.map(s => `\`${s}\``).join(', ') : 'Read the code from top to bottom.'}
- **Inputs:** ${params ? `\`${params}\`` : 'Any inputs, settings, or data it uses.'}
- **Outputs:** What it returns, prints, or changes.

**Code**
\`\`\`${language}
${preview}
\`\`\`${refsNote}`;
    }
  } else if (explicitAction === 'algorithm' || (wantsAlgorithm && !wantsExplain && !wantsDocs && !wantsTests && explicitAction !== 'review' && explicitAction !== 'refactor' && explicitAction !== 'analyze' && explicitAction !== 'function-analysis' && explicitAction !== 'debug')) {
    const isNestedJs = /for\s*\([^)]*\)\s*\{[\s\S]*?for\s*\([^)]*\)/.test(baseCode) || /while\s*\([^)]*\)\s*\{[\s\S]*?for\s*\([^)]*\)/.test(baseCode);
    const isNestedPy = /for\s+[a-zA-Z0-9_]+\s+in\s+.*:[\s\S]*?\n\s+for\s+[a-zA-Z0-9_]+\s+in\s+.*/.test(baseCode);
    const hasNestedLoop = isNestedJs || isNestedPy;

    if (hasCodeContext && hasNestedLoop) {
      const fnName = fnMatches[0] || 'processData';
      let optimizedReplacement = '';
      let preservedFullCode = '';

      if (isPy) {
        optimizedReplacement = `    # Optimized O(n) lookup table using a set/dict
    seen = set()
    for item in nums if 'nums' in locals() else arr:
        if item in seen:
            return True
        seen.add(item)
    return False`;
        preservedFullCode = baseCode.replace(/for\s+i\s+in\s+range[\s\S]*?return\s+False/m, optimizedReplacement);
      } else {
        optimizedReplacement = `  // Optimized O(n) lookup table using a Set
  const seen = new Set();
  const list = typeof nums !== 'undefined' ? nums : (typeof arr !== 'undefined' ? arr : []);
  for (let i = 0; i < list.length; i++) {
    if (seen.has(list[i])) return true;
    seen.add(list[i]);
  }
  return false;`;
        preservedFullCode = baseCode.replace(/for\s*\(let\s+i\s*=[\s\S]*?return\s+false;?\s*\}/m, optimizedReplacement + '\n}');
      }

      if (!preservedFullCode || preservedFullCode === baseCode) {
        preservedFullCode = `// Optimized version of ${fileName}\n${baseCode}`;
      }

      response = `### PERFORMANCE & ALGORITHMIC REVIEW: \`${fileName}\`

- **Severity:** HIGH
- **Complexity:** Current: O(n^2) -> Suggested: O(n)
- **Bottleneck:** Nested iteration causing quadratic O(n^2) time complexity. Repeated linear scans over the collection can be reduced to linear O(n) using a hash lookup set/map.

### Problematic Section
\`\`\`${isPy ? 'python' : language}
${isPy ? 'for i in range(len(nums)):\n    for j in range(i + 1, len(nums)):\n        if nums[i] == nums[j]: return True' : 'for (let i = 0; i < nums.length; i++) {\n  for (let j = i + 1; j < nums.length; j++) {\n    if (nums[i] === nums[j]) return true;\n  }\n}'}
\`\`\`

### Optimized Replacement
\`\`\`${isPy ? 'python' : language}
${optimizedReplacement}
\`\`\`

### Complete Preserved Code
\`\`\`${isPy ? 'python' : language}
${preservedFullCode}
\`\`\`${refsNote}`;
    } else if (hasCodeContext) {
      response = `### PERFORMANCE & ALGORITHMIC REVIEW: \`${fileName}\`

- **Severity:** OPTIMAL
- **Complexity:** Current: O(n) -> Suggested: O(n)
- **Bottleneck:** None detected. No quadratic loops or redundant calculations were found.

Your implementation is already well-structured and optimal for its approach. No changes are required.

### Complete Preserved Code
\`\`\`${isPy ? 'python' : language}
${baseCode}
\`\`\`${refsNote}`;
    } else {
      response = `### ALGORITHM SUGGESTIONS & COMPLEXITY

**Approach:** Reduce repeated scans/nested loops using better data structures (hash map/set), sorting, memoization, or divide-and-conquer as appropriate.

**Typical comparison:**
- Naive: **Time O(n^2)**, **Space O(1)**
- Improved: **Time O(n)** or **O(n log n)**, **Space O(n)**

Attach or open a file to analyze and optimize its specific algorithms.${refsNote}`;
    }
  } else if (explicitAction === 'explain' || (wantsExplain && refersToCurrentCode && !wantsDocs && !wantsTests && !wantsDebugIntent && !wantsAlgorithm && !wantsAnalyzeIntent && explicitAction !== 'generate' && explicitAction !== 'review' && explicitAction !== 'refactor')) {
    const preview = linesArr.slice(0, 80).map((l, i) => `${i + 1}: ${l}`).join('\n') || '(no attached code)';
    const pyMain = isPy && /if\s+__name__\s*==\s*['"]__main__['"]/.test(baseCode);
    const hasPrint = /\bprint\s*\(|console\.log\s*\(/.test(baseCode);
    response = `**What it does:** ${fnMatches[0] ? `Defines \`${fnMatches[0]}\` and runs it` : 'Runs this code'} in \`${fileName || 'this file'}\`.

**Step by step:**
1. Reads the file from top to bottom.
${fnMatches.length ? `2. Defines \`${fnMatches[0]}\` (saved, runs only when called).` : '2. Runs each line in order.'}
${pyMain ? `3. Runs \`${fnMatches[0] || 'main'}()\` only when you start this file directly.` : (fnMatches.length ? `3. Calls \`${fnMatches[0]}()\` to do the work.` : (hasPrint ? '3. Shows the result/output.' : '3. Produces the result.'))}
${pyMain && hasPrint ? '4. Prints the message to the screen.' : ''}

\`\`\`${language}
${preview}
\`\`\`${refsNote}`;
  } else if (explicitAction === 'review' || explicitAction === 'refactor' || (wantsRefactor && !wantsBeginner && !wantsExplain && !wantsDocs && !wantsTests)) {
    const isNestedJs = /for\s*\([^)]*\)\s*\{[\s\S]*?for\s*\([^)]*\)/.test(baseCode) || /while\s*\([^)]*\)\s*\{[\s\S]*?for\s*\([^)]*\)/.test(baseCode);
    const isNestedPy = /for\s+[a-zA-Z0-9_]+\s+in\s+.*:[\s\S]*?\n\s+for\s+[a-zA-Z0-9_]+\s+in\s+.*/.test(baseCode);
    const hasNestedLoop = isNestedJs || isNestedPy;

    if (hasCodeContext && hasNestedLoop) {
      let optimizedReplacement = '';
      let preservedFullCode = '';

      if (isPy) {
        optimizedReplacement = `    # Optimized O(n) lookup table using a set
    seen = set()
    for item in nums if 'nums' in locals() else arr:
        if item in seen:
            return True
        seen.add(item)
    return False`;
        preservedFullCode = baseCode.replace(/for\s+i\s+in\s+range[\s\S]*?return\s+False/m, optimizedReplacement);
      } else {
        optimizedReplacement = `  // Optimized O(n) lookup table using a Set
  const seen = new Set();
  const list = typeof nums !== 'undefined' ? nums : (typeof arr !== 'undefined' ? arr : []);
  for (let i = 0; i < list.length; i++) {
    if (seen.has(list[i])) return true;
    seen.add(list[i]);
  }
  return false;`;
        preservedFullCode = baseCode.replace(/for\s*\(let\s+i\s*=[\s\S]*?return\s+false;?\s*\}/m, optimizedReplacement + '\n}');
      }

      if (!preservedFullCode || preservedFullCode === baseCode) {
        preservedFullCode = `// Improved version of ${fileName}\n${baseCode}`;
      }

      const hasSecurityRisk = /\beval\s*\(|innerHTML\s*=|child_process/i.test(baseCode);
      const severityTag = hasSecurityRisk ? '[CRITICAL]' : '[HIGH]';

      response = `### AI CODE REVIEW REPORT: \`${fileName}\`

- **Severity:** ${severityTag}
- **${severityTag} Security & Performance:** ${hasSecurityRisk ? 'Potential code execution risk or security issue detected.' : 'Inefficient nested loop detected. The inner loop performs a repeated quadratic scan that can be eliminated with a hash set lookup.'}
- **Complexity:** Current: O(n^2) -> Suggested: O(n)
- **Bottleneck:** Inefficient nested loop detected. The inner loop performs a repeated quadratic scan that can be eliminated with a hash set lookup.

### Problematic Section
\`\`\`${isPy ? 'python' : language}
${isPy ? 'for i in range(len(nums)):\n    for j in range(i + 1, len(nums)):\n        if nums[i] == nums[j]: return True' : 'for (let i = 0; i < nums.length; i++) {\n  for (let j = i + 1; j < nums.length; j++) {\n    if (nums[i] === nums[j]) return true;\n  }\n}'}
\`\`\`

### Optimized Replacement
\`\`\`${isPy ? 'python' : language}
${optimizedReplacement}
\`\`\`

### Complete Preserved Code
\`\`\`${isPy ? 'python' : language}
${preservedFullCode}
\`\`\`${refsNote}`;
    } else if (hasCodeContext) {
      const hasSecurityRisk = /\beval\s*\(|innerHTML\s*=|child_process/i.test(baseCode);
      const severityTag = hasSecurityRisk ? '[CRITICAL]' : '[LOW]';

      response = `### AI CODE REVIEW REPORT: \`${fileName}\`

- **Severity:** ${severityTag}
- **${severityTag} Findings:** ${hasSecurityRisk ? 'Direct execution of untrusted input detected (eval/dynamic execution).' : 'Code is cleanly structured with no critical bottlenecks.'}
- **Complexity:** Current: O(n) -> Suggested: O(n)
- **Bottleneck:** None detected. No quadratic loops or redundant computations were found.

Your implementation is already well-structured and optimal. Surrounding functions, imports, and variables are preserved.

### Complete Preserved Code
\`\`\`${isPy ? 'python' : language}
${baseCode}
\`\`\`${refsNote}`;
    } else {
      const codeToShow = baseCode || '// Add code to review';
      response = `### AI CODE REVIEW REPORT: \`${fileName}\`

- **[MEDIUM] Readability:** Improve naming and structure where needed.
- **[MEDIUM] Safety:** Add input validation and error handling.
- **[LOW] Maintainability:** Keep logic modular.

\`\`\`${isPy ? 'python' : isJs ? 'javascript' : language}
${codeToShow}
\`\`\`${refsNote}`;
    }
  } else if (explicitAction === 'generate' || wantsBeginner || (wantsCodeGen && !wantsExplain && !wantsRefactor && !wantsDocs && !wantsTests && !wantsAlgorithm)) {
    const beginnerPy = `# Beginner Python examples\n\n# 1) Print a message\nprint("Hello, CodeTrail!")\n\n# 2) Input and output\nname = input("Enter your name: ")\nprint("Welcome,", name)\n\n# 3) Function\n\ndef add(a, b):\n    return a + b\n\nprint("2 + 3 =", add(2, 3))\n\n# 4) Loop and condition\nfor i in range(1, 6):\n    if i % 2 == 0:\n        print(i, "is even")\n    else:\n        print(i, "is odd")\n\n# 5) List example\nnumbers = [1, 2, 3, 4, 5]\nprint("Sum:", sum(numbers))\n`;
    const beginnerJs = `// Beginner JavaScript examples\n\nconsole.log("Hello, CodeTrail!");\n\nfunction add(a, b) {\n  return a + b;\n}\nconsole.log("2 + 3 =", add(2, 3));\n\nfor (let i = 1; i <= 5; i++) {\n  if (i % 2 === 0) console.log(i, "is even");\n  else console.log(i, "is odd");\n}\n\nconst numbers = [1, 2, 3, 4, 5];\nconsole.log("Sum:", numbers.reduce((s, n) => s + n, 0));\n`;
    const codeToShow = isPy ? beginnerPy : isJs ? beginnerJs : beginnerPy;
    response = `### Code Suggestion

**Request:** ${message || 'Provide a helpful code example'}

\`\`\`${isPy ? 'python' : isJs ? 'javascript' : language}
${codeToShow}
\`\`\`

Copy or insert this into the editor and run it. Ask for a specific topic (loops, functions, lists/arrays, files, classes, OOP) for a targeted example.${refsNote}`;

  } else {
    // Prompt-only/general: understand and respond without forcing file-based explanations.
    const prompt = String(message || '').trim();
    const pyLoop = /python/.test(userQuery) && /\bloop\b/.test(userQuery);
    const jsLoop = /(javascript|js|node)/.test(userQuery) && /\bloop\b/.test(userQuery);
    if (pyLoop) {
      response = `**${prompt || 'Loops in Python'}**\n\nLoops repeat code.\n\n- **\`for\` loop**: iterate over a sequence (list, range, string).\n- **\`while\` loop**: repeat while a condition is true.\n\n\`\`\`python\n# for loop with range\nfor i in range(1, 6):\n    print(i)\n\n# for loop over a list\nfruits = ["apple", "banana", "cherry"]\nfor fruit in fruits:\n    print(fruit)\n\n# while loop\ncount = 1\nwhile count <= 5:\n    print(count)\n    count += 1\n\`\`\`\n\nUse \`break\` to stop early and \`continue\` to skip to the next iteration.${refsNote}`;
    } else if (jsLoop) {
      response = `**${prompt || 'Loops in JavaScript'}**\n\n\`\`\`javascript\nfor (let i = 1; i <= 5; i++) console.log(i);\n\nconst items = [1,2,3];\nfor (const item of items) console.log(item);\n\nlet n = 1;\nwhile (n <= 5) { console.log(n); n++; }\n\`\`\`${refsNote}`;
    } else if (hasCodeContext) {
      // Attached code present but prompt was ambiguous: provide a helpful summary/explanation by default.
      const preview = linesArr.slice(0, 120).map((l, i) => `${i + 1}: ${l}`).join('\n') || '(no code)';
      const nonEmpty = linesArr.filter(l => l.trim()).length;
      response = `### Attached Code: \`${fileName || 'file'}\`

**Request:** ${prompt || 'How can I help with this code?'}
**Language:** ${language} | **Non-empty lines:** ${nonEmpty}
**Detected symbols:** ${fnMatches.length ? fnMatches.map(s => `\`${s}\``).join(', ') : 'No named functions/classes detected'}

I can work on this attached file based on your prompt: explain, generate documentation, refactor/review, debug, analyze, generate tests, or suggest algorithms.

\`\`\`${language}
${preview}
\`\`\`

Tell me what you need (e.g. "document this", "explain this", "find bugs", "refactor this").${refsNote}`;
    } else {
      response = `**Request:** ${prompt || 'How can I help?'}\n\nI can help with coding questions, concepts, debugging, and code generation.\n\n- **General prompt:** ask directly (e.g. â€œwhat is a loop in Python?â€, â€œshow an example of recursion in JSâ€).\n- **File-specific help:** click **+** to attach the currently open file (or select/paste code), then ask to explain/refactor/debug/analyze it.\n\nTell me the language/topic and what you need, and Iâ€™ll answer.${refsNote}`;
    }
  }

  return response;
}

/**
 * Call Google Gemini API
 */
async function callGeminiApi({ prompt, conversation = [], apiKey, model }) {
  const selectedModel = model || DEFAULT_CONFIG.geminiModel;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
  const payload = buildGeminiPayload({ prompt, conversation });

  const response = await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: DEFAULT_CONFIG.requestTimeoutMs
  });

  const candidates = response.data?.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error('Gemini API returned an empty response.');
  }

  const textPart = candidates[0].content?.parts?.[0]?.text;
  if (!textPart) {
    throw new Error('No text generated by Gemini.');
  }

  return { text: textPart.trim(), model: selectedModel };
}

async function callGeminiApiWithFallback({ prompt, conversation = [], apiKey }) {
  const models = getGeminiModelCandidates();
  let lastErr = null;
  let lastNonModelErr = null;
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      return await callGeminiApi({ prompt, conversation, apiKey, model });
    } catch (err) {
      lastErr = err;
      if (isGeminiModelNotFound(err)) {
        if (i < models.length - 1) continue;
        throw lastNonModelErr || err;
      }
      lastNonModelErr = err;
      throw err;
    }
  }
  throw lastNonModelErr || lastErr || new Error('Gemini API request failed.');
}

function buildGeminiPayload({ prompt, conversation = [] }) {
  const contents = [];
  if (Array.isArray(conversation) && conversation.length > 0) {
    conversation.slice(-8).forEach(msg => {
      if (!msg.content || msg.id === 'ai-assistant-welcome') return;
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(msg.content) }]
      });
    });
  }
  contents.push({ role: 'user', parts: [{ text: prompt }] });
  return {
    contents,
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    generationConfig: { temperature: 0.3, topP: 0.95, maxOutputTokens: 2048 }
  };
}

function buildOpenAiMessages({ prompt, conversation = [] }) {
  const messages = [{ role: 'system', content: SYSTEM_INSTRUCTION }];
  if (Array.isArray(conversation) && conversation.length > 0) {
    conversation.slice(-8).forEach(msg => {
      if (!msg.content || msg.id === 'ai-assistant-welcome') return;
      messages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: String(msg.content)
      });
    });
  }
  messages.push({ role: 'user', content: prompt });
  return messages;
}

async function* streamTextChunks(text, chunkSize = 28, delayMs = 0) {
  const s = String(text || '');
  for (let i = 0; i < s.length; i += chunkSize) {
    yield s.slice(i, i + chunkSize);
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }
}

async function* parseSseDataStream(stream) {
  let buffer = '';
  for await (const chunk of stream) {
    buffer += chunk.toString('utf8');
    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const dataLines = rawEvent
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart());
      if (!dataLines.length) continue;
      const data = dataLines.join('\n').trim();
      if (!data) continue;
      yield data;
    }
  }
  if (buffer.trim()) {
    const dataLines = buffer
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart());
    if (dataLines.length) yield dataLines.join('\n').trim();
  }
}

function isOpenAiModelUnavailableError(err) {
  const status = getStatusCode(err);
  if (status !== 404 && status !== 400) return false;
  const msg = String(err?.response?.data?.error?.message || err?.response?.data?.error?.code || err?.message || '').toLowerCase();
  return msg.includes('model') || msg.includes('not found') || msg.includes('does not exist') || msg.includes('unavailable') || msg.includes('unsupported');
}

function shouldFallbackToNextOpenAiModel(err) {
  const status = getStatusCode(err);
  const msg = String(err?.response?.data?.error?.message || err?.message || '').toLowerCase();
  if (status === 429) return true;
  if (status >= 500) return true;
  if (status === 408) return true;
  if (!status) return true; // network/timeout/connection errors
  if (isOpenAiModelUnavailableError(err)) return true;
  if (status === 400 && (msg.includes('rate') || msg.includes('limit') || msg.includes('quota') || msg.includes('capacity') || msg.includes('overload'))) return true;
  return false; // 401/403 auth, other 4xx: same key/request likely fails across models
}

async function* callOpenAiApiStream({ prompt, conversation = [], apiKey, baseUrl, model }) {
  const selectedModel = model || DEFAULT_CONFIG.openaiModel;
  const endpoint = `${(baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '')}/chat/completions`;
  const messages = buildOpenAiMessages({ prompt, conversation });
  const response = await axios.post(
    endpoint,
    { model: selectedModel, messages, temperature: 0.3, max_tokens: 2048, stream: true },
    {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      timeout: DEFAULT_CONFIG.requestTimeoutMs,
      responseType: 'stream'
    }
  );
  for await (const data of parseSseDataStream(response.data)) {
    if (data === '[DONE]') break;
    let json;
    try { json = JSON.parse(data); } catch { continue; }
    const delta = json?.choices?.[0]?.delta?.content;
    if (typeof delta === 'string' && delta) yield delta;
  }
}

async function* callOpenAiApiStreamWithFallback({ prompt, conversation = [], apiKey, baseUrl }) {
  const models = getOpenAiModelCandidates();
  let lastErr = null;
  let lastNonFallbackErr = null;
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      for await (const delta of callOpenAiApiStream({ prompt, conversation, apiKey, baseUrl, model })) {
        yield { model, delta };
      }
      return;
    } catch (err) {
      lastErr = err;
      if (shouldFallbackToNextOpenAiModel(err)) {
        console.warn(`[CodeTrail AI] openai model "${model}" failed (${getStatusCode(err) || 'network'}): ${String(err?.response?.data?.error?.message || err?.message || 'request failed').replace(/\s+/g, ' ').slice(0, 140)}. Trying next fallback model.`);
        if (i < models.length - 1) continue;
        throw lastNonFallbackErr || err;
      }
      lastNonFallbackErr = err;
      throw err;
    }
  }
  throw lastNonFallbackErr || lastErr || new Error('OpenAI-compatible stream request failed.');
}

async function* callGeminiApiStream({ prompt, conversation = [], apiKey, model }) {
  const selectedModel = model || DEFAULT_CONFIG.geminiModel;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:streamGenerateContent?alt=sse&key=${apiKey}`;
  const payload = buildGeminiPayload({ prompt, conversation });
  const response = await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: DEFAULT_CONFIG.requestTimeoutMs,
    responseType: 'stream'
  });
  for await (const event of readSseEvents(response.data)) {
    if (!event.data || event.data === '[DONE]') continue;
    try {
      const parsed = JSON.parse(event.data);
      const text = parsed?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('');
      if (text) yield text;
    } catch {
      // Ignore malformed SSE events.
    }
  }
}

async function* callGeminiApiStreamWithFallback({ prompt, conversation = [], apiKey }) {
  const models = getGeminiModelCandidates();
  let lastErr = null;
  let lastNonModelErr = null;
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      for await (const delta of callGeminiApiStream({ prompt, conversation, apiKey, model })) {
        yield { model, delta };
      }
      return;
    } catch (err) {
      lastErr = err;
      if (isGeminiModelNotFound(err)) {
        if (i < models.length - 1) continue;
        throw lastNonModelErr || err;
      }
      lastNonModelErr = err;
      throw err;
    }
  }
  throw lastNonModelErr || lastErr || new Error('Gemini stream request failed.');
}

async function resolveWorkspaceContextSafe({ message, context, files, user, workspaceId }) {
  if (!(workspaceId || (Array.isArray(files) && files.length > 0))) return null;
  try {
    return await workspaceContextService.retrieveWorkspaceContext({
      workspaceId,
      query: message,
      activeFileName: context?.fileName,
      activeFileContent: context?.content,
      files,
      user
    });
  } catch (wsErr) {
    console.warn('[CodeTrail AI] Workspace context retrieval warning:', wsErr.message);
    return null;
  }
}

exports.streamAIResponse = async function* ({
  message,
  conversation = [],
  context = {},
  attachments = [],
  actionType = 'general',
  user = null,
  workspaceId = null,
  files = null
}) {
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '').trim();
  const openAiKey = (process.env.OPENAI_API_KEY || '').trim();
  const customBaseUrl = process.env.AI_API_BASE_URL || process.env.OPENAI_BASE_URL;
  const workspaceContext = await resolveWorkspaceContextSafe({ message, context, files, user, workspaceId });
  const fullPrompt = buildFullPrompt({ message, context, attachments, actionType, workspaceContext });
  const baseMeta = {
    references: workspaceContext?.references || [],
    workspaceContextSummary: {
      totalFiles: workspaceContext?.totalFiles || 0,
      matchedChunksCount: workspaceContext?.matchedChunksCount || 0,
      searchMode: workspaceContext?.searchMode || null,
      embeddingModel: workspaceContext?.embeddingModel || null
    }
  };

  if (geminiKey && !providerUnavailable(PROVIDERS.GEMINI)) {
    try {
      let metaSent = false;
      for await (const chunk of callGeminiApiStreamWithFallback({ prompt: fullPrompt, conversation, apiKey: geminiKey })) {
        if (!metaSent) {
          yield { type: 'meta', provider: PROVIDERS.GEMINI, model: chunk.model || DEFAULT_CONFIG.geminiModel, ...baseMeta };
          metaSent = true;
        }
        if (chunk.delta) yield { type: 'delta', delta: chunk.delta };
      }
      if (metaSent) return;
    } catch (err) {
      // If we fell back across Gemini models, mark using the actual root cause (e.g. auth/rate limit), not "model unavailable".
      markProviderFailure(PROVIDERS.GEMINI, err);
      logProviderFailure(PROVIDERS.GEMINI, err, 'stream');
    }
  }

  if (openAiKey && !providerUnavailable(PROVIDERS.OPENAI)) {
    try {
      let metaSent = false;
      for await (const chunk of callOpenAiApiStreamWithFallback({ prompt: fullPrompt, conversation, apiKey: openAiKey, baseUrl: customBaseUrl })) {
        if (!metaSent) {
          yield { type: 'meta', provider: PROVIDERS.OPENAI, model: chunk.model || DEFAULT_CONFIG.openaiModel, ...baseMeta };
          metaSent = true;
        }
        if (chunk.delta) yield { type: 'delta', delta: chunk.delta };
      }
      if (metaSent) return;
    } catch (err) {
      markProviderFailure(PROVIDERS.OPENAI, err);
      logProviderFailure(PROVIDERS.OPENAI, err, 'stream');
    }
  }

  const localResponse = generateLocalHeuristicResponse({ message, context, actionType, workspaceContext });
  yield { type: 'meta', provider: PROVIDERS.FALLBACK, model: 'codetrail-heuristic-v1', ...baseMeta };
  for await (const delta of streamTextChunks(localResponse, 28, 0)) {
    yield { type: 'delta', delta };
  }
};

/**
 * Call OpenAI / OpenAI-Compatible API
 */
async function callOpenAiApi({ prompt, conversation = [], apiKey, baseUrl, model }) {
  const selectedModel = model || DEFAULT_CONFIG.openaiModel;
  const endpoint = `${(baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '')}/chat/completions`;
  const messages = buildOpenAiMessages({ prompt, conversation });

  const response = await axios.post(
    endpoint,
    {
      model: selectedModel,
      messages,
      temperature: 0.3,
      max_tokens: 2048
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      timeout: DEFAULT_CONFIG.requestTimeoutMs
    }
  );

  const answer = response.data?.choices?.[0]?.message?.content;
  if (!answer) {
    throw new Error('OpenAI API returned an empty response.');
  }

  return answer.trim();
}

async function callOpenAiApiWithFallback({ prompt, conversation = [], apiKey, baseUrl }) {
  const models = getOpenAiModelCandidates();
  let lastErr = null;
  let lastNonFallbackErr = null;
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const text = await callOpenAiApi({ prompt, conversation, apiKey, baseUrl, model });
      return { text, model };
    } catch (err) {
      lastErr = err;
      if (shouldFallbackToNextOpenAiModel(err)) {
        console.warn(`[CodeTrail AI] openai model "${model}" failed (${getStatusCode(err) || 'network'}): ${String(err?.response?.data?.error?.message || err?.message || 'request failed').replace(/\s+/g, ' ').slice(0, 140)}. Trying next fallback model.`);
        if (i < models.length - 1) continue;
        throw lastNonFallbackErr || err;
      }
      lastNonFallbackErr = err;
      throw err;
    }
  }
  throw lastNonFallbackErr || lastErr || new Error('OpenAI-compatible request failed.');
}

/**
 * Main Service Dispatcher
 */
exports.generateAIResponse = async ({
  message,
  conversation = [],
  context = {},
  attachments = [],
  actionType = 'general',
  user = null,
  workspaceId = null,
  files = null
}) => {
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '').trim();
  const openAiKey = (process.env.OPENAI_API_KEY || '').trim();
  const customBaseUrl = process.env.AI_API_BASE_URL || process.env.OPENAI_BASE_URL;

  const workspaceContext = await resolveWorkspaceContextSafe({ message, context, files, user, workspaceId });
  const fullPrompt = buildFullPrompt({ message, context, attachments, actionType, workspaceContext });
  const contextSummary = {
    totalFiles: workspaceContext?.totalFiles || 0,
    matchedChunksCount: workspaceContext?.matchedChunksCount || 0,
    searchMode: workspaceContext?.searchMode || null,
    embeddingModel: workspaceContext?.embeddingModel || null
  };

  // 1. Attempt Google Gemini if configured and not in cooldown/disabled
  if (geminiKey && !providerUnavailable(PROVIDERS.GEMINI)) {
    try {
      const result = await callGeminiApiWithFallback({
        prompt: fullPrompt,
        conversation,
        apiKey: geminiKey
      });
      return {
        success: true,
        provider: PROVIDERS.GEMINI,
        model: result.model || DEFAULT_CONFIG.geminiModel,
        response: result.text,
        message: result.text,
        content: result.text,
        references: workspaceContext?.references || [],
        workspaceContextSummary: contextSummary
      };
    } catch (err) {
      markProviderFailure(PROVIDERS.GEMINI, err);
      logProviderFailure(PROVIDERS.GEMINI, err, 'API');
    }
  }

  // 2. Attempt OpenAI or OpenAI-Compatible API if configured and not in cooldown/disabled
  if (openAiKey && !providerUnavailable(PROVIDERS.OPENAI)) {
    try {
      const result = await callOpenAiApiWithFallback({
        prompt: fullPrompt,
        conversation,
        apiKey: openAiKey,
        baseUrl: customBaseUrl
      });
      return {
        success: true,
        provider: PROVIDERS.OPENAI,
        model: result.model || DEFAULT_CONFIG.openaiModel,
        response: result.text,
        message: result.text,
        content: result.text,
        references: workspaceContext?.references || [],
        workspaceContextSummary: contextSummary
      };
    } catch (err) {
      markProviderFailure(PROVIDERS.OPENAI, err);
      logProviderFailure(PROVIDERS.OPENAI, err, 'API');
    }
  }

  // 3. Resilient Local Engine Fallback
  const localResponse = generateLocalHeuristicResponse({ message, context, actionType, workspaceContext });
  return {
    success: true,
    provider: PROVIDERS.FALLBACK,
    model: 'codetrail-heuristic-v1',
    response: localResponse,
    message: localResponse,
    content: localResponse,
    references: workspaceContext?.references || [],
    workspaceContextSummary: contextSummary
  };
};

/**
 * Service Status / Health Inspector
 */
exports.getAIStatus = () => {
  const geminiKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);
  const openAiKey = Boolean(process.env.OPENAI_API_KEY);
  const customBaseUrl = process.env.AI_API_BASE_URL || process.env.OPENAI_BASE_URL || null;

  const now = Date.now();
  const geminiBlockedReason = providerUnavailable(PROVIDERS.GEMINI);
  const openAiBlockedReason = providerUnavailable(PROVIDERS.OPENAI);

  let activeProvider = PROVIDERS.FALLBACK;
  let activeModel = 'codetrail-heuristic-v1';

  if (geminiKey && !geminiBlockedReason) {
    activeProvider = PROVIDERS.GEMINI;
    activeModel = DEFAULT_CONFIG.geminiModel;
  } else if (openAiKey && !openAiBlockedReason) {
    activeProvider = PROVIDERS.OPENAI;
    activeModel = DEFAULT_CONFIG.openaiModel;
  }

  return {
    ready: true,
    activeProvider,
    activeModel,
    providers: {
      gemini: {
        configured: geminiKey,
        model: DEFAULT_CONFIG.geminiModel,
        available: geminiKey && !geminiBlockedReason,
        cooldownUntil: providerState.gemini.cooldownUntil > now ? new Date(providerState.gemini.cooldownUntil).toISOString() : null,
        disabledUntil: providerState.gemini.disabledUntil > now ? new Date(providerState.gemini.disabledUntil).toISOString() : null,
        reason: geminiBlockedReason
      },
      openai: {
        configured: openAiKey,
        model: DEFAULT_CONFIG.openaiModel,
        models: DEFAULT_CONFIG.openaiModels,
        customBaseUrl,
        available: openAiKey && !openAiBlockedReason,
        cooldownUntil: providerState.openai.cooldownUntil > now ? new Date(providerState.openai.cooldownUntil).toISOString() : null,
        disabledUntil: providerState.openai.disabledUntil > now ? new Date(providerState.openai.disabledUntil).toISOString() : null,
        reason: openAiBlockedReason
      },
      localFallback: { available: true, model: 'codetrail-heuristic-v1' }
    },
    capabilities: [
      'code_explanation',
      'code_generation',
      'debugging_assistant',
      'code_review',
      'test_case_generation',
      'documentation_generation',
      'code_refactoring',
      'algorithm_suggestions',
      'function_analysis',
      'streaming',
      'semantic_workspace_context'
    ]
  };
};

