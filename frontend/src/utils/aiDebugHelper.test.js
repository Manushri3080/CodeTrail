/**
 * aiDebugHelper.test.js
 * Unit Test Suite for AI Debugging Interface Helpers (Rishika)
 * Tests multi-language trace line extraction, error classification,
 * diff metrics calculation, performance analysis parsing, and test failure formatting.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractErrorLineFromText,
  parseErrorTypeFromText,
  extractCodeBlock,
  calculateDiffStats,
  parsePerformanceReview,
  formatTestFailureContext,
  validateCodePreservation,
  extractOptimizationSections
} from './aiDebugHelper.js';

test('extractErrorLineFromText: extracts line numbers across multiple language traces', () => {
  // Python
  const pyTrace = `Traceback (most recent call last):
  File "main.py", line 42, in <module>
    print(1 / 0)
ZeroDivisionError: division by zero`;
  assert.strictEqual(extractErrorLineFromText(pyTrace), 42);

  const pySyntax = `  File "solution.py", line 15
    def solve(
             ^
SyntaxError: unexpected EOF while parsing`;
  assert.strictEqual(extractErrorLineFromText(pySyntax), 15);

  // JavaScript / Node.js
  const jsTrace = `ReferenceError: total is not defined
    at calculateSum (/app/workspace/math.js:28:15)
    at Object.<anonymous> (/app/workspace/index.js:5:1)`;
  assert.strictEqual(extractErrorLineFromText(jsTrace), 28);

  // C++
  const cppTrace = `solution.cpp:19:5: error: expected ';' before 'return'`;
  assert.strictEqual(extractErrorLineFromText(cppTrace), 19);

  // Java
  const javaTrace = `Exception in thread "main" java.lang.NullPointerException
    at com.codetrail.Main.process(Main.java:64)
    at com.codetrail.Main.main(Main.java:10)`;
  assert.strictEqual(extractErrorLineFromText(javaTrace), 64);

  // Rust
  const rustTrace = `error[E0384]: cannot assign twice to immutable variable
  --> src/main.rs:7:5
   |
 7 |     x = 20;`;
  assert.strictEqual(extractErrorLineFromText(rustTrace), 7);

  // Go
  const goTrace = `./main.go:14:2: undefined: fmt.Printl`;
  assert.strictEqual(extractErrorLineFromText(goTrace), 14);

  // Graceful fallback for traces with no line number
  assert.strictEqual(extractErrorLineFromText('General system failure'), null);
  assert.strictEqual(extractErrorLineFromText(''), null);
  assert.strictEqual(extractErrorLineFromText(null), null);
});

test('parseErrorTypeFromText: identifies correct error category', () => {
  assert.strictEqual(parseErrorTypeFromText('ZeroDivisionError: division by zero'), 'ZeroDivisionError');
  assert.strictEqual(parseErrorTypeFromText('TypeError: Cannot read properties of undefined'), 'TypeError');
  assert.strictEqual(parseErrorTypeFromText('NameError: name "foo" is not defined'), 'NameError');
  assert.strictEqual(parseErrorTypeFromText('SyntaxError: expected ":" on line 5'), 'SyntaxError');
  assert.strictEqual(parseErrorTypeFromText('IndexError: list index out of range'), 'IndexError');
  assert.strictEqual(parseErrorTypeFromText('Execution timed out after 10000ms'), 'TimeoutError');
  assert.strictEqual(parseErrorTypeFromText('java.lang.NullPointerException'), 'NullPointerException');
  assert.strictEqual(parseErrorTypeFromText('fatal error: iostream: No such file'), 'CompilationError');
  assert.strictEqual(parseErrorTypeFromText('unknown error message', 'CustomFallback'), 'CustomFallback');
});

test('extractCodeBlock: extracts fenced code from markdown cleanly', () => {
  const md = `### Suggested Fix:
Here is the corrected code:
\`\`\`python
def add(a, b):
    return a + b
\`\`\`
Hope this helps!`;
  const code = extractCodeBlock(md);
  assert.strictEqual(code, 'def add(a, b):\n    return a + b');

  assert.strictEqual(extractCodeBlock('No code block here'), null);
  assert.strictEqual(extractCodeBlock(''), null);
});

test('calculateDiffStats: calculates additions and deletions between versions', () => {
  const original = `function solve(arr) {
  let sum = 0;
  for (let i = 0; i <= arr.length; i++) {
    sum += arr[i];
  }
  return sum;
}`;

  const fix = `function solve(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
  return sum;
}`;

  const stats = calculateDiffStats(original, fix);
  assert.strictEqual(stats.hasDifferences, true);
  assert.strictEqual(stats.linesAdded >= 1, true);
  assert.strictEqual(stats.linesRemoved >= 1, true);

  // Equal strings have 0 diff
  const identicalStats = calculateDiffStats(original, original);
  assert.strictEqual(identicalStats.hasDifferences, false);
  assert.strictEqual(identicalStats.linesAdded, 0);
  assert.strictEqual(identicalStats.linesRemoved, 0);
});

test('parsePerformanceReview: identifies complexities, inefficient loops, and severity', () => {
  const reviewText = `### AI CODE REVIEW REPORT
[HIGH] Algorithmic Complexity: The current approach runs in O(n^2) time due to nested loops.
- Inefficient loops: The inner loop performs a repeated scan over the array.
- Redundant operations: Recomputing values instead of using a hash map lookup table with memoization.
Suggested optimized implementation running in O(n) time:

\`\`\`javascript
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) return [map.get(complement), i];
    map.set(nums[i], i);
  }
  return [];
}
\`\`\``;

  const parsed = parsePerformanceReview(reviewText);
  assert.strictEqual(parsed.severity, 'HIGH');
  assert.strictEqual(parsed.hasInefficientLoop, true);
  assert.strictEqual(parsed.hasRedundantOps, true);
  assert.strictEqual(parsed.hasCachingOpportunity, true);
  assert.strictEqual(parsed.complexities.includes('O(n^2)'), true);
  assert.strictEqual(parsed.complexities.includes('O(n)'), true);
  assert.strictEqual(typeof parsed.suggestedCode, 'string');
  assert.strictEqual(parsed.suggestedCode.includes('function twoSum'), true);
});

test('formatTestFailureContext: generates prompt and comparison strings for failed test cases', () => {
  const testCase = {
    input: [2, 3],
    expectedOutput: 5,
    actualOutput: 6,
    description: 'Sum of 2 and 3'
  };

  const context = formatTestFailureContext({
    testCase,
    targetFunction: { name: 'add' },
    sourceCode: 'def add(a, b):\n    return a * b',
    language: 'python'
  });

  assert.strictEqual(context.functionName, 'add');
  assert.strictEqual(context.expectedFormatted, '5');
  assert.strictEqual(context.actualFormatted, '6');
  assert.strictEqual(context.prompt.includes('function "add"'), true);
  assert.strictEqual(context.prompt.includes('Expected Output: 5'), true);
  assert.strictEqual(context.prompt.includes('Actual Output: 6'), true);
});

test('validateCodePreservation: detects preserved functions and flags generic algorithm replacements', () => {
  const originalUserCode = `// User's custom solution
function findUserPairs(nums, target) {
  let count = 0;
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) count++;
    }
  }
  return count;
}

function helperLog(msg) {
  console.log('[LOG]:', msg);
}`;

  // 1. Preserved surgical optimization
  const preservedCode = `// User's custom solution
function findUserPairs(nums, target) {
  let count = 0;
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) count += seen.get(complement);
    seen.set(nums[i], (seen.get(nums[i]) || 0) + 1);
  }
  return count;
}

function helperLog(msg) {
  console.log('[LOG]:', msg);
}`;

  const validResult = validateCodePreservation(originalUserCode, preservedCode);
  assert.strictEqual(validResult.isPreserved, true);
  assert.strictEqual(validResult.hasPreservedSignatures, true);
  assert.strictEqual(validResult.preservedSymbols.includes('findUserPairs'), true);
  assert.strictEqual(validResult.preservedSymbols.includes('helperLog'), true);

  // 2. Generic replacement rewriting entire file into textbook twoSum
  const genericReplacement = `// Standalone textbook TwoSum
function twoSum(nums, target) {
  return [0, 1];
}`;

  const invalidResult = validateCodePreservation(originalUserCode, genericReplacement);
  assert.strictEqual(invalidResult.isPreserved, false);
  assert.strictEqual(invalidResult.missingSymbols.includes('findUserPairs'), true);
  assert.strictEqual(invalidResult.missingSymbols.includes('helperLog'), true);
});

test('extractOptimizationSections: extracts bottleneck, complexities, and surgical sections', () => {
  const markdown = `### AI CODE REVIEW REPORT: \`solution.js\`
- **Severity:** [HIGH]
- **Complexity:** Current: O(n^2) -> Suggested: O(n)
- **Bottleneck:** Inefficient nested loop detected performing repeated array scans.

### Problematic Section
\`\`\`javascript
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] === nums[j]) return true;
    }
  }
\`\`\`

### Optimized Replacement
\`\`\`javascript
  const seen = new Set();
  for (let i = 0; i < nums.length; i++) {
    if (seen.has(nums[i])) return true;
    seen.add(nums[i]);
  }
\`\`\`

### Complete Preserved Code
\`\`\`javascript
function checkDuplicates(nums) {
  const seen = new Set();
  for (let i = 0; i < nums.length; i++) {
    if (seen.has(nums[i])) return true;
    seen.add(nums[i]);
  }
  return false;
}
\`\`\``;

  const original = `function checkDuplicates(nums) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] === nums[j]) return true;
    }
  }
  return false;
}`;

  const extracted = extractOptimizationSections(markdown, original);
  assert.strictEqual(extracted.currentComplexity, 'O(n^2)');
  assert.strictEqual(extracted.suggestedComplexity, 'O(n)');
  assert.strictEqual(extracted.bottleneck.includes('nested loop'), true);
  assert.strictEqual(typeof extracted.problematicSection, 'string');
  assert.strictEqual(typeof extracted.optimizedReplacement, 'string');
  assert.strictEqual(extracted.fullPreservedCode.includes('checkDuplicates'), true);
  assert.strictEqual(extracted.validation.isPreserved, true);
});

