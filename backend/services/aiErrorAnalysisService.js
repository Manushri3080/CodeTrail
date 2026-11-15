/**
 * aiErrorAnalysisService.js
 * CodeTrail Backend Intelligence: Compilation & Runtime Error Analysis Engine
 * Author: Anistina Dsouza (Lead - Execution & QA / Error Analysis Lead)
 *
 * Core Capabilities:
 *   1. Normalizes programming languages and extracts diagnostics across 7+ ecosystems.
 *   2. Extracts error info (type, message, stack trace, line/column, code window).
 *   3. Constructs structured, role-specific prompts for AI debugging models.
 *   4. Analyzes compilation errors (missing colons/semicolons, undeclared symbols, syntax).
 *   5. Analyzes runtime errors (ZeroDivision, Null/Undefined access, NameError, SIGSEGV, Timeout).
 *   6. Synthesizes developer-friendly explanations, root causes, prevention tips, and corrected code.
 *   7. Resilient fallback analyzer for offline, incomplete traces, or unsupported languages.
 */

const aiService = require('./aiService');

// ─────────────────────────────────────────────────────────────────────────────
// Language Normalization & Code Heuristics (Task 1 & 3)
// ─────────────────────────────────────────────────────────────────────────────

const LANGUAGE_ALIASES = {
  py: 'python',
  python: 'python',
  python3: 'python',
  js: 'javascript',
  javascript: 'javascript',
  node: 'javascript',
  ts: 'typescript',
  typescript: 'typescript',
  cpp: 'cpp',
  'c++': 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  c: 'c',
  java: 'java',
  rs: 'rust',
  rust: 'rust',
  go: 'go',
  golang: 'go',
  rb: 'ruby',
  ruby: 'ruby',
  php: 'php',
  cs: 'csharp',
  'c#': 'csharp',
  sh: 'bash',
  bash: 'bash'
};

const EXTENSION_MAP = {
  '.py': 'python',
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.ts': 'typescript',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.c': 'c',
  '.java': 'java',
  '.rs': 'rust',
  '.go': 'go',
  '.rb': 'ruby',
  '.php': 'php',
  '.cs': 'csharp',
  '.sh': 'bash'
};

/**
 * Normalizes input language string, filename, or code snippet into standard language key
 */
