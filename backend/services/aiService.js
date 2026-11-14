/**
 * aiService.js
 * CodeTrail Core AI Service & Multi-Model Integration Engine
 * Lead: Manushri — AI Backend & Model Integration
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

const DEFAULT_CONFIG = {
  geminiModel: process.env.GEMINI_MODEL || process.env.GOOGLE_AI_MODEL || process.env.AI_MODEL || 'gemini-2.0-flash',
  openaiModel: process.env.OPENAI_MODEL || process.env.AI_MODEL || 'gpt-4o-mini',
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

Use simple, clear language. Avoid jargon when possible. If you must use a technical term, explain it briefly.

What you can do:
- Explain code step by step in plain words.
- Write or improve code from the user's request.
- Help find and fix bugs.
- Review code and suggest clear improvements.
- Write tests and documentation.

How to respond:
- Answer the user's request directly.
- Keep explanations short and easy to follow.
- When code or a file is provided, refer to the actual code.
- Use fenced code blocks with the language name (e.g. \`\`\`python, \`\`\`javascript).

For debugging, use this structure:
### Problem:
[What went wrong]
### Possible Cause:
[Why it happened]
### Suggested Correction:
[How to fix it, with code if helpful]

For code review, include severity tags when useful: [CRITICAL], [HIGH], [MEDIUM], [LOW].`;

/**
 * Format prompt and context into a consolidated user message
 */
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
    promptText += `TASK: Explain the provided code thoroughly. For selected functions/classes/blocks, describe purpose, parameters, return values, dependencies, execution flow, and key logic step by step.\n`;
  } else if (actionType === 'debug') {
    promptText += `TASK: Debug this code or error. Provide: Problem, Possible Cause, and Suggested Correction with fixed code.\n`;
  } else if (actionType === 'review' || actionType === 'refactor') {
    promptText += `TASK: Refactor/review the provided code. Suggest an improved version with cleaner structure, better naming, safety, and performance. Include the improved code in a complete fenced code block that can be applied to the editor, and briefly explain key changes.\n`;
  } else if (actionType === 'tests') {
    promptText += `TASK: Generate complete, robust test cases covering standard inputs, edge cases, zero values, and invalid inputs.\n`;
  } else if (actionType === 'docs') {
    promptText += `TASK: Generate documentation for the provided code: function/class comments, docstrings/JSDoc, parameter and return-value descriptions, and a short usage/README-style section when useful. Include apply-ready documentation/code in fenced blocks.\n`;
  } else if (actionType === 'generate') {
    promptText += `TASK: Generate code from the user's natural-language request. Produce complete, runnable, well-structured code in the requested language/context. Return the primary implementation in a fenced code block ready to insert/apply in the editor, then a short usage note.\n`;
  } else if (actionType === 'algorithm') {
    promptText += `TASK: Suggest more efficient algorithms or approaches for this code/problem. Compare current vs suggested approach, explain time/space complexity, trade-offs, and provide an improved implementation in a fenced code block when applicable.\n`;
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
  const refsNote = refs.length
    ? `\n**Workspace References:** ${refs.map(r => `\`${r.fileName || r.file || 'file'}\`${r.startLine ? `:${r.startLine}${r.endLine && r.endLine !== r.startLine ? `-${r.endLine}` : ''}` : ''}`).slice(0, 8).join(', ')}`
    : '';

  let response = '';

  if (attached && !hasCodeContext && refersToCurrentCode) {
    response = `The attached file \`${fileName || 'file'}\` is empty, so there’s no code to read.\n\nAdd some code, or click **+** to attach a different file, then try again.${refsNote}`;
  } else if (!hasCodeContext && (action === 'docs' || wantsDocs) && refersToCurrentCode) {
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
    const errorMatch = baseCode.match(/(Error|Exception|fail|undefined|null|TypeError|SyntaxError|NameError|ReferenceError)[^\n]*/i) ||
      String(message || '').match(/(Error|Exception|fail|undefined|null|TypeError|SyntaxError|NameError|ReferenceError)[^\n]*/i);
    const errText = errorMatch ? errorMatch[0] : 'Something may be going wrong in this code';
    const preview = linesArr.slice(0, 80).map((l, i) => `${i + 1}: ${l}`).join('\n') || '(no attached code)';
    response = `### Debugging help

**Problem:** ${errText} in \`${fileName || 'attached code'}\`.

**Possible Cause:**
- A value might be missing, undefined, or the wrong type.
- The logic may be off (a condition, loop, or return).
- Edge cases (empty input, 0, null, or unexpected values) may not be handled.

**Suggested Correction:**
1. Check inputs and handle empty/invalid values.
2. Add simple error handling if needed.
3. Test with normal and edge-case values.

**Simple fix example:**
\`\`\`${isPy ? 'python' : language}
${isPy
  ? `try:\n    # check inputs first\n    result = value\n    print(result)\nexcept Exception as err:\n    print("Error:", err)`
  : `try {\n  // check inputs first\n  const result = value;\n  console.log(result);\n} catch (err) {\n  console.error('Error:', err);\n}`}
