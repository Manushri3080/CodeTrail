/**
 * aiErrorAnalysis.test.js
 * CodeTrail Error Analysis & AI Integration Unit Test Suite
 * Author: Anistina Dsouza (Lead - Execution & QA / Error Analysis Lead)
 *
 * Comprehensive automated test suite covering:
 *   - Section 1: Execution Error Retrieval (Response Object & Database Execution Lookups)
 *   - Section 2: Multi-Language Stack Trace & Diagnostic Extraction (Python, JS, C++, Java, Rust, Go)
 *   - Section 3: Line Number, Column & Source Code Context Windowing
 *   - Section 4: AI Debugging Prompt Construction (System Persona & User Context Templates)
 *   - Section 5: Compilation Error Analysis (Syntax, Missing Semicolons, Undeclared Identifiers)
 *   - Section 6: Runtime Error Analysis (ZeroDivision, Null/Undefined, IndexError, Timeout/SIGKILL)
 *   - Section 7: Potential Root Causes & Developer-Friendly Explanations
 *   - Section 8: Corrected Code Snippet Synthesis & Formatting
 *   - Section 9: Edge Cases, Incomplete Traces, Unsupported Languages & API Resilience
 *   - Section 10: Controller API Endpoint Simulation (200 OK, 400 Bad Request, Contract Schema)
 */

const assert = require('assert');
const {
  LANGUAGE_ALIASES,
  normalizeLanguage,
  extractCodeSnippet,
  parsePythonError,
  parseJavaScriptError,
  parseCppError,
  parseJavaError,
  parseRustError,
  parseGoError,
  parseGenericError,
  extractErrorInfo,
  buildErrorAnalysisPrompts,
  generateHeuristicErrorAnalysis,
  analyzeExecutionError
} = require('../services/aiErrorAnalysisService');
const { analyzeError, debugError } = require('../controllers/aiController');

console.log('\n═══════════════════════════════════════════════════════════════════════════');
console.log('🔍   CODETRAIL AI ERROR ANALYSIS & DEBUGGING TEST SUITE');
console.log('    Lead: Anistina Dsouza (Execution & QA / Error Analysis Lead)');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

let totalTests = 0;
let passedTests = 0;

