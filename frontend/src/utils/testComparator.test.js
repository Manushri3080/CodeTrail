/**
 * testComparator.test.js
 * Unit Test Suite for CodeTrail Output Comparator & Status Classifier
 * Runs with Node.js native test runner (zero external dependencies).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareValues,
  parseExecutionOutput,
  formatDiff,
  evaluateTestCase,
  DELIMITERS
} from './testComparator.js';

test('compareValues: numbers and floating-point tolerance', () => {
  assert.strictEqual(compareValues(100, 100), true);
  assert.strictEqual(compareValues(-5, -5), true);
  assert.strictEqual(compareValues(0, 0), true);
  assert.strictEqual(compareValues(100, 101), false);

  // Floating point precision tolerance (0.1 + 0.2 === 0.30000000000000004)
  assert.strictEqual(compareValues(0.1 + 0.2, 0.3), true);
  assert.strictEqual(compareValues(3.1415926535, 3.1415926536), true);
  assert.strictEqual(compareValues(3.14, 3.15), false);
});

test('compareValues: type-preservation (no loose type coercion)', () => {
  assert.strictEqual(compareValues(1, true), false, '1 must not equal true');
  assert.strictEqual(compareValues(0, false), false, '0 must not equal false');
  assert.strictEqual(compareValues('100', 100), false, '"100" must not equal 100');
  assert.strictEqual(compareValues('', false), false, '"" must not equal false');
  assert.strictEqual(compareValues(null, 0), false, 'null must not equal 0');
  assert.strictEqual(compareValues(null, ''), false, 'null must not equal ""');
  assert.strictEqual(compareValues(null, null), true, 'null must equal null');
  assert.strictEqual(compareValues(undefined, undefined), true, 'undefined must equal undefined');
  assert.strictEqual(compareValues(null, undefined), true, 'null and undefined are compatible empty results');
});

test('compareValues: strings and newline normalization', () => {
  assert.strictEqual(compareValues('CodeTrail', 'CodeTrail'), true);
  assert.strictEqual(compareValues('hello\r\nworld', 'hello\nworld'), true);
  assert.strictEqual(compareValues('test  ', 'test'), true, 'trailing whitespace normalized');
  assert.strictEqual(compareValues('foo', 'bar'), false);
});

test('compareValues: arrays deep equality', () => {
  assert.strictEqual(compareValues([1, 2, 3], [1, 2, 3]), true);
  assert.strictEqual(compareValues([1, 2], [2, 1]), false, 'Array order must be preserved');
  assert.strictEqual(compareValues([1, [2, 3]], [1, [2, 3]]), true);
  assert.strictEqual(compareValues([1, 2], [1, 2, 3]), false);
});

test('compareValues: objects deep equality', () => {
  assert.strictEqual(compareValues({ a: 1, b: 2 }, { b: 2, a: 1 }), true, 'Key order agnostic');
  assert.strictEqual(compareValues({ a: 1, b: { c: 3 } }, { a: 1, b: { c: 3 } }), true);
  assert.strictEqual(compareValues({ a: 1 }, { a: 2 }), false);
  assert.strictEqual(compareValues({ a: 1 }, { a: 1, b: 2 }), false);
});

test('parseExecutionOutput: extracts delimited output and isolates extraneous console logs', () => {
  const stdout = `
Debug log from user: inside loop
${DELIMITERS.OUTPUT_START}
{"sum": 42}
${DELIMITERS.OUTPUT_END}
Another debug log after return
`;
  const parsed = parseExecutionOutput(stdout);
  assert.strictEqual(parsed.hasOutput, true);
  assert.deepStrictEqual(parsed.parsedOutput, { sum: 42 });
  assert.ok(parsed.consoleLogs.includes('Debug log from user: inside loop'));
  assert.ok(parsed.consoleLogs.includes('Another debug log after return'));
});

test('evaluateTestCase: PASSED when actual matches expected', () => {
  const executionResult = {
    stdout: `${DELIMITERS.OUTPUT_START}\ntrue\n${DELIMITERS.OUTPUT_END}`,
    exitCode: 0,
    executionTimeMs: 12
  };
  const testCase = { expectedOutput: true };
  const evaluated = evaluateTestCase(executionResult, testCase);

  assert.strictEqual(evaluated.status, 'PASSED');
  assert.strictEqual(evaluated.actualOutput, true);
  assert.strictEqual(evaluated.diff, null);
  assert.strictEqual(evaluated.errorDetails, null);
});

test('evaluateTestCase: FAILED when actual mismatches expected', () => {
  const executionResult = {
    stdout: `${DELIMITERS.OUTPUT_START}\nfalse\n${DELIMITERS.OUTPUT_END}`,
    exitCode: 0,
    executionTimeMs: 15
  };
  const testCase = { expectedOutput: true };
  const evaluated = evaluateTestCase(executionResult, testCase);

  assert.strictEqual(evaluated.status, 'FAILED');
  assert.strictEqual(evaluated.actualOutput, false);
  assert.ok(evaluated.diff.includes('Expected: true'));
  assert.ok(evaluated.diff.includes('Actual:   false'));
});

test('evaluateTestCase: ERROR on compilation failure', () => {
  const executionResult = {
    isCompileError: true,
    compileOutput: 'error: expected ; at line 5',
    exitCode: 1
  };
  const testCase = { expectedOutput: 10 };
  const evaluated = evaluateTestCase(executionResult, testCase);

  assert.strictEqual(evaluated.status, 'ERROR');
  assert.strictEqual(evaluated.category, 'Compilation Error');
  assert.ok(evaluated.errorDetails.includes('expected ;'));
});

test('evaluateTestCase: ERROR on execution timeout', () => {
  const executionResult = {
    isTimeout: true,
    exitCode: 124
  };
  const testCase = { expectedOutput: 10 };
  const evaluated = evaluateTestCase(executionResult, testCase);

  assert.strictEqual(evaluated.status, 'ERROR');
  assert.strictEqual(evaluated.category, 'Timeout Error');
});

test('evaluateTestCase: runtime error is NEVER classified as PASSED without explicit exception structure', () => {
  // Test case with category: "invalid" and expectedOutput containing "error"
  // Per mandatory condition: Never classify an exception as PASSED simply because category is invalid or expected output contains "error".
  const executionResult = {
    stdout: `${DELIMITERS.ERROR_START}\n{"message": "Division by zero"}\n${DELIMITERS.ERROR_END}`,
    exitCode: 1
  };
  const testCaseWithoutExplicitContract = {
    category: 'invalid',
    expectedOutput: 'error: division by zero'
  };

  const evaluated = evaluateTestCase(executionResult, testCaseWithoutExplicitContract);
  assert.strictEqual(evaluated.status, 'ERROR', 'Must be classified as ERROR without explicit expectException contract');
});

test('evaluateTestCase: explicit exception structure correctly marks PASSED when matched', () => {
  const executionResult = {
    stdout: `${DELIMITERS.ERROR_START}\n{"message": "Division by zero", "type": "ZeroDivisionError"}\n${DELIMITERS.ERROR_END}`,
    exitCode: 1
  };
  const testCaseWithExplicitException = {
    expectException: true,
    expectedError: { message: 'Division by zero' }
  };

  const evaluated = evaluateTestCase(executionResult, testCaseWithExplicitException);
  assert.strictEqual(evaluated.status, 'PASSED');
  assert.ok(evaluated.actualOutput.includes('[Expected Exception Caught]'));
});
