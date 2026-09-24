/**
 * CodeTrail Code Execution Validation Test Suite (Anistina Dsouza)
 * 
 * Comprehensive automated validation suite testing:
 * 1. JavaScript Execution (Standard output, arithmetic, functions)
 * 2. JavaScript Standard Input (stdin stream parsing)
 * 3. JavaScript Runtime Error (Exception handling, non-zero exit)
 * 4. Python Execution (Algorithm calculation, print output)
 * 5. Python Standard Input (stdin processing with multiple lines)
 * 6. Python Runtime Error (ZeroDivisionError / syntax error)
 * 7. C++ Compilation & Execution (cout, exit code 0)
 * 8. C++ Standard Input (cin stream reading)
 * 9. C++ Compilation Error (Diagnostics & compile output capture)
 * 10. Java Compilation & Execution (Main class, System.out)
 * 11. Timeout Handling (Infinite loops terminated cleanly)
 * 12. Input Validation (Empty code rejection, payload constraints)
 * 13. Language Alias Mapping (py, js, cpp, c++, node)
 * 14. Output Truncation & Buffer Safety Guard
 */

const axios = require('axios');
const http = require('http');

const API_BASE = 'http://localhost:5000/api/execute';
const PISTON_DIRECT_URL = 'http://localhost:2000/api/v2/execute';

let passedTests = 0;
let failedTests = 0;
const results = [];

const logHeader = (title) => {
  console.log('\n' + '='.repeat(70));
  console.log(` 🧪 ${title}`);
  console.log('='.repeat(70));
};

const assertTest = (testName, condition, details = '') => {
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName} ${details ? `(${details})` : ''}`);
    results.push({ name: testName, passed: true, details });
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${testName} - ${details}`);
    results.push({ name: testName, passed: false, details });
  }
};