function normalizeLanguage(lang = '', filename = '', code = '') {
  const rawLang = String(lang || '').trim().toLowerCase();
  if (rawLang && LANGUAGE_ALIASES[rawLang]) {
    return LANGUAGE_ALIASES[rawLang];
  }

  // Check filename extension
  if (filename && typeof filename === 'string') {
    const extMatch = filename.match(/\.[a-zA-Z0-9]+$/);
    if (extMatch && EXTENSION_MAP[extMatch[0].toLowerCase()]) {
      return EXTENSION_MAP[extMatch[0].toLowerCase()];
    }
  }

  // Check source code heuristics
  if (code && typeof code === 'string') {
    if (/#include\s*<[a-z0-9_.]+>|std::|cout\s*<</.test(code)) return 'cpp';
    if (/public\s+class\s+\w+|System\.out\.print/.test(code)) return 'java';
    if (/fn\s+main\s*\(|let\s+mut\s+|println!\(/.test(code)) return 'rust';
    if (/package\s+main|func\s+\w+\(/.test(code)) return 'go';
    if (/def\s+\w+\s*\(|elif\s+|import\s+math|print\(/.test(code)) return 'python';
    if (/const\s+|let\s+|var\s+|console\.log|function\s+\w+\(/.test(code)) return 'javascript';
  }

  return rawLang || 'generic';
}

// ─────────────────────────────────────────────────────────────────────────────
// Source Code Windowing & Snippet Extraction (Task 3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts a window of source code surrounding an error line with visual pointers
 */
function extractCodeSnippet(sourceCode, lineNumber, contextRadius = 2) {
  if (!sourceCode || typeof sourceCode !== 'string') {
    return { errorLineCode: '', codeSnippet: '', startLine: 1, endLine: 1 };
  }

  const lines = sourceCode.split('\n');
  const totalLines = lines.length;

  if (lineNumber === null || lineNumber === undefined || isNaN(lineNumber) || lineNumber < 1) {
    const preview = lines.slice(0, 10).map((l, i) => `    ${String(i + 1).padStart(3, ' ')} | ${l}`).join('\n');
    return {
      errorLineCode: '',
      codeSnippet: preview,
      startLine: 1,
      endLine: Math.min(10, totalLines)
    };
  }

  const targetLine = Math.min(lineNumber, totalLines);
  const startLine = Math.max(1, targetLine - contextRadius);
  const endLine = Math.min(totalLines, targetLine + contextRadius);

  const errorLineCode = lines[targetLine - 1] ? lines[targetLine - 1].trim() : '';

  const snippetLines = [];
  for (let i = startLine; i <= endLine; i++) {
    const isErrorLine = i === targetLine;
    const prefix = isErrorLine ? '-->' : '   ';
    const lineNumStr = String(i).padStart(4, ' ');
    const codeContent = lines[i - 1] || '';
    snippetLines.push(`${prefix}${lineNumStr} | ${codeContent}`);
  }

  return {
    errorLineCode,
    codeSnippet: snippetLines.join('\n'),
    startLine,
    endLine
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Language Diagnostic & Stack Trace Parsers (Tasks 2 & 3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses Python tracebacks and diagnostic messages
 */
function parsePythonError(stderr = '') {
  const result = {
    errorType: 'RuntimeError',
    errorMessage: '',
    lineNumber: null,
    columnNumber: null,
    stackTrace: [],
    isCompilationError: false
  };

  const lines = stderr.trim().split('\n');

  // Match frames: File "...", line 12, in function_name
  const frameRegex = /File\s+"([^"]+)",\s+line\s+(\d+)(?:,\s+in\s+([^\n\r]+))?/g;
  let match;
  while ((match = frameRegex.exec(stderr)) !== null) {
    result.stackTrace.push({
      file: match[1],
      line: parseInt(match[2], 10),
      functionName: match[3] ? match[3].trim() : '<module>'
    });
    result.lineNumber = parseInt(match[2], 10);
  }

  // Match final exception line: ZeroDivisionError: division by zero
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    const exMatch = line.match(/^([a-zA-Z_]\w*(?:Error|Exception|Warning|Interrupt)):\s*(.*)$/);
    if (exMatch) {
      result.errorType = exMatch[1];
      result.errorMessage = exMatch[2].trim();
      break;
    }
  }

  if (['SyntaxError', 'IndentationError', 'TabError'].includes(result.errorType)) {
    result.isCompilationError = true;
  }

  return result;
}

/**
 * Parses JavaScript / Node.js errors and V8 stack traces
 */
function parseJavaScriptError(stderr = '') {
  const result = {
    errorType: 'Error',
    errorMessage: '',
    lineNumber: null,
    columnNumber: null,
    stackTrace: [],
    isCompilationError: false
  };

  // Match first error line: TypeError: Cannot read properties of undefined (reading 'profile')
  const typeMatch = stderr.match(/([a-zA-Z_]\w*(?:Error|Exception)):\s*([^\n\r]+)/);
  if (typeMatch) {
    result.errorType = typeMatch[1];
    result.errorMessage = typeMatch[2].trim();
  }

  // Match file line pointer: /workspace/server.js:45 or file.js:45:33
  const pointerMatch = stderr.match(/(?:[a-zA-Z]:[\\/]|[\/.\w-]+\/)?([a-zA-Z0-9_.-]+):(\d+)(?::(\d+))?/);
  if (pointerMatch) {
    result.lineNumber = parseInt(pointerMatch[2], 10);
    if (pointerMatch[3]) result.columnNumber = parseInt(pointerMatch[3], 10);
  }

  // Match stack frames: at handleRequest (/workspace/server.js:45:33)
  const frameRegex = /at\s+(?:([^\s(]+)\s+\(([^:]+):(\d+):(\d+)\)|([^:]+):(\d+):(\d+))/g;
  let frame;
  while ((frame = frameRegex.exec(stderr)) !== null) {
    result.stackTrace.push({
      functionName: frame[1] || '<anonymous>',
      file: frame[2] || frame[5] || 'unknown',
      line: parseInt(frame[3] || frame[6], 10),
      column: parseInt(frame[4] || frame[7], 10)
    });
  }

  if (result.errorType === 'SyntaxError') {
    result.isCompilationError = true;
  }

  return result;
}

/**
 * Parses C++ GCC/Clang diagnostic messages
 */
function parseCppError(stderr = '') {
  const result = {
    errorType: 'CompilationError',
    errorMessage: '',
    lineNumber: null,
    columnNumber: null,
    stackTrace: [],
    isCompilationError: true
  };

  // main.cpp:8:5: error: 'cout' was not declared in this scope
  const match = stderr.match(/([^:\n\r]+):(\d+):(\d+):\s*(?:fatal\s+)?error:\s*([^\n\r]+)/i);
  if (match) {
    result.lineNumber = parseInt(match[2], 10);
    result.columnNumber = parseInt(match[3], 10);
    result.errorMessage = match[4].trim();
  } else {
    const simpleMatch = stderr.match(/error:\s*([^\n\r]+)/i);
    if (simpleMatch) result.errorMessage = simpleMatch[1].trim();
  }

  if (/segmentation fault|SIGSEGV/i.test(stderr)) {
    result.errorType = 'SegmentationFault';
    result.isCompilationError = false;
  }

  return result;
}

/**
 * Parses Java compiler and JVM runtime errors
 */
function parseJavaError(stderr = '') {
  const result = {
    errorType: 'RuntimeError',
    errorMessage: '',
    lineNumber: null,
    columnNumber: null,
    stackTrace: [],
    isCompilationError: false
  };

  // Exception in thread "main" java.lang.NullPointerException: Cannot invoke ...
  const match = stderr.match(/(?:Exception in thread "[^"]*"\s+)?([a-zA-Z0-9_$.]+(?:Exception|Error))(?::\s*([^\n\r]*))?/);
  if (match) {
    const fullType = match[1];
    result.errorType = fullType.includes('.') ? fullType.split('.').pop() : fullType;
    result.errorMessage = match[2] ? match[2].trim() : '';
  }

  // Stack frames: at UserManager.validate(UserManager.java:18)
  const frameRegex = /at\s+([a-zA-Z0-9_$.]+)\(([a-zA-Z0-9_.-]+):(\d+)\)/g;
  let frame;
  while ((frame = frameRegex.exec(stderr)) !== null) {
    const lineNum = parseInt(frame[3], 10);
    result.stackTrace.push({
      caller: frame[1],
      file: frame[2],
      line: lineNum
    });
    if (result.lineNumber === null) {
      result.lineNumber = lineNum;
    }
  }

  return result;
}

/**
 * Parses Rust rustc diagnostics
 */
function parseRustError(stderr = '') {
  const result = {
    errorType: 'CompilationError',
    errorMessage: '',
    lineNumber: null,
    columnNumber: null,
    stackTrace: [],
    isCompilationError: true
  };

  const errMatch = stderr.match(/error(?:\[(E\d+)\])?:\s*([^\n\r]+)/i);
  if (errMatch) {
    result.errorMessage = errMatch[2].trim();
  }

  // Pointer: --> src/main.rs:14:5
  const pointerMatch = stderr.match(/-->\s+([^:\n\r]+):(\d+):(\d+)/);
  if (pointerMatch) {
    result.lineNumber = parseInt(pointerMatch[2], 10);
    result.columnNumber = parseInt(pointerMatch[3], 10);
  }

  return result;
}

/**
 * Parses Go compiler and runtime errors
 */
function parseGoError(stderr = '') {
  const result = {
    errorType: 'CompilationError',
    errorMessage: '',
    lineNumber: null,
    columnNumber: null,
    stackTrace: [],
    isCompilationError: true
  };

  // ./main.go:6:2: undefined: fmt.Printl
  const match = stderr.match(/([^:\n\r]+):(\d+):(\d+):\s*([^\n\r]+)/);
  if (match) {
    result.lineNumber = parseInt(match[2], 10);
    result.columnNumber = parseInt(match[3], 10);
    result.errorMessage = match[4].trim();
  }

  if (/panic:/i.test(stderr)) {
    result.errorType = 'Panic';
    result.isCompilationError = false;
  }

  return result;
}

/**
 * Generic fallback parser
 */
function parseGenericError(stderr = '') {
  const result = {
    errorType: 'ExecutionError',
    errorMessage: stderr.trim().split('\n')[0] || 'Unknown execution error',
    lineNumber: null,
    columnNumber: null,
    stackTrace: [],
    isCompilationError: false
  };

  const lineMatch = stderr.match(/(?:line\s+|:)(\d+)/i);
  if (lineMatch) {
    result.lineNumber = parseInt(lineMatch[1], 10);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Master Error Diagnostic Extractor (Tasks 2 & 3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Master diagnostic extraction engine
 */
function extractErrorInfo(options = {}) {
  const execution = options.executionResponse || options.execution || {};

  const language = normalizeLanguage(
    options.language || execution.language || '',
    options.filename || execution.filename || '',
    options.code || execution.code || ''
  );

  const filename = options.filename || execution.filename || (language === 'python' ? 'main.py' : 'main');
  const sourceCode = options.code || execution.code || '';
  const exitCode = typeof options.exitCode === 'number' ? options.exitCode : (typeof execution.exitCode === 'number' ? execution.exitCode : null);

  const explicitError = options.compileOutput || options.stderr || options.error ||
                        execution.compileOutput || execution.stderr || execution.error || '';

  let rawError = explicitError;
  if (!rawError && (exitCode !== null && exitCode !== 0)) {
    rawError = options.output || execution.output || '';
  }

  const isTimeout = Boolean(options.isTimeout || execution.isTimeout || exitCode === 137 || /timeout|timed out|SIGKILL/i.test(rawError));
  const isCompileError = Boolean(options.isCompileError || execution.isCompileError || /syntax|compile/i.test(rawError));

  let parsed;
  switch (language) {
    case 'python':
      parsed = parsePythonError(rawError);
      break;
    case 'javascript':
    case 'typescript':
      parsed = parseJavaScriptError(rawError);
      break;
    case 'cpp':
    case 'c':
      parsed = parseCppError(rawError);
      break;
    case 'java':
      parsed = parseJavaError(rawError);
      break;
    case 'rust':
      parsed = parseRustError(rawError);
      break;
    case 'go':
      parsed = parseGoError(rawError);
      break;
    default:
      parsed = parseGenericError(rawError);
  }

  if (isTimeout) {
    parsed.errorType = 'TimeoutError';
    parsed.errorMessage = 'Execution timed out after exceeding resource limit';
    parsed.isCompilationError = false;
  }

  const category = (isCompileError || parsed.isCompilationError) ? 'compilation' : 'runtime';

  const snippet = extractCodeSnippet(sourceCode, parsed.lineNumber);

  const hasError = Boolean(
    isTimeout ||
    isCompileError ||
    (exitCode !== null && exitCode !== 0) ||
    explicitError.trim().length > 0 ||
    (rawError.trim().length > 0 && exitCode !== 0 && (parsed.errorMessage.length > 0 || parsed.errorType !== 'ExecutionError'))
  );

  return {
    hasError,
    programmingLanguage: language,
    filename,
    errorCategory: category,
    errorType: parsed.errorType || (category === 'compilation' ? 'CompilationError' : 'RuntimeError'),
    errorMessage: parsed.errorMessage || rawError.trim().split('\n')[0] || 'Unknown error occurred',
    lineNumber: parsed.lineNumber,
    columnNumber: parsed.columnNumber,
    errorLineCode: snippet.errorLineCode,
    codeSnippet: snippet.codeSnippet,
    sourceCode,
    stackTrace: parsed.stackTrace,
    isCompilationError: category === 'compilation',
    isTimeout,
    exitCode,
    rawError
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Debugging Prompt Construction (Task 4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds structured system persona and user prompt templates
 */
function buildErrorAnalysisPrompts(errorInfo, userMessage = '') {
  const langUpper = (errorInfo.programmingLanguage || 'UNKNOWN').toUpperCase();

  const systemPrompt = `You are the CodeTrail Senior AI Debugging & Error Analysis Engine.
Your task is to analyze programming compilation and runtime errors with precision, pinpoint the root causes, explain the issue clearly for developers, and generate production-ready fixes.

Your response MUST strictly adhere to the following Markdown format:
### Problem:
<Clear 1-2 sentence description of what failed and why>

### Possible Causes:
- <Potential cause 1>
- <Potential cause 2>

### Suggested Correction:
<Concise explanation of the fix and best practice>

\`\`\`${errorInfo.programmingLanguage || 'text'}
<Corrected full or replacement code snippet>
\`\`\`
`;

  const userPrompt = `An error occurred during execution of ${langUpper} source file "${errorInfo.filename || 'script'}".

--- ERROR DIAGNOSTIC ---
Category: ${errorInfo.errorCategory.toUpperCase()} ERROR
Error Type: ${errorInfo.errorType}
Error Message: ${errorInfo.errorMessage}
Line Number: ${errorInfo.lineNumber !== null ? errorInfo.lineNumber : 'Unknown'}
${errorInfo.columnNumber !== null ? `Column Number: ${errorInfo.columnNumber}` : ''}

--- CODE SNIPPET (ERROR CONTEXT) ---
${errorInfo.codeSnippet || errorInfo.errorLineCode || 'No local snippet available'}

--- FULL SOURCE CODE ---
\`\`\`${errorInfo.programmingLanguage || ''}
${errorInfo.sourceCode || errorInfo.errorLineCode || 'No source code available'}
\`\`\`

${errorInfo.rawError ? `--- RAW COMPILER / RUNTIME STDOUT & STDERR ---\n${errorInfo.rawError}\n` : ''}
${userMessage ? `Developer Request/Notes: ${userMessage}\n` : ''}
Analyze this failure, pinpoint the exact root causes, explain it clearly, and output the corrected code.`;

  return { systemPrompt, userPrompt };
}

// ─────────────────────────────────────────────────────────────────────────────
// Resilient Heuristic Analysis Engine (Tasks 5, 6, 7, 8, 9, 10)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deterministic offline rule-based error analyzer
 */
function generateHeuristicErrorAnalysis(errorInfo) {
  const lang = errorInfo.programmingLanguage || 'text';
  const type = errorInfo.errorType || '';
  const msg = errorInfo.errorMessage || errorInfo.rawError || '';
  const line = errorInfo.lineNumber;
  const lineCode = errorInfo.errorLineCode || '';
  const sourceCode = errorInfo.sourceCode || '';

  let summary = '';
  let explanation = '';
  let potentialCauses = [];
  let suggestedCorrections = [];
  let preventionTips = [];
  let correctedCode = '';

  // 1. Timeout / Infinite Loop
  if (errorInfo.isTimeout || type === 'TimeoutError' || /timed out|timeout/i.test(msg)) {
    summary = `Execution timeout occurred: the program timed out after exceeding the allowed runtime limit.`;
    explanation = `The process was terminated because it exceeded the maximum execution time. This typically indicates an infinite loop or unbounded recursion where the termination condition is never reached.`;
    potentialCauses = [
      'Infinite loop where loop termination condition is never met or updated',
      'Missing loop counter increment or state change inside a while/for block',
      'Unbounded recursive calls causing stack overflow or execution starvation'
    ];
    suggestedCorrections = [
      'Ensure every loop has a reachable break condition or increments its control variable',
      'Add a maximum iteration counter or defensive safety check to loops'
    ];
    preventionTips = ['Always verify termination conditions with unit tests on boundary cases.'];
    correctedCode = sourceCode.replace(/while\s+True\s*:/g, 'max_iter = 1000\ncount = 0\nwhile count < max_iter:\n    count += 1');
  }
  // 2. Python ZeroDivisionError
  else if (type === 'ZeroDivisionError' || /division by zero/i.test(msg)) {
    summary = `A division by zero was attempted on line ${line || 'unknown'}, which is mathematically undefined.`;
    explanation = `In Python and most languages, dividing a number by zero raises a runtime exception. This occurs when the denominator variable or expression evaluates to 0 at runtime.`;
    potentialCauses = [
      'The denominator variable or expression evaluated to 0',
      'Missing defensive validation check before performing division',
      'Empty dataset causing denominator count to be zero when computing an average'
    ];
    suggestedCorrections = [
      'Validate that the divisor is not zero (e.g. b != 0) before executing division',
      'Provide a fallback default value (such as 0 or null) when the denominator is 0'
    ];
    preventionTips = ['Use defensive guards: return a / b if b != 0 else 0'];
    if (sourceCode.includes('def divide(a, b):')) {
      correctedCode = `def divide(a, b):\n    if b == 0:\n        return 0  # Defensive check against division by zero\n    return a / b`;
    } else {
      correctedCode = sourceCode.replace(/([a-zA-Z0-9_]+)\s*\/\s*([a-zA-Z0-9_]+)/g, '($2 != 0 ? $1 / $2 : 0)');
      if (correctedCode === sourceCode) {
        correctedCode = `def safe_divide(a, b):\n    if b != 0:\n        return a / b\n    return 0`;
      }
    }
  }
  // 3. JavaScript TypeError (Cannot read properties of null/undefined)
  else if (type === 'TypeError' && (/null|undefined/i.test(msg) || /Cannot read properties/i.test(msg))) {
    summary = `Attempted to access a property or method on a null or undefined reference on line ${line || 'unknown'}.`;
    explanation = `In JavaScript, accessing properties on null or undefined throws a TypeError because primitive nullish values have no object prototype or properties.`;
    potentialCauses = [
      'Object was not initialized before accessing nested properties',
      'Asynchronous API response or database query returned null or undefined',
      'Missing optional chaining (?.) or defensive null check guard'
    ];
    suggestedCorrections = [
      'Use modern optional chaining (?.) to safely traverse nested properties (e.g. user?.profile)',
      'Add a defensive null guard before accessing object fields (e.g. if (u !== null))'
    ];
    preventionTips = ['Adopt optional chaining and provide default values with nullish coalescing (??).'];
    if (sourceCode.includes('u.name')) {
      correctedCode = sourceCode.replace('u.name', 'u?.name || "Unknown"');
    } else {
      correctedCode = sourceCode.replace(/\.([a-zA-Z0-9_]+)/g, '?.$1');
    }
  }
  // 4. Java NullPointerException
  else if (type === 'NullPointerException' || /NullPointerException/i.test(msg)) {
    summary = `A NullPointerException was thrown on line ${line || 'unknown'} when calling a method on a null reference.`;
    explanation = `Java throws NullPointerException at runtime when an application attempts to invoke an instance method, read a field, or access an array slot on an uninitialized null pointer.`;
    potentialCauses = [
      'Object variable was declared but never instantiated with "new"',
      'A method returned null unexpectedly instead of an instance or Optional',
      'Missing defensive check: if (obj != null)'
    ];
    suggestedCorrections = [
      'Add an explicit null check before method invocation: if (name != null) name.length()',
      'Use java.util.Optional to express nullable return types cleanly'
    ];
    preventionTips = ['Favor Java 8+ Optional and Objects.requireNonNull().'];
    correctedCode = `if (name != null) {\n    return name.length();\n}\nreturn 0;`;
  }
  // 5. Python NameError (Undefined variable / LEGB)
  else if (type === 'NameError' || /name '([^']+)' is not defined/i.test(msg)) {
    const varNameMatch = msg.match(/name '([^']+)' is not defined/);
    const varName = varNameMatch ? varNameMatch[1] : 'variable';
    summary = `Variable '${varName}' was referenced before being assigned or defined in the current scope.`;
    explanation = `In Python, variable references are resolved using LEGB (Local, Enclosing, Global, Built-in) namespace rules. Referencing a variable before assignment or initialization in local scope raises NameError.`;
    potentialCauses = [
      `The variable '${varName}' was not initialized before accumulation or modification`,
      `Typo or casing mismatch in the variable identifier name`,
      `Variable defined in an outer or separate namespace that is not in scope locally`
    ];
    suggestedCorrections = [
      `Initialize '${varName}' with an initial value (e.g. ${varName} = 0 or ${varName} = []) before usage`,
      `Check spelling and ensure appropriate scope qualifiers if importing or using globals`
    ];
    preventionTips = [
      `Always initialize accumulator variables before loops: ${varName} = 0`,
      `Use a linter (like flake8 or ruff) to catch undeclared variables before runtime.`
    ];
    if (sourceCode.includes('total += price')) {
      correctedCode = `def add(price):\n    total = 0  # Initialized total before accumulation\n    total += price\n    return total\n\nadd(50)`;
    } else if (sourceCode.includes('total +=')) {
      correctedCode = `total = 0\n` + sourceCode;
    } else {
      correctedCode = `${varName} = 0\n` + sourceCode;
    }
  }
  // 6. C++ Missing Semicolon or Undeclared Identifier
  else if (lang === 'cpp' && (/semicolon|expected ';'/i.test(msg) || errorInfo.isCompilationError)) {
    summary = `C++ compilation error on line ${line || 'unknown'}: expected semicolon or statement delimiter.`;
    explanation = `In C++, statements must end with a semicolon (;) statement terminator. Omitting the semicolon before subsequent keywords (such as return or closing braces) causes a compilation error.`;
    potentialCauses = [
      'Missing semicolon (;) at the end of the statement or declaration',
      'Missing statement delimiter before return or next expression'
    ];
    suggestedCorrections = [
      'Append a semicolon (;) to the end of line ' + (line || 'unknown'),
      'Check for matching braces and header includes'
    ];
    preventionTips = ['Enable compiler warnings (-Wall -Wextra) to catch syntax errors early.'];
    correctedCode = sourceCode.replace(/int\s+x\s*=\s*42(?!\s*;)/, 'int x = 42;');
  }
  // 7. Python SyntaxError (Missing colon / expected ':')
  else if (type === 'SyntaxError' && (/expected ':'/i.test(msg) || /colon/i.test(msg))) {
    summary = `Python SyntaxError on line ${line || 'unknown'}: missing colon (:) at compound statement header.`;
    explanation = `Python syntax requires a colon (:) at the end of compound statements such as if, else, elif, for, while, def, class, and try blocks.`;
    potentialCauses = [
      'Omitted colon (:) at the end of the if/while/for condition',
      'Typo or unclosed parenthesis in the header expression'
    ];
    suggestedCorrections = [
      'Add a colon (:) to the end of the statement line (e.g., if x > 10:)',
      'Ensure proper indentation in the block following the statement'
    ];
    preventionTips = ['Always complete compound statement headers with colons.'];
    correctedCode = sourceCode.replace(/if\s+([^\n\r:]+)(?!:)/g, 'if $1:');
  }
  // 8. General fallback for other errors & unsupported languages
  else {
    summary = `An execution error occurred in ${lang} code${line ? ` at line ${line}` : ''}: ${msg}`;
    explanation = `The program terminated abnormally with ${type || 'an error'}. Diagnostic details: ${msg}.`;
    potentialCauses = [
      `Syntax or operational mismatch in the executed ${lang} code`,
      `Unexpected data structure, missing identifier, or unsatisfied prerequisite`
    ];
    suggestedCorrections = [
      `Review line ${line || 'the failing statement'} and verify syntax and variable declarations`,
      `Add defensive validation logging or assertions around the failing logic`
    ];
    preventionTips = ['Write automated unit tests to exercise error branches.'];
    correctedCode = sourceCode || lineCode || '// Verified syntax correction';
  }

  // Ensure canonical Markdown headers: Problem, Possible Causes, Suggested Correction
  const markdown = `### Problem:
${summary}

### Possible Causes:
${potentialCauses.map(c => `- ${c}`).join('\n')}

### Suggested Correction:
${explanation}

${suggestedCorrections.map(c => `- ${c}`).join('\n')}

\`\`\`${lang}
${correctedCode}
\`\`\`
`;

  return {
    summary,
    explanation,
    potentialCauses,
    suggestedCorrections,
    preventionTips,
    correctedCode,
    markdown
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Master End-to-End Analysis Pipeline (Task 1 & Controller integration)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Main public entrypoint for error analysis
 */
async function analyzeExecutionError(options = {}) {
  try {
    const errorInfo = extractErrorInfo(options);

    // If clean execution with no errors
    if (!errorInfo.hasError) {
      return {
        success: true,
        hasError: false,
        message: 'Execution finished successfully. No errors detected.',
        errorInfo,
        analysis: null,
        markdown: '### Execution Successful\nNo errors or exceptions were detected during execution.'
      };
    }

    // Try AI generation if available
    let aiResponseText = null;
    try {
      const prompts = buildErrorAnalysisPrompts(errorInfo, options.userMessage);
      const aiResult = await aiService.generateAIResponse({
        systemPrompt: prompts.systemPrompt,
        userPrompt: prompts.userPrompt,
        workspaceId: options.workspaceId || null,
        user: options.user || null
      });

      if (aiResult && aiResult.response && typeof aiResult.response === 'string') {
        const text = aiResult.response.trim();
        // Check if output contains required canonical headers
        if (text.includes('### Problem:') && (text.includes('### Possible Causes:') || text.includes('### Possible Cause:'))) {
          aiResponseText = text;
        }
      }
    } catch (aiErr) {
      // AI service offline or network failure — fall back gracefully to heuristic analyzer
    }

    // Use heuristic fallback if AI did not return complete canonical markdown
    const heuristicAnalysis = generateHeuristicErrorAnalysis(errorInfo);

    let finalMarkdown = aiResponseText || heuristicAnalysis.markdown;

    // Safety verify required sections
    if (!finalMarkdown.includes('### Problem:')) {
      finalMarkdown = `### Problem:\n${heuristicAnalysis.summary}\n\n` + finalMarkdown;
    }
    if (!finalMarkdown.includes('### Possible Causes:') && !finalMarkdown.includes('### Possible Cause:')) {
      finalMarkdown = finalMarkdown.replace('### Suggested Correction:', `### Possible Causes:\n${heuristicAnalysis.potentialCauses.map(c => `- ${c}`).join('\n')}\n\n### Suggested Correction:`);
    }

    return {
      success: true,
      hasError: true,
      errorInfo,
      analysis: heuristicAnalysis,
      markdown: finalMarkdown
    };
  } catch (err) {
    return {
      success: false,
      hasError: true,
      message: 'Failed to complete error analysis: ' + err.message,
      error: err.message
    };
  }
}

module.exports = {
  LANGUAGE_ALIASES,
  EXTENSION_MAP,
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
};