function assertPass(label, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✔ [PASS] ${label} ${details ? `(${details})` : ''}`);
  } else {
    console.error(`  ❌ [FAIL] ${label} ${details ? `(${details})` : ''}`);
    assert.fail(`Test Assertion Failed: ${label}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: Execution Error Retrieval & Normalization (Tasks 1 & 2)
// ─────────────────────────────────────────────────────────────────────────────
console.log('▶ Test Section 1: Execution Error Retrieval & Language Normalization\n');

{
  // 1.1 Language normalization for various aliases
  assertPass('Normalize "py" to python', normalizeLanguage('py') === 'python');
  assertPass('Normalize "js" to javascript', normalizeLanguage('js') === 'javascript');
  assertPass('Normalize "c++" to cpp', normalizeLanguage('c++') === 'cpp');
  assertPass('Normalize "rs" to rust', normalizeLanguage('rs') === 'rust');
  assertPass('Normalize "golang" to go', normalizeLanguage('golang') === 'go');

  // 1.2 Extension-based language resolution
  assertPass('Detect language from filename "script.py"', normalizeLanguage('', 'script.py') === 'python');
  assertPass('Detect language from filename "Main.java"', normalizeLanguage('', 'Main.java') === 'java');

  // 1.3 Code-heuristic language detection
  assertPass('Detect Python from def signature', normalizeLanguage('', '', 'def solve(n):\n    return n * 2') === 'python');
  assertPass('Detect C++ from include directive', normalizeLanguage('', '', '#include <iostream>\nint main() {}') === 'cpp');

  // 1.4 Direct retrieval from execution response payload
  const mockExecution = {
    status: 'error',
    language: 'python',
    filename: 'math_demo.py',
    code: 'a = 10\nb = 0\nprint(a / b)',
    stderr: 'Traceback (most recent call last):\n  File "math_demo.py", line 3, in <module>\n    print(a / b)\nZeroDivisionError: division by zero',
    exitCode: 1
  };

  const retrieved = extractErrorInfo({ executionResponse: mockExecution });
  assertPass('Retrieved language matches executionResponse', retrieved.programmingLanguage === 'python');
  assertPass('Retrieved exitCode preserved', retrieved.exitCode === 1);
  assertPass('Retrieved source code preserved', retrieved.sourceCode.includes('print(a / b)'));
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: Multi-Language Stack Trace & Diagnostic Parsing (Task 3)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 2: Multi-Language Stack Trace & Diagnostic Extraction\n');

{
  // 2.1 Python ZeroDivisionError
  const pyStderr = `Traceback (most recent call last):
  File "calculator.py", line 12, in compute_average
    return total / count
ZeroDivisionError: division by zero`;

  const pyParsed = parsePythonError(pyStderr);
  assertPass('Python errorType extracted as ZeroDivisionError', pyParsed.errorType === 'ZeroDivisionError');
  assertPass('Python errorMessage extracted cleanly', pyParsed.errorMessage === 'division by zero');
  assertPass('Python lineNumber extracted accurately (line 12)', pyParsed.lineNumber === 12);
  assertPass('Python stackTrace contains stack frame', pyParsed.stackTrace.length === 1 && pyParsed.stackTrace[0].functionName === 'compute_average');
  assertPass('Python ZeroDivision classified as runtime error', !pyParsed.isCompilationError);

  // 2.2 JavaScript TypeError
  const jsStderr = `/workspace/server.js:45
const user = response.data.user.profile;
                                ^
TypeError: Cannot read properties of undefined (reading 'profile')
    at handleRequest (/workspace/server.js:45:33)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)`;

  const jsParsed = parseJavaScriptError(jsStderr);
  assertPass('JavaScript errorType extracted as TypeError', jsParsed.errorType === 'TypeError');
  assertPass('JavaScript errorMessage extracted without file paths', jsParsed.errorMessage.includes('Cannot read properties of undefined'));
  assertPass('JavaScript lineNumber extracted (line 45)', jsParsed.lineNumber === 45);
  assertPass('JavaScript stack frames parsed', jsParsed.stackTrace.length >= 1);

  // 2.3 C++ GCC Diagnostic
  const cppStderr = `main.cpp:8:5: error: 'cout' was not declared in this scope; did you mean 'std::cout'?
    8 |     cout << "Hello" << endl;
      |     ^~~~
      |     std::cout`;

  const cppParsed = parseCppError(cppStderr);
  assertPass('C++ errorType classified as CompilationError', cppParsed.errorType === 'CompilationError');
  assertPass('C++ errorMessage captured correctly', cppParsed.errorMessage.includes('was not declared in this scope'));
  assertPass('C++ lineNumber identified as 8', cppParsed.lineNumber === 8);
  assertPass('C++ columnNumber identified as 5', cppParsed.columnNumber === 5);

  // 2.4 Java NullPointerException
  const javaStderr = `Exception in thread "main" java.lang.NullPointerException: Cannot invoke "String.length()" because "name" is null
    at UserManager.validate(UserManager.java:18)
    at Main.main(Main.java:6)`;

  const javaParsed = parseJavaError(javaStderr);
  assertPass('Java runtime errorType identified as NullPointerException', javaParsed.errorType === 'NullPointerException');
  assertPass('Java lineNumber extracted as 18', javaParsed.lineNumber === 18);
  assertPass('Java stackTrace contains calling frames', javaParsed.stackTrace.length === 2);

  // 2.5 Rust rustc Diagnostic
  const rustStderr = `error[E0425]: cannot find value \`counter\` in this scope
 --> src/main.rs:14:5
   |
14 |     counter += 1;
   |     ^^^^^^^ not found in this scope`;

  const rustParsed = parseRustError(rustStderr);
  assertPass('Rust diagnostic captured error message', rustParsed.errorMessage.includes('cannot find value `counter`'));
  assertPass('Rust lineNumber parsed from arrow pointer as 14', rustParsed.lineNumber === 14);
  assertPass('Rust columnNumber parsed as 5', rustParsed.columnNumber === 5);

  // 2.6 Go Diagnostic
  const goStderr = `./main.go:6:2: undefined: fmt.Printl`;
  const goParsed = parseGoError(goStderr);
  assertPass('Go undefined identifier captured', goParsed.errorMessage.includes('undefined: fmt.Printl'));
  assertPass('Go lineNumber extracted as 6', goParsed.lineNumber === 6);
  assertPass('Go columnNumber extracted as 2', goParsed.columnNumber === 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: Line Number, Column & Source Code Context Windowing (Task 3)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 3: Line Number & Source Code Context Windowing\n');

{
  const sampleCode = `def init():
    pass

def divide(a, b):
    # Perform division
    result = a / b
    return result

def main():
    print(divide(10, 0))

main()`;

  // 3.1 Extract window centered on error line 6
  const snippet = extractCodeSnippet(sampleCode, 6, 2);
  assertPass('Error line code extracted exactly', snippet.errorLineCode === 'result = a / b');
  assertPass('Snippet includes pointer marker (-->)', snippet.codeSnippet.includes('-->   6 |     result = a / b'));
  assertPass('Snippet includes surrounding context lines', snippet.codeSnippet.includes('4 |') && snippet.codeSnippet.includes('8 |'));

  // 3.2 Invalid or null line number falls back gracefully
  const fallbackSnippet = extractCodeSnippet(sampleCode, null);
  assertPass('Null line number returns preview safely without throwing', fallbackSnippet.codeSnippet.length > 0);
  assertPass('Empty error line code on null line number', fallbackSnippet.errorLineCode === '');
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 4: AI Debugging Prompt Construction (Task 4)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 4: AI Debugging Prompt Construction\n');

{
  const errorInfo = {
    programmingLanguage: 'python',
    errorCategory: 'runtime',
    errorType: 'ZeroDivisionError',
    errorMessage: 'division by zero',
    lineNumber: 6,
    columnNumber: null,
    errorLineCode: 'result = a / b',
    codeSnippet: '-->   6 |     result = a / b',
    sourceCode: 'def divide(a, b):\n    return a / b\nprint(divide(10, 0))',
    rawError: 'ZeroDivisionError: division by zero',
    filename: 'calculator.py'
  };

  const prompts = buildErrorAnalysisPrompts(errorInfo);
  assertPass('System prompt enforces canonical Problem/Cause/Fix structure', prompts.systemPrompt.includes('### Problem:') && prompts.systemPrompt.includes('### Possible Causes:'));
  assertPass('System prompt includes CodeTrail Senior Debugger persona', prompts.systemPrompt.includes("Senior AI Debugging & Error Analysis Engine"));
  assertPass('User prompt injects language and filename', prompts.userPrompt.includes('PYTHON') && prompts.userPrompt.includes('calculator.py'));
  assertPass('User prompt injects error line code context', prompts.userPrompt.includes('result = a / b'));
  assertPass('User prompt injects full source code for global reasoning', prompts.userPrompt.includes('print(divide(10, 0))'));
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 5: Compilation Error Analysis (Task 5)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 5: Compilation Error Analysis & Diagnosis\n');

{
  // 5.1 C++ Missing Semicolon
  const cppError = extractErrorInfo({
    language: 'cpp',
    filename: 'main.cpp',
    code: '#include <iostream>\nint main() {\n    int x = 42\n    return 0;\n}',
    compileOutput: `main.cpp:3:15: error: expected ';' before 'return'`,
    isCompileError: true
  });

  assertPass('Identified as compilation category', cppError.errorCategory === 'compilation');
  assertPass('Identified lineNumber as 3', cppError.lineNumber === 3);

  const cppAnalysis = generateHeuristicErrorAnalysis(cppError);
  assertPass('Explanation mentions semicolon syntax expectation', cppAnalysis.explanation.includes('semicolon'));
  assertPass('Potential causes identify missing statement terminator', cppAnalysis.potentialCauses.some(c => c.includes('semicolon')));
  assertPass('Suggested correction provides actionable step', cppAnalysis.suggestedCorrections.length > 0);

  // 5.2 Python SyntaxError Missing Colon
  const pySyntax = extractErrorInfo({
    language: 'python',
    filename: 'script.py',
    code: 'if x > 10\n    print("Large")',
    stderr: '  File "script.py", line 1\n    if x > 10\n            ^\nSyntaxError: expected \':\'',
    isCompileError: true
  });

  const pyAnalysis = generateHeuristicErrorAnalysis(pySyntax);
  assertPass('Python syntax error identified as compilation/syntax', pySyntax.isCompilationError);
  assertPass('Syntax error explanation pinpoints missing colon', pyAnalysis.explanation.includes('colon'));
  assertPass('Corrected code appends missing colon', pyAnalysis.correctedCode.includes('if x > 10:'));
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 6: Runtime Error Analysis (Task 6)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 6: Runtime Error Analysis (ZeroDivision, Null/Undefined, Timeout)\n');

{
  // 6.1 JavaScript TypeError undefined access
  const jsRuntime = extractErrorInfo({
    language: 'javascript',
    filename: 'app.js',
    code: 'function getUser(id) { const u = null; return u.name; }',
    stderr: `TypeError: Cannot read properties of null (reading 'name')\n    at getUser (app.js:1:49)`,
    isCompileError: false
  });

  const jsAnalysis = generateHeuristicErrorAnalysis(jsRuntime);
  assertPass('Classified as runtime error category', jsRuntime.errorCategory === 'runtime');
  assertPass('Explanation clearly explains null/undefined access', jsAnalysis.explanation.includes('null') || jsAnalysis.explanation.includes('undefined'));
  assertPass('Suggests modern optional chaining (?.) or null guard', jsAnalysis.suggestedCorrections.some(s => s.includes('?.') || s.includes('null')));

  // 6.2 Execution Timeout (Infinite Loop)
  const timeoutError = extractErrorInfo({
    language: 'python',
    filename: 'loop.py',
    code: 'while True:\n    pass',
    isTimeout: true,
    exitCode: 137
  });

  assertPass('Timeout correctly flagged as isTimeout=true', timeoutError.isTimeout);
  assertPass('Error type classified as TimeoutError', timeoutError.errorType === 'TimeoutError');

  const timeoutAnalysis = generateHeuristicErrorAnalysis(timeoutError);
  assertPass('Timeout analysis diagnoses infinite loop', timeoutAnalysis.summary.includes('timeout') && timeoutAnalysis.explanation.includes('infinite loop'));
  assertPass('Identifies missing loop increment / exit condition', timeoutAnalysis.potentialCauses.some(c => c.includes('loop') || c.includes('condition')));
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 7: Potential Root Causes & Developer-Friendly Explanations (Tasks 7 & 8)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 7: Potential Root Causes & Developer-Friendly Explanations\n');

{
  const pyNameError = extractErrorInfo({
    language: 'python',
    filename: 'cart.py',
    code: 'def add(price):\n    total += price\n    return total\nadd(50)',
    stderr: `Traceback (most recent call last):\n  File "cart.py", line 2, in add\n    total += price\nNameError: name 'total' is not defined`
  });

  const analysis = generateHeuristicErrorAnalysis(pyNameError);
  assertPass('Summary clearly states undefined variable', analysis.summary.includes("'total'") && analysis.summary.includes('referenced before'));
  assertPass('Multiple potential causes provided (>= 2)', analysis.potentialCauses.length >= 2);
  assertPass('Explains LEGB namespace lookup simply for developers', analysis.explanation.includes('namespace') || analysis.explanation.includes('defined'));
  assertPass('Prevention tips provide actionable best practices', analysis.preventionTips.length >= 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 8: Corrected Code Snippet Synthesis & Formatting (Task 9)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 8: Corrected Code Snippet Synthesis & Formatting\n');

{
  const errorInfo = extractErrorInfo({
    language: 'python',
    filename: 'divide.py',
    code: 'def divide(a, b):\n    return a / b',
    stderr: `Traceback (most recent call last):\n  File "divide.py", line 2, in divide\n    return a / b\nZeroDivisionError: division by zero`
  });

  const analysis = generateHeuristicErrorAnalysis(errorInfo);
  assertPass('Corrected code is generated as non-empty string', typeof analysis.correctedCode === 'string' && analysis.correctedCode.length > 0);
  assertPass('Corrected code incorporates defensive check against zero', analysis.correctedCode.includes('!= 0') || analysis.correctedCode.includes('== 0') || analysis.correctedCode.includes('safe_divide'));
  assertPass('Markdown output encapsulates corrected code in fenced code block', analysis.markdown.includes('```python') && analysis.markdown.includes('```'));
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 9: Edge Cases, Incomplete Traces & Resilience (Task 10)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 9: Unsupported Languages, Incomplete Stack Traces & API Resilience\n');

module.exports = (async () => {
  // 9.1 Unsupported / Unknown Language
  const unknownLangError = extractErrorInfo({
    language: 'brainfuck',
    filename: 'test.bf',
    code: '++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]',
    error: 'Syntax error: unmatched ] bracket at position 42',
    exitCode: 1
  });

  const unknownAnalysis = generateHeuristicErrorAnalysis(unknownLangError);
  assertPass('Unsupported language handles cleanly without crash', unknownLangError.programmingLanguage === 'brainfuck');
  assertPass('Unsupported language generates helpful fallback diagnostic', unknownAnalysis.summary.length > 0 && unknownAnalysis.explanation.length > 0);

  // 9.2 Truncated / Incomplete Stack Trace (No Line Numbers)
  const truncatedError = extractErrorInfo({
    language: 'python',
    filename: 'unknown.py',
    code: 'x = 1',
    stderr: 'Fatal error occurred in worker process'
  });

  assertPass('Truncated stack trace gracefully extracts default error type', truncatedError.errorType.length > 0);
  assertPass('Line number defaults safely to null without crashing', truncatedError.lineNumber === null);

  // 9.3 Master End-to-End Pipeline with Offline Fallback
  const fullResult = await analyzeExecutionError({
    language: 'python',
    filename: 'calc.py',
    code: 'print(10 / 0)',
    stderr: 'Traceback (most recent call last):\n  File "calc.py", line 1, in <module>\n    print(10 / 0)\nZeroDivisionError: division by zero'
  });

  assertPass('Master pipeline returns success=true', fullResult.success === true);
  assertPass('Master pipeline identifies hasError=true', fullResult.hasError === true);
  assertPass('Structured errorInfo attached', fullResult.errorInfo.errorType === 'ZeroDivisionError');
  assertPass('Structured analysis summary present', fullResult.analysis.summary.includes('division by zero'));
  assertPass('Corrected code snippet provided', fullResult.analysis.correctedCode.length > 0);
  assertPass('Markdown conforms to canonical format', fullResult.markdown.includes('### Problem:') && fullResult.markdown.includes('### Possible Causes:'));

  // 9.4 Clean execution with zero errors
  const cleanResult = await analyzeExecutionError({
    language: 'python',
    filename: 'clean.py',
    code: 'print("Hello World")',
    output: 'Hello World',
    exitCode: 0
  });

  assertPass('Clean execution recognized with hasError=false', cleanResult.hasError === false);
  assertPass('Clean execution outputs success status', cleanResult.message.includes('No errors detected'));

  // ─────────────────────────────────────────────────────────────────────────
  // Section 10: Controller API Endpoint Simulation (Response Contracts)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Test Section 10: Controller API Request/Response Contracts\n');

  function createMockRes() {
    let statusCode = 200;
    let responseBody = null;
    return {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
      get statusCode() { return statusCode; },
      get body() { return responseBody; }
    };
  }

  // 10.1 POST /api/ai/error-analysis with full payload
  {
    const req = {
      body: {
        language: 'javascript',
        code: 'const x = null; console.log(x.length);',
        stderr: "TypeError: Cannot read properties of null (reading 'length')"
      }
    };
    const res = createMockRes();

    await analyzeError(req, res);

    assertPass('analyzeError returns HTTP 200 OK', res.statusCode === 200);
    assertPass('analyzeError response contains structured errorInfo', res.body.success && res.body.errorInfo.errorType === 'TypeError');
    assertPass('analyzeError response contains analysis with potentialCauses', res.body.analysis.potentialCauses.length > 0);
    assertPass('analyzeError response contains corrected code', res.body.analysis.correctedCode.length > 0);
  }

  // 10.2 POST /api/ai/error-analysis with empty payload -> 400 Bad Request
  {
    const req = { body: {} };
    const res = createMockRes();

    await analyzeError(req, res);

    assertPass('Empty payload returns HTTP 400 Bad Request', res.statusCode === 400);
    assertPass('Error message informs user of required fields', res.body.message.includes('required for analysis'));
  }

  // 10.3 POST /api/ai/debug endpoint backward-compatibility check
  {
    const req = {
      body: {
        error: "ZeroDivisionError: division by zero",
        code: "print(10 / 0)",
        language: "python"
      }
    };
    const res = createMockRes();

    await debugError(req, res);

    assertPass('debugError returns HTTP 200 OK', res.statusCode === 200);
    assertPass('debugError returns backward-compatible response property', typeof res.body.response === 'string' && res.body.response.includes('Problem:'));
    assertPass('debugError returns backward-compatible message property', typeof res.body.message === 'string' && res.body.message.includes('Possible Causes:'));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Final Test Suite Summary
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log(`🎉   ALL CODETRAIL AI ERROR ANALYSIS TESTS COMPLETED: ${passedTests}/${totalTests} PASSED!`);
  console.log('     Section 1  (Error Retrieval & Lang Normalization):   ✔');
  console.log('     Section 2  (Multi-Language Stack Trace Parsing):     ✔');
  console.log('     Section 3  (Line Context & Snippet Extraction):      ✔');
  console.log('     Section 4  (AI Prompt Construction):                 ✔');
  console.log('     Section 5  (Compilation Error Analysis):             ✔');
  console.log('     Section 6  (Runtime Error Analysis):                 ✔');
  console.log('     Section 7  (Root Causes & Explanations):             ✔');
  console.log('     Section 8  (Corrected Code Synthesis):               ✔');
  console.log('     Section 9  (Edge Cases & Fallback Resilience):       ✔');
  console.log('     Section 10 (Controller API Endpoint Contracts):      ✔');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
})();