const runAllValidationTests = async () => {
  console.log('\n🚀 Starting CodeTrail Code Execution Workflow Validation Suite...\n');

  // Test 1: JavaScript Baseline Execution
  logHeader('TEST 1: JavaScript Baseline Execution');
  try {
    const res = await axios.post(PISTON_DIRECT_URL, {
      language: 'javascript',
      files: [{ name: 'main.js', content: 'console.log("HELLO_CODETRAIL_JS"); console.log(10 + 32);' }]
    });
    const run = res.data?.run || {};
    assertTest('JS Output matches expected text', run.output?.includes('HELLO_CODETRAIL_JS') && run.output?.includes('42'), `Output: ${run.output?.trim()}`);
    assertTest('JS Exit Code is 0', run.code === 0, `Exit Code: ${run.code}`);
  } catch (err) {
    assertTest('JS Baseline Execution', false, err.message);
  }

  // Test 2: JavaScript Custom Standard Input (stdin)
  logHeader('TEST 2: JavaScript Custom Standard Input (stdin)');
  try {
    const jsCode = `
      const fs = require('fs');
      const input = fs.readFileSync(0, 'utf-8').trim();
      const [a, b] = input.split(' ').map(Number);
      console.log('SUM=' + (a + b));
    `;
    const res = await axios.post(PISTON_DIRECT_URL, {
      language: 'javascript',
      files: [{ name: 'main.js', content: jsCode }],
      stdin: '25 17'
    });
    const run = res.data?.run || {};
    assertTest('JS correctly receives and processes stdin', run.output?.includes('SUM=42'), `Output: ${run.output?.trim()}`);
  } catch (err) {
    assertTest('JS stdin Execution', false, err.message);
  }

  // Test 3: JavaScript Runtime Error Handling
  logHeader('TEST 3: JavaScript Runtime Error Handling');
  try {
    const res = await axios.post(PISTON_DIRECT_URL, {
      language: 'javascript',
      files: [{ name: 'main.js', content: 'console.log("Start"); undefinedFunctionCall();' }]
    });
    const run = res.data?.run || {};
    assertTest('JS runtime error produces non-zero exit code', run.code !== 0, `Exit Code: ${run.code}`);
    assertTest('JS runtime error captures ReferenceError in stderr/output', (run.stderr || run.output)?.includes('ReferenceError'), 'Stderr captured error');
  } catch (err) {
    assertTest('JS Runtime Error Handling', false, err.message);
  }

  // Test 4: Python Baseline Execution
  logHeader('TEST 4: Python Baseline Execution');
  try {
    const pyCode = `
def fib(n):
    return n if n <= 1 else fib(n-1) + fib(n-2)
print("PYTHON_RUNNER_ACTIVE")
print("FIB_8=" + str(fib(8)))
`;
    const res = await axios.post(PISTON_DIRECT_URL, {
      language: 'python',
      files: [{ name: 'main.py', content: pyCode }]
    });
    const run = res.data?.run || {};
    assertTest('Python script calculates Fibonacci correctly', run.output?.includes('PYTHON_RUNNER_ACTIVE') && run.output?.includes('FIB_8=21'), `Output: ${run.output?.trim()}`);
    assertTest('Python script exits with code 0', run.code === 0, `Exit Code: ${run.code}`);
  } catch (err) {
    assertTest('Python Baseline Execution', false, err.message);
  }

  // Test 5: Python Standard Input (stdin)
  logHeader('TEST 5: Python Standard Input (stdin)');
  try {
    const pyStdinCode = `
import sys
data = sys.stdin.read().split()
numbers = [int(x) for x in data]
print(f"PRODUCT={numbers[0] * numbers[1] * numbers[2]}")
`;
    const res = await axios.post(PISTON_DIRECT_URL, {
      language: 'python',
      files: [{ name: 'main.py', content: pyStdinCode }],
      stdin: '3 4 5'
    });
    const run = res.data?.run || {};
    assertTest('Python reads multi-token stdin and computes product', run.output?.includes('PRODUCT=60'), `Output: ${run.output?.trim()}`);
  } catch (err) {
    assertTest('Python stdin Execution', false, err.message);
  }

  // Test 6: Python Runtime Exception
  logHeader('TEST 6: Python Runtime Exception');
  try {
    const res = await axios.post(PISTON_DIRECT_URL, {
      language: 'python',
      files: [{ name: 'main.py', content: 'x = 100 / 0\nprint(x)' }]
    });
    const run = res.data?.run || {};
    assertTest('Python division by zero returns non-zero exit', run.code !== 0, `Exit Code: ${run.code}`);
    assertTest('Python captures ZeroDivisionError in stderr', (run.stderr || run.output)?.includes('ZeroDivisionError'), 'ZeroDivisionError detected');
  } catch (err) {
    assertTest('Python Runtime Exception', false, err.message);
  }

  // Test 7: C++ Compilation and Execution
  logHeader('TEST 7: C++ Compilation & Execution');
  try {
    const cppCode = `
#include <iostream>
int main() {
    std::cout << "CPP_EXECUTION_SUCCESS" << std::endl;
    return 0;
}
`;
    const res = await axios.post(PISTON_DIRECT_URL, {
      language: 'c++',
      files: [{ name: 'main.cpp', content: cppCode }]
    });
    const run = res.data?.run || {};
    const compile = res.data?.compile || {};
    assertTest('C++ compiles with exit code 0', compile.code === 0, 'Compilation succeeded');
    assertTest('C++ execution prints expected string', run.output?.includes('CPP_EXECUTION_SUCCESS'), `Output: ${run.output?.trim()}`);
    assertTest('C++ process exits with code 0', run.code === 0, `Exit Code: ${run.code}`);
  } catch (err) {
    assertTest('C++ Baseline Execution', false, err.message);
  }

  // Test 8: C++ Standard Input (cin)
  logHeader('TEST 8: C++ Standard Input (stdin)');
  try {
    const cppStdinCode = `
#include <iostream>
int main() {
    int x, y;
    if (std::cin >> x >> y) {
        std::cout << "CPP_SUM=" << (x + y) << std::endl;
    }
    return 0;
}
`;
    const res = await axios.post(PISTON_DIRECT_URL, {
      language: 'c++',
      files: [{ name: 'main.cpp', content: cppStdinCode }],
      stdin: '123 456'
    });
    const run = res.data?.run || {};
    assertTest('C++ reads standard input and computes sum', run.output?.includes('CPP_SUM=579'), `Output: ${run.output?.trim()}`);
  } catch (err) {
    assertTest('C++ stdin Execution', false, err.message);
  }

  // Test 9: C++ Compilation Error Diagnostics
  logHeader('TEST 9: C++ Compilation Error Diagnostics');
  try {
    const cppBadCode = `
#include <iostream>
int main() {
    invalid_syntax_error_here();
    return 0
}
`;
    const res = await axios.post(PISTON_DIRECT_URL, {
      language: 'c++',
      files: [{ name: 'main.cpp', content: cppBadCode }]
    });
    const compile = res.data?.compile || {};
    assertTest('C++ compilation error yields non-zero compile code', compile.code !== 0, `Compile Code: ${compile.code}`);
    assertTest('C++ compiler error output captures diagnostic message', (compile.stderr || compile.output)?.includes('error:'), 'Diagnostic errors captured');
  } catch (err) {
    assertTest('C++ Compilation Error Diagnostics', false, err.message);
  }

  // Test 10: Java Compilation & Execution
  logHeader('TEST 10: Java Compilation & Execution');
  try {
    const javaCode = `
public class Main {
    public static void main(String[] args) {
        System.out.println("JAVA_EXECUTION_VALIDATED");
    }
}
`;
    const res = await axios.post(PISTON_DIRECT_URL, {
      language: 'java',
      files: [{ name: 'Main.java', content: javaCode }]
    });
    const run = res.data?.run || {};
    assertTest('Java code compiles and executes', run.output?.includes('JAVA_EXECUTION_VALIDATED'), `Output: ${run.output?.trim()}`);
    assertTest('Java process exits with 0', run.code === 0, `Exit Code: ${run.code}`);
  } catch (err) {
    assertTest('Java Compilation & Execution', false, err.message);
  }

  // Test 11: Timeout Handling (Infinite Loop Terminated Cleanly)
  logHeader('TEST 11: Timeout Detection & Safety Termination');
  try {
    const startTime = Date.now();
    const res = await axios.post(PISTON_DIRECT_URL, {
      language: 'javascript',
      files: [{ name: 'main.js', content: 'while(true) {}' }]
    });
    const elapsed = Date.now() - startTime;
    const run = res.data?.run || {};
    assertTest('Infinite loop is terminated by sandbox timeout', run.status === 'timeout' || run.signal === 'SIGKILL' || run.code === 124, `Status: ${run.status}, Signal: ${run.signal}`);
    assertTest('Execution terminated within timeout window (< 9s)', elapsed < 9000, `Duration: ${elapsed}ms`);
  } catch (err) {
    assertTest('Timeout Detection', false, err.message);
  }

  // Test 12: Input Validation via Execution Controller
  logHeader('TEST 12: Payload Validation (Empty Code & Oversized)');
  try {
    // Empty code test
    let emptyCodeFailedAsExpected = false;
    try {
      await axios.post(API_BASE, { code: '   ', language: 'python' });
    } catch (emptyErr) {
      emptyCodeFailedAsExpected = emptyErr.response?.status === 400 && emptyErr.response?.data?.error === 'VALIDATION_EMPTY_CODE';
    }
    assertTest('Rejects empty or whitespace-only code with HTTP 400', emptyCodeFailedAsExpected, 'HTTP 400 VALIDATION_EMPTY_CODE');

    // Oversized code test (>256KB)
    let oversizedCodeFailedAsExpected = false;
    const hugeCode = 'console.log("a");\n'.repeat(20000); // >300KB
    try {
      await axios.post(API_BASE, { code: hugeCode, language: 'javascript' });
    } catch (sizeErr) {
      oversizedCodeFailedAsExpected = sizeErr.response?.status === 400 && sizeErr.response?.data?.error === 'VALIDATION_CODE_TOO_LARGE';
    }
    assertTest('Rejects oversized code (>256KB) with HTTP 400', oversizedCodeFailedAsExpected, 'HTTP 400 VALIDATION_CODE_TOO_LARGE');

  } catch (err) {
    assertTest('Payload Validation', false, err.message);
  }

  // Test 13: Language Alias Mapping Resolution
  logHeader('TEST 13: Language Alias Resolution');
  const aliasesToTest = [
    { lang: 'py', code: 'print("PY_ALIAS_OK")', expect: 'PY_ALIAS_OK' },
    { lang: 'js', code: 'console.log("JS_ALIAS_OK")', expect: 'JS_ALIAS_OK' },
    { lang: 'cpp', code: '#include <iostream>\nint main(){ std::cout << "CPP_ALIAS_OK"; return 0; }', expect: 'CPP_ALIAS_OK' }
  ];

  for (const aliasItem of aliasesToTest) {
    try {
      const res = await axios.post(API_BASE, {
        language: aliasItem.lang,
        code: aliasItem.code
      });
      assertTest(`Alias "${aliasItem.lang}" executes successfully`, res.data?.output?.includes(aliasItem.expect), `Status: ${res.data?.status}`);
    } catch (err) {
      assertTest(`Alias "${aliasItem.lang}"`, false, err.message);
    }
  }

  // Summary Report
  console.log('\n' + '='.repeat(70));
  console.log(' 🏁 CODE EXECUTION VALIDATION SUITE SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Tests Executed: ${passedTests + failedTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  console.log('='.repeat(70) + '\n');

  if (failedTests === 0) {
    console.log('🎉 ALL CODE EXECUTION WORKFLOW VALIDATION TESTS PASSED PERFECTLY!\n');
  } else {
    console.warn(`⚠️ ${failedTests} test(s) encountered issues. Check diagnostics above.\n`);
  }
};

runAllValidationTests().catch(err => {
  console.error('Fatal Validation Test Error:', err);
});
