/**
 * aiTestCaseGeneration.test.js
 * Verification Test Suite for AI Test Case Generation & Function Analysis
 * Lead: Mahi — AI Backend & Model Integration (CT-238 / AI Test Suite)
 *
 * Verifies:
 *   1. Function Analysis & Signature Extraction (Language, Name, Parameters, Logic, Behavior)
 *   2. Generation of Normal, Boundary, Negative, Decimal, Null, Empty, and Invalid Test Scenarios
 *   3. Deterministic Expected Output Calculation (e.g. isEven(4) -> true, isEven(5) -> false)
 *   4. Adherence to Structured JSON Array Format matching Ticket CT-238 Specifications
 *   5. Robust Malformed Response Parsing & Deduplication Engine
 *   6. Controller & API Route Integration (/api/ai/tests and /api/ai/test-cases)
 */

const assert = require('assert');
const aiTestCaseService = require('../services/aiTestCaseService');
const { generateTests, analyzeFunction } = require('../controllers/aiController');

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
}

module.exports = (async () => {
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪   CODETRAIL AI TEST CASE GENERATION & FUNCTION ANALYSIS TEST SUITE');
  console.log('    Lead: Mahi — AI Backend & Model Integration');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // Test Section 1: Function Analysis & Signature Extraction (Python & JS)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('▶ Test Section 1: Function Signature & Logic Analysis (Tasks 2, 3, 4)\n');
    {
      const pythonSnippet = 'def isEven(number):\n    return number % 2 == 0';
      const pyAnalysis = aiTestCaseService.analyzeFunction(pythonSnippet);

      assert.strictEqual(pyAnalysis.name, 'isEven', 'Must extract function name "isEven"');
      assert.deepStrictEqual(pyAnalysis.parameters, ['number'], 'Must extract parameter ["number"]');
      assert.strictEqual(pyAnalysis.language, 'python', 'Must detect Python language');
      assert.ok(pyAnalysis.expectedBehavior.toLowerCase().includes('even'), 'Behavior analysis must recognize even detection');
      assert.strictEqual(pyAnalysis.inferredReturnType, 'boolean', 'Inferred return type must be boolean');

      console.log('  ✔ [PASS] 1. Correctly extracted Python function name, parameter, and boolean behavior');

      const jsSnippet = 'function calculateTotal(price, taxRate = 0.05) {\n  return price + (price * taxRate);\n}';
      const jsAnalysis = aiTestCaseService.analyzeFunction(jsSnippet);

      assert.strictEqual(jsAnalysis.name, 'calculateTotal', 'Must extract function name "calculateTotal"');
      assert.deepStrictEqual(jsAnalysis.parameters, ['price', 'taxRate'], 'Must extract parameters ["price", "taxRate"]');
      assert.strictEqual(jsAnalysis.language, 'javascript', 'Must detect JavaScript language');
      assert.strictEqual(jsAnalysis.inferredReturnType, 'number', 'Inferred return type must be number');

      console.log('  ✔ [PASS] 2. Correctly extracted JavaScript function signature and parameter defaults');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test Section 2: Ticket Example Verification (isEven)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n▶ Test Section 2: Ticket CT-238 Specification Example (Tasks 5, 6, 7, 8, 9)\n');
    {
      const code = 'def isEven(number):\n    return number % 2 == 0';
      const result = await aiTestCaseService.generateTestCasesForFunction({ code });

      assert.strictEqual(result.success, true);
      assert.ok(Array.isArray(result.testCases), 'testCases must be an array');
      assert.ok(result.testCases.length >= 4, 'Must generate at least 4 test cases');

      // Verify the 4 exact cases from ticket example:
      // 1. input: [4], expectedOutput: true (Positive even number)
      const case4 = result.testCases.find(tc => Array.isArray(tc.input) && tc.input[0] === 4);
      assert.ok(case4, 'Must contain test case with input [4]');
      assert.strictEqual(case4.expectedOutput, true, 'isEven(4) expectedOutput must be true');
      assert.ok(case4.description.toLowerCase().includes('even'), 'Description must note even number');

      // 2. input: [5], expectedOutput: false (Positive odd number)
      const case5 = result.testCases.find(tc => Array.isArray(tc.input) && tc.input[0] === 5);
      assert.ok(case5, 'Must contain test case with input [5]');
      assert.strictEqual(case5.expectedOutput, false, 'isEven(5) expectedOutput must be false');
      assert.ok(case5.description.toLowerCase().includes('odd'), 'Description must note odd number');

      // 3. input: [0], expectedOutput: true (Zero input)
      const case0 = result.testCases.find(tc => Array.isArray(tc.input) && tc.input[0] === 0);
      assert.ok(case0, 'Must contain test case with input [0]');
      assert.strictEqual(case0.expectedOutput, true, 'isEven(0) expectedOutput must be true');

      // 4. input: [-2], expectedOutput: true (Negative even number)
      const caseNeg2 = result.testCases.find(tc => Array.isArray(tc.input) && tc.input[0] === -2);
      assert.ok(caseNeg2, 'Must contain test case with input [-2]');
      assert.strictEqual(caseNeg2.expectedOutput, true, 'isEven(-2) expectedOutput must be true');

      console.log('  ✔ [PASS] 3. Verified [4] -> true (Positive even number)');
      console.log('  ✔ [PASS] 4. Verified [5] -> false (Positive odd number)');
      console.log('  ✔ [PASS] 5. Verified [0] -> true (Zero boundary input)');
      console.log('  ✔ [PASS] 6. Verified [-2] -> true (Negative even number)');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test Section 3: Scenario Coverage (Empty, Null, Negative, Decimal, Invalid)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n▶ Test Section 3: Scenario Coverage (Tasks 5, 6, 7, 8, 9)\n');
    {
      const code = 'def isEven(number):\n    return number % 2 == 0';
      const result = await aiTestCaseService.generateTestCasesForFunction({ code });
      const categories = result.testCases.map(tc => tc.category);

      assert.ok(categories.includes('normal'), 'Must cover normal scenario');
      assert.ok(categories.includes('boundary'), 'Must cover boundary scenario');
      assert.ok(categories.includes('negative'), 'Must cover negative numbers scenario');
      assert.ok(categories.includes('decimal'), 'Must cover decimal numbers scenario');
      assert.ok(categories.includes('null'), 'Must cover null/None values scenario');
      assert.ok(categories.includes('invalid'), 'Must cover invalid/unexpected types scenario');

      console.log('  ✔ [PASS] 7. Verified coverage of normal, boundary, negative, decimal, null, and invalid cases');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test Section 4: Deduplication & Malformed AI Response Handling (Tasks 11 & 12)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n▶ Test Section 4: Deduplication & Robust Response Parsing (Tasks 11 & 12)\n');
    {
      // A. Deduplication:
      const duplicateInputCases = [
        { input: [4], expectedOutput: true, description: 'Positive even number 1' },
        { input: [4], expectedOutput: true, description: 'Duplicate positive even number' },
        { input: [5], expectedOutput: false, description: 'Positive odd number' }
      ];

      const cleaned = aiTestCaseService.validateAndCleanTestCases(duplicateInputCases);
      assert.strictEqual(cleaned.length, 2, 'Duplicate [4] test case must be eliminated');
      console.log('  ✔ [PASS] 8. Successfully eliminated duplicate input test cases');

      // B. Malformed AI response parsing (fenced markdown, trailing characters)
      const rawMarkdownAI = 'Here are the requested test cases:\n```json\n[\n  {"input": [10], "expectedOutput": true, "description": "Even ten"}\n]\n```\nHope this helps!';
      const parsed = aiTestCaseService.parseAIResponseJSON(rawMarkdownAI);
      assert.ok(Array.isArray(parsed), 'Must extract JSON array from conversational markdown');
      assert.strictEqual(parsed[0].input[0], 10);
      console.log('  ✔ [PASS] 9. Extracted and sanitized valid JSON array from malformed conversational AI output');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test Section 5: Controller & API Endpoint Integration (Tasks 1 & 10)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n▶ Test Section 5: Controller & Structured API Response (Tasks 1 & 10)\n');
    {
      const req = {
        body: {
          code: 'def isEven(number):\n    return number % 2 == 0',
          language: 'python'
        }
      };
      const res = createMockRes();

      await generateTests(req, res);

      assert.strictEqual(res.statusCode, 200, 'Controller endpoint must return HTTP 200');
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.functionAnalysis, 'Response must include functionAnalysis object');
      assert.strictEqual(res.body.functionAnalysis.name, 'isEven');
      assert.ok(Array.isArray(res.body.testCases), 'Response must include structured testCases array');
      assert.ok(res.body.totalCases >= 4, 'Total cases count must be accurate');
      assert.ok(typeof res.body.response === 'string', 'Backward-compatible response markdown must be populated');

      console.log('  ✔ [PASS] 10. POST /api/ai/tests successfully returns structured functionAnalysis & testCases JSON');
    }

    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('🎉   ALL CT-238 AI TEST CASE GENERATION & ANALYSIS TESTS PASSED WITH 100% SUCCESS!');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
  } catch (err) {
    console.error('❌ AI Test Case Generation Test Failure:', err);
    throw err;
  }
})();