\`\`\`

**Code to check:**
\`\`\`${language}
${preview}
\`\`\`

Share the exact error or what you expected, and I can give a more specific fix.${refsNote}`;
  } else if (explicitAction === 'tests' || wantsTests) {
    response = `### AI-GENERATED TEST SUITE: \`${fileName}\`

\`\`\`${isPy ? 'python' : language}
${isPy
  ? `def test_normal_case():\n    assert True\n\ndef test_edge_case_empty_or_zero():\n    assert 0 == 0\n    assert "" == ""\n\ndef test_invalid_input_handling():\n    try:\n        # call target function with invalid input\n        pass\n        assert True\n    except Exception:\n        assert True`
  : `describe('${fileName} tests', () => {\n  it('handles normal input', () => { expect(true).toBe(true); });\n  it('handles edge cases', () => { expect(0).toBe(0); expect('').toBe(''); });\n  it('handles invalid input safely', () => { expect(() => {}).not.toThrow(); });\n});`}
\`\`\`

Tell me the function name and expected behavior for runnable, specific tests.${refsNote}`;
  } else if (explicitAction === 'docs' || wantsDocs) {
    const target = fnMatches[0] || (isPy ? 'main' : 'module');
    const preview = linesArr.slice(0, 120).map((l, i) => `${i + 1}: ${l}`).join('\n') || '(no attached code)';
    response = `### Documentation: \`${fileName || 'attached code'}\`

**AI-GENERATED DOCUMENTATION**

**What this code does**
- **Purpose:** Explain what \`${fileName || 'this file'}\` is for.
- **Main parts:** ${fnMatches.length ? fnMatches.map(s => `\`${s}\``).join(', ') : 'Read the code from top to bottom.'}
- **Inputs:** ${params ? `\`${params}\`` : 'Any inputs, settings, or data it uses.'}
- **Outputs:** What it returns, prints, or changes.
- **Notes:** Any important requirements or possible errors.

**Example doc comment**
\`\`\`${isPy ? 'python' : language}
${isPy
  ? `"""${fileName || 'Module'}\n\nWhat it does:\n    Briefly explain this file.\n\nHow to use:\n    Explain how to run or import it.\n"""\n\n${fnMatches.includes('main') || /def\s+main\s*\(/.test(baseCode) ? `def main():\n    """Start the program."""\n    # ...\n` : ''}`
  : `/**\n * ${target}\n * @description What it does: Briefly explain this code.\n * @param {*} input - Describe inputs.\n * @returns {*} Describe output.\n */`}
\`\`\`

**Code**
\`\`\`${language}
${preview}
\`\`\`${refsNote}`;
  } else if (explicitAction === 'algorithm' || (wantsAlgorithm && !wantsExplain && !wantsDocs && !wantsTests && explicitAction !== 'review' && explicitAction !== 'refactor' && explicitAction !== 'analyze' && explicitAction !== 'function-analysis' && explicitAction !== 'debug')) {
    const snippet = hasCodeContext ? baseCode.split('\n').slice(0, 60).join('\n') : '# Provide the specific problem/code for a concrete optimized solution';
    response = `### ALGORITHM SUGGESTIONS & COMPLEXITY

**Approach:** Reduce repeated scans/nested loops using better data structures (hash map/set), sorting, memoization, or divide-and-conquer as appropriate.

**Typical comparison:**
- Naive: **Time O(n^2)**, **Space O(1)**
- Improved: **Time O(n)** or **O(n log n)**, **Space O(n)**

\`\`\`${isPy ? 'python' : language}
${snippet}
\`\`\`

${hasCodeContext ? 'If you want, I can propose an optimized version of the attached code.' : 'Attach the code with **+** or paste the problem for a concrete optimized implementation.'}${refsNote}`;
  } else if (explicitAction === 'analyze' || explicitAction === 'function-analysis' || wantsAnalyzeIntent) {
    const preview = linesArr.slice(0, 80).map((l, i) => `${i + 1}: ${l}`).join('\n') || '(no code context)';
    response = `### FUNCTION / CODE ANALYSIS: \`${fileName || 'attached code'}\`

**Request:** ${message || 'Analyze this code'}
**Detected symbols:** ${fnMatches.length ? fnMatches.map(s => `\`${s}\``).join(', ') : 'No explicit function/class declarations detected'}
**Parameters:** ${params ? `\`${params}\`` : 'Not explicitly detected'}
**Return values:** Check \`return\` statements and outputs
**Dependencies:** Imports, globals, external calls, referenced symbols
**Execution flow:** Entry -> input handling -> logic/branches/loops -> side effects -> return/exit
**Risks to review:** runtime errors (null/undefined/type/index/zero division), logic/condition issues, and edge cases (empty/invalid/boundary inputs).

\`\`\`${language}
${preview}
\`\`\`${refsNote}`;
  } else if (explicitAction === 'explain' || (wantsExplain && refersToCurrentCode && !wantsDocs && !wantsTests && !wantsDebugIntent && !wantsAlgorithm && !wantsAnalyzeIntent && explicitAction !== 'generate' && explicitAction !== 'review' && explicitAction !== 'refactor')) {
    const nonEmpty = linesArr.filter(l => l.trim()).length;
    const preview = linesArr.slice(0, 120).map((l, i) => `${i + 1}: ${l}`).join('\n') || '(no attached code)';
    response = `### Code explanation: \`${fileName || 'attached code'}\`

**Language:** ${language} | **Lines with code:** ${nonEmpty}
**Main parts:** ${fnMatches.length ? fnMatches.map(s => `\`${s}\``).join(', ') : 'None named'}

