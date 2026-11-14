/**
 * AI Assistant Preview/Apply & Workspace-Context Integration Checks
 * Verifies: diff preview + confirm-apply contract wiring, apply modes, and
 * editor/workspace-context round trips through AI endpoints/stream.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const aiService = require('../services/aiService');
const aiController = require('../controllers/aiController');

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    chunks: [],
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    setHeader(k, v) { this.headers[k] = v; },
    write(chunk) { this.chunks.push(String(chunk)); },
    end() { this.ended = true; }
  };
}

async function main() {
  console.log('\n=== AI PREVIEW/APPLY & CONTEXT INTEGRATION CHECKS ===\n');

  console.log('1) AssistantPanel diff preview + confirm-apply UI contract');
  const panelPath = path.join(__dirname, '../../frontend/src/components/workspace/AssistantPanel.jsx');
  const panel = fs.readFileSync(panelPath, 'utf8');
  const required = [
    ['DiffEditor import', /from "@monaco-editor\/react"/],
    ['DiffEditor usage', /<DiffEditor/],
    ['onApplyCode prop', /onApplyCode/],
    ['previewState', /previewState/],
    ['open preview before apply', /openPreview\(code/],
    ['confirm apply handler', /const confirmApply = \(mode\)/],
    ['insert mode confirm', /confirmApply\("insert"\)/],
    ['replaceSelection mode confirm', /confirmApply\("replaceSelection"\)/],
    ['replaceFile mode confirm', /confirmApply\("replaceFile"\)/],
    ['compare/apply modal label', /Compare & Apply AI Changes/],
    ['cancel preview', /onClick={closePreview}/],
    ['no direct editor mutation from Insert button', /title="Preview and apply code changes"/],
  ];
  for (const [name, re] of required) assert(re.test(panel), `Missing: ${name}`);
  console.log('  ? preview modal + explicit confirm apply modes wired');

  console.log('2) ModularWorkspace editor apply integration contract');
  const wsPath = path.join(__dirname, '../../frontend/src/modules/workspace/ModularWorkspace.jsx');
  const ws = fs.readFileSync(wsPath, 'utf8');
  assert(/handleApplyAssistantCode/.test(ws), 'Missing apply handler');
  assert(/mode === "replaceFile"/.test(ws), 'Missing replaceFile mode');
  assert(/mode === "replaceSelection"/.test(ws), 'Missing replaceSelection mode');
  assert(/executeEdits\("ai-assistant-apply"/.test(ws), 'Missing Monaco apply edits');
  assert(/onApplyCode=\{handleApplyAssistantCode\}/.test(ws), 'Missing onApplyCode prop wiring');
  assert(/onInsertCode=\{handleInsertAssistantCode\}/.test(ws), 'Missing onInsertCode prop wiring');
  console.log('  ? insert/replaceSelection/replaceFile apply modes wired to Monaco');

  console.log('3) Workspace-context round trip via chat action (editor -> backend -> response)');
  const files = [{ name: 'utils.js', path: 'src/utils.js', language: 'javascript', content: 'export function sum(a,b){ return a+b; }\nexport function mul(a,b){ return a*b; }' }];
  const chatRes = createMockRes();
  await aiController.chat({ body: { message: 'Explain sum and suggest a refactor', actionType: 'refactor', files, context: { fileName: 'utils.js', language: 'javascript', content: files[0].content, attached: true, source: 'utils.js' } } }, chatRes);
  assert.strictEqual(chatRes.statusCode, 200);
  assert(chatRes.body && chatRes.body.success === true, 'chat should succeed');
  assert(typeof (chatRes.body.response || chatRes.body.message) === 'string' && (chatRes.body.response || chatRes.body.message).length > 0, 'chat should return response');
  assert(Array.isArray(chatRes.body.references), 'chat should include references array');
  console.log('  ? chat action round trip OK with attached/workspace context');

  console.log('4) Workspace-context round trip via explain endpoint');
  const explainRes = createMockRes();
  await aiController.explainCode({ body: { message: 'Explain this code', files, context: { fileName: 'utils.js', language: 'javascript', content: files[0].content, attached: true } } }, explainRes);
  assert.strictEqual(explainRes.statusCode, 200);
  assert(explainRes.body.success === true);
  assert(typeof explainRes.body.response === 'string' && explainRes.body.response.length > 0);
  console.log('  ? explain round trip OK');

  console.log('5) Streaming SSE round trip (editor action stream)');
  const streamRes = createMockRes();
  await aiController.chatStream({ body: { message: 'Generate docs for this file', actionType: 'docs', files, context: { fileName: 'utils.js', language: 'javascript', content: files[0].content, attached: true } }, headers: {} }, streamRes);
  const joined = streamRes.chunks.join('');
  assert(/"type"\s*:\s*"start"/.test(joined), 'missing start event');
  assert(/"type"\s*:\s*"(chunk|meta|done|error)"/.test(joined), 'missing stream content events');
  assert(/"type"\s*:\s*"done"/.test(joined), 'missing done event');
  console.log('  ? SSE stream round trip OK');

  console.log('6) AI service config/status (env-loaded provider model)');
  const status = aiService.getAIStatus();
  assert(status && typeof status === 'object');
  assert(status.providers && status.providers.gemini, 'missing gemini provider status');
  assert(typeof status.activeProvider === 'string' && typeof status.activeModel === 'string');
  console.log(`  ? status: provider=${status.activeProvider} model=${status.activeModel} geminiConfigured=${status.providers.gemini.configured}`);

  console.log('\n=== PREVIEW/APPLY & CONTEXT INTEGRATION CHECKS PASSED ===\n');
}

main().catch((err) => { console.error(err); process.exit(1); });
