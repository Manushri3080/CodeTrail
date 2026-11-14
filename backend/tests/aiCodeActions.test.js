/**
 * aiCodeActions.test.js
 * Integration tests for AI code actions (Maryam): explain/generate/refactor/algorithm/docs/analyze
 */
const assert = require('assert');
const aiService = require('../services/aiService');
const aiController = require('../controllers/aiController');

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    chunks: [],
    ended: false,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; },
    write(chunk) { this.chunks.push(chunk); },
    end() { this.ended = true; },
  };
}

function hasCodeBlock(text) {
  return /```[\s\S]*```/.test(String(text || ''));
}

module.exports = (async () => {
  console.log('\n=== CodeTrail AI Code Actions Integration Tests (Maryam) ===\n');
  try {
    console.log('1) Service status includes extended AI action capabilities');
    const status = aiService.getAIStatus();
    assert(status.ready === true);
    assert(status.capabilities.includes('code_generation'));
    assert(status.capabilities.includes('code_refactoring'));
    assert(status.capabilities.includes('algorithm_suggestions'));
    assert(status.capabilities.includes('function_analysis'));
    console.log('  ✔ status/capabilities OK');

    const sampleContext = {
      fileName: 'mathUtils.js',
      language: 'javascript',
      content: 'function sumPairs(arr) {\n  let result = [];\n  for (let i = 0; i < arr.length; i++) {\n    for (let j = i + 1; j < arr.length; j++) {\n      result.push([arr[i], arr[j]]);\n    }\n  }\n  return result;\n}\nmodule.exports = { sumPairs };'
    };

    console.log('2) Code explanation action returns response and preserves references shape');
    const explainRes = createMockRes();
    await aiController.explainCode({ body: { message: 'Explain parameters, return value and execution flow', context: sampleContext, files: [{ name: 'mathUtils.js', content: sampleContext.content, language: 'javascript' }] } }, explainRes);
    assert.strictEqual(explainRes.statusCode, 200);
    assert(explainRes.body && explainRes.body.success === true);
    assert(typeof (explainRes.body.response || explainRes.body.message) === 'string');
    assert(Array.isArray(explainRes.body.references));
    console.log('  ✔ explain endpoint OK');

    console.log('3) Code generation endpoint returns apply-ready code block');
    const genRes = createMockRes();
    await aiController.generateCode({ body: { prompt: 'Generate a function that returns unique values from an array', context: { fileName: 'unique.js', language: 'javascript', content: '' } } }, genRes);
    assert.strictEqual(genRes.statusCode, 200);
    assert(genRes.body.success === true);
    assert(hasCodeBlock(genRes.body.response || ''), 'generation should include fenced code block');
    console.log('  ✔ generate endpoint OK');

    console.log('4) Refactoring endpoint returns improved code suggestion');
    const refactorRes = createMockRes();
    await aiController.refactorCode({ body: { message: 'Refactor for readability and performance', context: sampleContext } }, refactorRes);
    assert.strictEqual(refactorRes.statusCode, 200);
    assert(refactorRes.body.success === true);
    assert(hasCodeBlock(refactorRes.body.response || ''), 'refactor should include code block');
    console.log('  ✔ refactor endpoint OK');

    console.log('5) Algorithm suggestion endpoint returns complexity/approach guidance');
    const algoRes = createMockRes();
    await aiController.suggestAlgorithm({ body: { message: 'Suggest a better algorithm and explain time/space complexity', context: sampleContext } }, algoRes);
    assert.strictEqual(algoRes.statusCode, 200);
    assert(algoRes.body.success === true);
    const algoText = String(algoRes.body.response || '').toLowerCase();
    assert(algoText.includes('complexity') || algoText.includes('algorithm') || algoText.includes('o(') || algoText.includes('time'));
    console.log('  ✔ algorithm endpoint OK');

    console.log('6) Function analysis endpoint explains params/returns/dependencies/flow');
    const analyzeRes = createMockRes();
    await aiController.analyzeFunction({ body: { message: 'Analyze parameters, return values, dependencies and execution flow', context: sampleContext } }, analyzeRes);
    assert.strictEqual(analyzeRes.statusCode, 200);
    assert(analyzeRes.body.success === true);
    const analyzeText = String(analyzeRes.body.response || '').toLowerCase();
    assert(analyzeText.includes('parameter'));
    assert(analyzeText.includes('return'));
    assert(analyzeText.includes('execution'));
    console.log('  ✔ analyze endpoint OK');

    console.log('7) Documentation endpoint returns docs/comments content');
    const docsRes = createMockRes();
    await aiController.generateDocs({ body: { message: 'Generate docs and docstring', context: sampleContext } }, docsRes);
    assert.strictEqual(docsRes.statusCode, 200);
    assert(docsRes.body.success === true);
    assert(typeof docsRes.body.response === 'string' && docsRes.body.response.length > 20);
    console.log('  ✔ docs endpoint OK');

    console.log('8) Chat endpoint routes actionType=refactor with workspace context');
    const chatRes = createMockRes();
    await aiController.chat({
      body: {
        message: 'Refactor this module for clarity',
        actionType: 'refactor',
        workspaceId: 'ws-local-test',
        files: [{ name: 'mathUtils.js', path: 'mathUtils.js', content: sampleContext.content, language: 'javascript' }],
        context: sampleContext,
        conversation: [{ id: 'u1', role: 'user', content: 'previous message' }]
      }
    }, chatRes);
    assert.strictEqual(chatRes.statusCode, 200);
    assert(chatRes.body.success === true);
    assert(hasCodeBlock(chatRes.body.response || ''));
    assert(Array.isArray(chatRes.body.references));
    console.log('  ✔ chat action routing OK');

    console.log('9) Stream endpoint emits SSE events for action responses');
    const streamRes = createMockRes();
    await aiController.chatStream({ body: { message: 'Generate a helper function and explain usage', actionType: 'generate', context: { fileName: 'helper.js', language: 'javascript', content: '' } } }, streamRes);
    assert.strictEqual(streamRes.headers['content-type'], 'text/event-stream');
    assert(streamRes.ended === true);
    const streamData = streamRes.chunks.join('');
    assert(streamData.includes('"type":"start"'));
    assert(streamData.includes('"type":"chunk"'));
    assert(streamData.includes('"type":"done"'));
    console.log('  ✔ stream endpoint OK');

    console.log('\n=== ALL AI CODE ACTIONS INTEGRATION TESTS PASSED ===\n');
  } catch (err) {
    console.error('AI code actions integration tests failed:', err);
    throw err;
  }
})();
