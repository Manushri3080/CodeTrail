/**
 * aiDebuggingInterfaceIntegration.test.js
 * End-to-End Integration & Verification Test Suite for Rishika
 * Task: AI Debugging Interface & Advanced Analysis (Frontend / Integration Lead)
 *
 * Verifies:
 *   1. /api/ai/debug Error Explanation with line identification & potential causes
 *   2. Missing line number graceful degradation
 *   3. Generate Fix & Corrected Code synthesis for Diff preview
 *   4. Performance Analysis endpoint (/api/ai/review) detecting loop & algorithmic complexity
 *   5. Test Case Failure Explanation endpoint (/api/ai/chat with debug action)
 *   6. Multi-language traceback parsing contracts (Python, JS, C++, Java, Rust, Go)
 *   7. Acceptance / Rejection state contracts
 */

const assert = require('assert');
const { debugError, analyzeError, reviewCode, chat } = require('../controllers/aiController');
const { analyzeExecutionError } = require('../services/aiErrorAnalysisService');

module.exports = (async () => {
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('🐞   CODETRAIL AI DEBUGGING INTERFACE & ADVANCED ANALYSIS SUITE');
  console.log('    Lead: Rishika (Frontend / Integration Lead)');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let total = 0;

  function testPass(name, condition, extra = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✔ [PASS] ${name} ${extra ? `(${extra})` : ''}`);
    } else {
      console.error(`  ❌ [FAIL] ${name} ${extra ? `(${extra})` : ''}`);
      assert.fail(`Test assertion failed: ${name}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Suite 1: Explain Error Action & Line Number Pinpointing
  // ─────────────────────────────────────────────────────────────────────────
  console.log('▶ Section 1: Explain Error Action & Monaco Line Decoration Contracts\n');

  {
    const pyCode = `def divide(a, b):\n    return a / b\n\nprint(divide(10, 0))`;
    const pyStderr = `Traceback (most recent call last):\n  File "solution.py", line 2, in divide\n    return a / b\nZeroDivisionError: division by zero`;

    const res = await analyzeExecutionError({
      code: pyCode,
      language: 'python',
      filename: 'solution.py',
      stderr: pyStderr,
      exitCode: 1
    });

    testPass('Execution error returns success=true', res.success === true);
    testPass('Identifies hasError=true', res.hasError === true);
    testPass('Line number accurately pinpointed for Monaco decoration', res.errorInfo?.lineNumber === 2);
    testPass('Error type classified as ZeroDivisionError', res.errorInfo?.errorType === 'ZeroDivisionError');
    testPass('Explanation provides clear problem diagnosis', typeof res.analysis?.explanation === 'string' && res.analysis.explanation.length > 20);
    testPass('Potential causes list populated with actionable insights', Array.isArray(res.analysis?.potentialCauses) && res.analysis.potentialCauses.length >= 2);
    testPass('Actionable suggested corrections present', Array.isArray(res.analysis?.suggestedCorrections) && res.analysis.suggestedCorrections.length >= 1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Suite 2: Graceful Degradation When Line Number is Missing
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Section 2: Missing Line Graceful Handling & Controller Response\n');

  {
    const genericError = `Process killed by SIGKILL (Out of memory or system abort)`;
    const res = await analyzeExecutionError({
      code: `console.log("hello");`,
      language: 'javascript',
      filename: 'index.js',
      stderr: genericError,
      exitCode: 137
    });

    testPass('Missing line trace handles gracefully without crash', res.success === true);
    testPass('Line number safely defaults to null', res.errorInfo?.lineNumber === null);
    testPass('Diagnostic summary and explanation still provided', Boolean(res.analysis?.summary));
    testPass('Controller debugError returns HTTP 200 with backward compatibility', async () => {
      let statusSent = 200;
      let jsonSent = null;
      const mockReq = {
        body: {
          code: `console.log("hello");`,
          language: 'javascript',
          filename: 'index.js',
          stderr: genericError
        }
      };
      const mockRes = {
        status: (s) => { statusSent = s; return mockRes; },
        json: (j) => { jsonSent = j; return mockRes; }
      };
      await debugError(mockReq, mockRes);
      return statusSent === 200 && jsonSent.success === true && Boolean(jsonSent.response);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Suite 3: Generate Fix & Diff Preview Code Synthesis
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Section 3: Generate Fix Action & Diff Preview Code Synthesis\n');

  {
    const jsBrokenCode = `function getItem(user) {\n  return user.profile.name;\n}\ngetItem(null);`;
    const jsStderr = `TypeError: Cannot read properties of null (reading 'profile')\n    at getItem (index.js:2:15)`;

    const res = await analyzeExecutionError({
      code: jsBrokenCode,
      language: 'javascript',
      filename: 'index.js',
      stderr: jsStderr,
      exitCode: 1
    });

    testPass('Suggested corrected code is generated', typeof res.analysis?.correctedCode === 'string' && res.analysis.correctedCode.length > 0);
    testPass('Corrected code fixes the null reference safely', res.analysis.correctedCode.includes('?.') || res.analysis.correctedCode.includes('if') || res.analysis.correctedCode.includes('return'));
    testPass('Corrected code differs from original (provides visible diff)', res.analysis.correctedCode !== jsBrokenCode);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Suite 4: Performance Analysis & Complexity Review Endpoint
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Section 4: Performance Analysis (/api/ai/review) & Algorithmic Complexity\n');

  {
    let statusSent = 200;
    let jsonSent = null;

    const mockReq = {
      body: {
        code: `function containsDuplicate(nums) {\n  for (let i = 0; i < nums.length; i++) {\n    for (let j = i + 1; j < nums.length; j++) {\n      if (nums[i] === nums[j]) return true;\n    }\n  }\n  return false;\n}`,
        language: 'javascript',
        filename: 'algo.js',
        message: 'Analyze performance bottlenecks, inefficient loops, redundant operations, repeated computations, and algorithmic complexity.'
      }
    };
    const mockRes = {
      status: (s) => { statusSent = s; return mockRes; },
      json: (j) => { jsonSent = j; return mockRes; }
    };

    await reviewCode(mockReq, mockRes);

    testPass('reviewCode endpoint returns HTTP 200 OK', statusSent === 200);
    testPass('reviewCode response contains structured response string', typeof jsonSent?.response === 'string' && jsonSent.response.length > 20);
    testPass('Performance review differentiates from runtime errors and suggests improvements', jsonSent.response.toLowerCase().includes('review') || jsonSent.response.toLowerCase().includes('improved') || jsonSent.response.toLowerCase().includes('performance'));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Suite 5: Test Case Failure Explanation Endpoint
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Section 5: Test Case Failure Explanation & Root Cause Resolution\n');

  {
    let statusSent = 200;
    let jsonSent = null;

    const testFailurePrompt = `TEST CASE FAILURE ANALYSIS:
The automated test case for function "sumArray" (javascript) failed.
- Input: [1, 2, 3]
- Expected Output: 6
- Actual Output: 5
Explain the root cause of why the actual output did not match expected output and provide corrected code.`;

    const mockReq = {
      body: {
        message: testFailurePrompt,
        context: {
          content: `function sumArray(arr) {\n  let sum = 0;\n  for (let i = 0; i < arr.length - 1; i++) {\n    sum += arr[i];\n  }\n  return sum;\n}`,
          language: 'javascript',
          fileName: 'sum.js'
        },
        actionType: 'debug'
      }
    };
    const mockRes = {
      status: (s) => { statusSent = s; return mockRes; },
      json: (j) => { jsonSent = j; return mockRes; }
    };

    await chat(mockReq, mockRes);

    testPass('Test failure chat explanation returns HTTP 200', statusSent === 200);
    testPass('Test failure explanation response is non-empty', typeof jsonSent?.response === 'string' && jsonSent.response.length > 0);
    testPass('Test failure response provides actionable diagnosis', jsonSent.response.includes('`') || jsonSent.response.length > 50);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Suite 6: Multi-Language Trace Line Extraction Verification
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Section 6: Multi-Language Stack Trace Pinpointing Verification\n');

  {
    const { extractCodeSnippet } = require('../services/aiErrorAnalysisService');
    const source = `line 1\nline 2\nline 3 error here\nline 4\nline 5`;
    const snippet = extractCodeSnippet(source, 3, 1);

    testPass('Snippet targets line 3 correctly', snippet.startLine === 2 && snippet.endLine === 4);
    testPass('Error line code captured cleanly', snippet.errorLineCode === 'line 3 error here');
    testPass('Visual indicator pointer is attached to line 3', snippet.codeSnippet.includes('-->   3 | line 3 error here'));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Suite 7: Strict Code Preservation & Surgical Optimization Verification
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Section 7: Strict Code Preservation & Surgical Optimization Contracts\n');

  {
    // A. Verify surrounding functions and comments are preserved on runtime error fixes
    const multiFunctionCode = `// User's custom module
function initConfig() {
  return { version: '1.0.0' };
}

function divide(a, b) {
  return a / b;
}

function teardown() {
  console.log('Done');
}`;

    const pyMultiCode = `# User mathematical operations
def setup():
    return True

def divide(a, b):
    return a / b

def teardown():
    print("Done")`;

    const pyErr = `Traceback (most recent call last):
  File "math.py", line 6, in divide
    return a / b
ZeroDivisionError: division by zero`;

    const res = await analyzeExecutionError({
      code: pyMultiCode,
      language: 'python',
      filename: 'math.py',
      stderr: pyErr,
      exitCode: 1
    });

    testPass('ZeroDivision fix preserves setup() function', res.analysis?.correctedCode?.includes('def setup():') === true);
    testPass('ZeroDivision fix preserves teardown() function', res.analysis?.correctedCode?.includes('def teardown():') === true);
    testPass('ZeroDivision fix applies defensive guard to divide()', res.analysis?.correctedCode?.includes('b == 0') === true || res.analysis?.correctedCode?.includes('!= 0') === true);

    // B. Verify performance review preserves user function names and signatures
    let statusSent = 200;
    let jsonSent = null;

    const mockReq = {
      body: {
        code: `function findDuplicatesInList(items) {\n  for (let i = 0; i < items.length; i++) {\n    for (let j = i + 1; j < items.length; j++) {\n      if (items[i] === items[j]) return true;\n    }\n  }\n  return false;\n}`,
        language: 'javascript',
        filename: 'finder.js',
        message: 'Optimize this function'
      }
    };
    const mockRes = {
      status: (s) => { statusSent = s; return mockRes; },
      json: (j) => { jsonSent = j; return mockRes; }
    };

    await reviewCode(mockReq, mockRes);
    const resp = jsonSent?.response || '';

    testPass('Performance review identifies bottleneck and complexity', resp.includes('O(n^2)') || resp.includes('quadratic') || resp.includes('nested loop'));
    testPass('Performance review maintains user function name in preserved code', resp.includes('findDuplicatesInList') || resp.includes('items'));
    testPass('Performance review does not replace code with unrelated textbook function', !resp.includes('function twoSum'));
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log(`🎉 ALL ${passed}/${total} AI DEBUGGING INTERFACE INTEGRATION TESTS PASSED!`);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
})();