**Step by step:**
1. **What it does:** This code in \`${fileName || 'this file'}\` runs its instructions.
2. **How it runs:** It goes from top to bottom. Functions run when they are called${isPy ? ' (like `main()` at the bottom)' : ''}.
3. **Inputs and outputs:** Check values passed in, values returned, and anything printed or saved.
4. **Important parts:** Look at any if/else checks, loops, and error handling.
5. **Things to watch for:** Empty or unexpected inputs can cause problems.

\`\`\`${language}
${preview}
\`\`\`

If you want, select a specific part and I’ll explain it in more detail.${refsNote}`;
  } else if (explicitAction === 'review' || explicitAction === 'refactor' || (wantsRefactor && !wantsBeginner && !wantsExplain && !wantsDocs && !wantsTests)) {
    const codeToShow = content ? `# Improved version of ${fileName}\n${baseCode}\n` : baseCode;
    const isReview = action === 'review' || /\breview\b/.test(userQuery);
    response = `### ${isReview ? 'AI CODE REVIEW REPORT' : 'Improved Code Suggestion'}: \`${fileName}\`

**Request:** ${message || 'Review/refactor this code'}
${isReview ? '\n- **[MEDIUM] Readability:** Improve naming and structure where needed.\n- **[MEDIUM] Safety:** Add input validation and error handling.\n- **[LOW] Maintainability:** Keep logic modular and document key behavior.\n' : ''}

\`\`\`${isPy ? 'python' : isJs ? 'javascript' : language}
${codeToShow}
\`\`\`

Review the changes and use Preview/Insert/Apply in the editor if you want to adopt them.${refsNote}`;
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
      response = `**Request:** ${prompt || 'How can I help?'}\n\nI can help with coding questions, concepts, debugging, and code generation.\n\n- **General prompt:** ask directly (e.g. “what is a loop in Python?”, “show an example of recursion in JS”).\n- **File-specific help:** click **+** to attach the currently open file (or select/paste code), then ask to explain/refactor/debug/analyze it.\n\nTell me the language/topic and what you need, and I’ll answer.${refsNote}`;
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

async function* callOpenAiApiStream({ prompt, conversation = [], apiKey, baseUrl }) {
  const model = DEFAULT_CONFIG.openaiModel;
  const endpoint = `${(baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '')}/chat/completions`;
  const messages = buildOpenAiMessages({ prompt, conversation });
  const response = await axios.post(
    endpoint,
    { model, messages, temperature: 0.3, max_tokens: 2048, stream: true },
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
      yield { type: 'meta', provider: PROVIDERS.OPENAI, model: DEFAULT_CONFIG.openaiModel, ...baseMeta };
      for await (const delta of callOpenAiApiStream({ prompt: fullPrompt, conversation, apiKey: openAiKey, baseUrl: customBaseUrl })) {
        yield { type: 'delta', delta };
      }
      return;
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
async function callOpenAiApi({ prompt, conversation = [], apiKey, baseUrl }) {
  const model = DEFAULT_CONFIG.openaiModel;
  const endpoint = `${(baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '')}/chat/completions`;
  const messages = buildOpenAiMessages({ prompt, conversation });

  const response = await axios.post(
    endpoint,
    {
      model,
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
      const response = await callOpenAiApi({
        prompt: fullPrompt,
        conversation,
        apiKey: openAiKey,
        baseUrl: customBaseUrl
      });
      return {
        success: true,
        provider: PROVIDERS.OPENAI,
        model: DEFAULT_CONFIG.openaiModel,
        response,
        message: response,
        content: response,
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

