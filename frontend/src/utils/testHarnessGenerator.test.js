/**
 * testHarnessGenerator.test.js
 * Unit Test Suite for CodeTrail Language Harness Generator & Function Extractor
 * Runs with Node.js native test runner (zero external dependencies).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateTestHarness,
  stripSimpleTypeScriptTypes
} from './testHarnessGenerator.js';
import {
  extractFunctions,
  resolveTargetFunction
} from './testFunctionExtractor.js';
import { DELIMITERS } from './testComparator.js';

test('testHarnessGenerator: JavaScript harness synthesis', () => {
  const code = 'function isEven(num) {\n  return num % 2 === 0;\n}';
  const res = generateTestHarness({
    code,
    functionName: 'isEven',
    language: 'javascript',
    inputs: [4]
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.filename, 'main.js');
  assert.ok(res.code.includes(code), 'Original code must be preserved intact');
  assert.ok(res.code.includes('isEven(...__args)'));
  assert.ok(res.code.includes(DELIMITERS.OUTPUT_START));
  assert.ok(res.code.includes(DELIMITERS.OUTPUT_END));
});

test('testHarnessGenerator: TypeScript type stripping & harness', () => {
  const tsCode = 'function add(a: number, b: number): number {\n  return a + b;\n}';
  const stripped = stripSimpleTypeScriptTypes(tsCode);

  assert.ok(!stripped.includes(': number'), 'Type annotations must be removed');
  assert.ok(stripped.includes('function add(a, b)'));

  const res = generateTestHarness({
    code: tsCode,
    functionName: 'add',
    language: 'typescript',
    inputs: [10, 20]
  });

  assert.strictEqual(res.success, true);
  assert.ok(res.code.includes(DELIMITERS.OUTPUT_START));
});

test('testHarnessGenerator: Python harness synthesis', () => {
  const pyCode = 'def isEven(num):\n    return num % 2 == 0';
  const res = generateTestHarness({
    code: pyCode,
    functionName: 'isEven',
    language: 'python',
    inputs: [5]
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.filename, 'main.py');
  assert.ok(res.code.includes('import json, sys'));
  assert.ok(res.code.includes('isEven(*__args)'));
  assert.ok(res.code.includes(DELIMITERS.OUTPUT_START));
});

test('testHarnessGenerator: C++ harness and existing main rejection', () => {
  const cppSnippet = 'bool isEven(int num) {\n  return num % 2 == 0;\n}';
  const res = generateTestHarness({
    code: cppSnippet,
    functionName: 'isEven',
    language: 'cpp',
    inputs: [4]
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.filename, 'main.cpp');
  assert.ok(res.code.includes('int main()'));

  // Should cleanly reject when main() is already present
  const cppWithMain = '#include <iostream>\nint main() { return 0; }';
  const rejected = generateTestHarness({
    code: cppWithMain,
    functionName: 'main',
    language: 'cpp',
    inputs: []
  });
  assert.strictEqual(rejected.success, false);
  assert.ok(rejected.error.includes('already defines a main()'));
});

test('testHarnessGenerator: Java clean unsupported notification', () => {
  const javaCode = 'public class Solution {\n  public static int add(int a, int b) {\n    return a + b;\n  }\n}';
  const res = generateTestHarness({
    code: javaCode,
    functionName: 'add',
    language: 'java',
    inputs: [10, 20]
  });

  assert.strictEqual(res.success, false);
  assert.ok(res.error.includes('Java is not currently supported'));
});

test('testFunctionExtractor: discovers Python function signatures', () => {
  const pyCode = `
import math

def isEven(num):
    return num % 2 == 0

def calculateFactorial(n):
    if n <= 1:
        return 1
    return n * calculateFactorial(n - 1)
`;
  const funcs = extractFunctions(pyCode, 'python');
  assert.strictEqual(funcs.length, 2);
  assert.strictEqual(funcs[0].name, 'isEven');
  assert.deepStrictEqual(funcs[0].parameters, ['num']);
  assert.strictEqual(funcs[1].name, 'calculateFactorial');
  assert.deepStrictEqual(funcs[1].parameters, ['n']);
});

test('testFunctionExtractor: discovers JavaScript function signatures', () => {
  const jsCode = `
function calculateTotal(price, taxRate = 0.05) {
  return price + (price * taxRate);
}

const isEligible = (age, status) => {
  return age >= 18;
};
`;
  const funcs = extractFunctions(jsCode, 'javascript');
  assert.strictEqual(funcs.length, 2);
  assert.strictEqual(funcs[0].name, 'calculateTotal');
  assert.deepStrictEqual(funcs[0].parameters, ['price', 'taxRate']);
  assert.strictEqual(funcs[1].name, 'isEligible');
  assert.deepStrictEqual(funcs[1].parameters, ['age', 'status']);
});

test('testFunctionExtractor: resolveTargetFunction handles single, multiple, and zero functions', () => {
  const singleFunc = 'def greet(name):\n    return "Hello " + name';
  const resSingle = resolveTargetFunction({ selectedCode: singleFunc, language: 'python' });
  assert.strictEqual(resSingle.status, 'single');
  assert.strictEqual(resSingle.targetFunction.name, 'greet');

  const multiFunc = 'def a(): pass\ndef b(): pass';
  const resMulti = resolveTargetFunction({ selectedCode: multiFunc, language: 'python' });
  assert.strictEqual(resMulti.status, 'multiple');
  assert.strictEqual(resMulti.functions.length, 2);

  const noFunc = 'x = 10\ny = 20\nprint(x + y)';
  const resNone = resolveTargetFunction({ selectedCode: '', fullFileContent: noFunc, language: 'python' });
  assert.strictEqual(resNone.status, 'none');
  assert.ok(resNone.message.includes('No function definitions found'));
});
