/**
 * testHarnessGenerator.js
 * CodeTrail Language Test Harness Generator
 *
 * Synthesizes in-memory test drivers for JavaScript, TypeScript, Python, C++, C,
 * Java, Rust, Go, and Bash. Uses boundary delimiters to ensure developer console
 * output cannot corrupt automated test assertions.
 *
 * NEVER mutates the user's original source code in the editor.
 */

import { DELIMITERS } from './testComparator.js';

/**
 * Format arguments into a safe C++ initializer representation
 */
function formatCppArgs(inputs = []) {
  return inputs
    .map(arg => {
      if (typeof arg === 'string') return `std::string("${arg.replace(/"/g, '\\"')}")`;
      if (typeof arg === 'boolean') return arg ? 'true' : 'false';
      if (arg === null) return 'nullptr';
      if (Array.isArray(arg)) {
        return `{${arg.join(', ')}}`;
      }
      return String(arg);
    })
    .join(', ');
}

/**
 * Format arguments into a safe Java representation
 */
function formatJavaArgs(inputs = []) {
  return inputs
    .map(arg => {
      if (typeof arg === 'string') return `"${arg.replace(/"/g, '\\"')}"`;
      if (typeof arg === 'boolean') return arg ? 'true' : 'false';
      if (arg === null) return 'null';
      return String(arg);
    })
    .join(', ');
}

/**
 * Strips TypeScript type annotations from simple parameter and variable signatures
 * Enables local Node.js execution without requiring external ts-node compiler.
 */
export function stripSimpleTypeScriptTypes(code = '') {
  return code
    // Strip interface and type declarations
    .replace(/(?:export\s+)?(?:interface|type)\s+[\w<>]+\s*\{?[\s\S]*?\}?;?/g, '')
    // Strip function return types: "): number {" or ") : void =>"
    .replace(/\)\s*:\s*[A-Za-z0-9_<>[\]|&]+\s*([={])/g, ')$1')
    // Strip parameter types: "(a: number, b: string)"
    .replace(/([a-zA-Z0-9_]+)\s*:\s*[A-Za-z0-9_<>[\]|&]+(\s*[,)])/g, '$1$2');
}

/**
 * Generates an in-memory execution payload for a test case
 *
 * @param {Object} options
 * @param {string} options.code - Original user code
 * @param {string} options.functionName - Name of target function
 * @param {string} options.language - Programming language
 * @param {Array} options.inputs - Array of arguments for this test case
 * @param {Object} options.functionAnalysis - Additional metadata (isAsync, returnType, etc.)
 * @returns {Object} { success: boolean, code: string, stdin: string, filename: string, error?: string }
 */
export function generateTestHarness({
  code = '',
  functionName = 'solution',
  language = 'javascript',
  inputs = [],
  _functionAnalysis = {}
}) {
  if (!code || typeof code !== 'string' || !code.trim()) {
    return {
      success: false,
      error: 'Cannot generate test harness for empty source code.'
    };
  }

  const normLang = String(language || '').toLowerCase().trim();
  const safeInputs = Array.isArray(inputs) ? inputs : [inputs];
  const jsonInputs = JSON.stringify(safeInputs);

  // 1. JAVASCRIPT
  if (normLang === 'javascript' || normLang === 'js') {
    const harness = `
// ─── CodeTrail In-Memory Test Harness (JavaScript) ───
;(async () => {
  try {
    const __args = ${jsonInputs};
    const __rawRes = await Promise.resolve(${functionName}(...__args));
    const __serialized = typeof __rawRes === 'undefined' ? '__CODETRAIL_UNDEFINED__' : JSON.stringify(__rawRes);
    console.log('${DELIMITERS.OUTPUT_START}\\n' + __serialized + '\\n${DELIMITERS.OUTPUT_END}');
  } catch (err) {
    const errPayload = JSON.stringify({ message: err?.message || String(err), name: err?.name || 'Error' });
    console.log('${DELIMITERS.ERROR_START}\\n' + errPayload + '\\n${DELIMITERS.ERROR_END}');
    process.exit(1);
  }
})();
`;
    return {
      success: true,
      code: `${code}\n${harness}`,
      stdin: '',
      filename: 'main.js'
    };
  }

  // 2. TYPESCRIPT
  if (normLang === 'typescript' || normLang === 'ts') {
    // Produce clean stripped version for reliable execution on Node.js
    const runnableCode = stripSimpleTypeScriptTypes(code);
    const harness = `
// ─── CodeTrail In-Memory Test Harness (TypeScript) ───
;(async () => {
  try {
    const __args = ${jsonInputs};
    const __rawRes = await Promise.resolve(${functionName}(...__args));
    const __serialized = typeof __rawRes === 'undefined' ? '__CODETRAIL_UNDEFINED__' : JSON.stringify(__rawRes);
    console.log('${DELIMITERS.OUTPUT_START}\\n' + __serialized + '\\n${DELIMITERS.OUTPUT_END}');
  } catch (err) {
    const errPayload = JSON.stringify({ message: err?.message || String(err), name: err?.name || 'Error' });
    console.log('${DELIMITERS.ERROR_START}\\n' + errPayload + '\\n${DELIMITERS.ERROR_END}');
    process.exit(1);
  }
})();
`;
    return {
      success: true,
      code: `${runnableCode}\n${harness}`,
      stdin: '',
      filename: 'main.ts'
    };
  }

  // 3. PYTHON
  if (normLang === 'python' || normLang === 'py') {
    const harness = `
# ─── CodeTrail In-Memory Test Harness (Python) ───
import json, sys

try:
    __args = ${jsonInputs}
    __rawRes = ${functionName}(*__args)
    __serialized = json.dumps(__rawRes)
    print("${DELIMITERS.OUTPUT_START}\\n" + __serialized + "\\n${DELIMITERS.OUTPUT_END}")
except Exception as e:
    errPayload = json.dumps({"message": str(e), "type": type(e).__name__})
    print("${DELIMITERS.ERROR_START}\\n" + errPayload + "\\n${DELIMITERS.ERROR_END}")
    sys.exit(1)
`;
    return {
      success: true,
      code: `${code}\n${harness}`,
      stdin: '',
      filename: 'main.py'
    };
  }

  // 4. C++ (CPP)
  if (normLang === 'cpp' || normLang === 'c++') {
    // If user code already defines int main(), we cannot inject another main
    if (/\bint\s+main\s*\(/.test(code)) {
      return {
        success: false,
        error: 'Target C++ file already defines a main() function. For function-level unit testing, select a standalone function or remove the existing main().'
      };
    }

    const formattedArgs = formatCppArgs(safeInputs);
    const harness = `
// ─── CodeTrail In-Memory Test Harness (C++) ───
#include <iostream>
#include <string>
#include <vector>
#include <sstream>

int main() {
    try {
        auto __res = ${functionName}(${formattedArgs});
        std::cout << "${DELIMITERS.OUTPUT_START}\\n";
        std::cout << std::boolalpha << __res << "\\n";
        std::cout << "${DELIMITERS.OUTPUT_END}\\n";
    } catch (const std::exception& e) {
        std::cout << "${DELIMITERS.ERROR_START}\\n";
        std::cout << "{\\"message\\":\\"" << e.what() << "\\"}\\n";
        std::cout << "${DELIMITERS.ERROR_END}\\n";
        return 1;
    } catch (...) {
        std::cout << "${DELIMITERS.ERROR_START}\\n";
        std::cout << "{\\"message\\":\\"Unhandled non-std C++ exception\\"}\\n";
        std::cout << "${DELIMITERS.ERROR_END}\\n";
        return 1;
    }
    return 0;
}
`;
    return {
      success: true,
      code: `${code}\n${harness}`,
      stdin: '',
      filename: 'main.cpp'
    };
  }

  // 5. C
  if (normLang === 'c') {
    if (/\bint\s+main\s*\(/.test(code)) {
      return {
        success: false,
        error: 'Target C file already defines a main() function. Select a standalone function for unit testing.'
      };
    }

    const formattedArgs = formatCppArgs(safeInputs);
    const harness = `
/* ─── CodeTrail In-Memory Test Harness (C) ─── */
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

int main() {
    long long __res = (long long)${functionName}(${formattedArgs});
    printf("${DELIMITERS.OUTPUT_START}\\n%lld\\n${DELIMITERS.OUTPUT_END}\\n", __res);
    return 0;
}
`;
    return {
      success: true,
      code: `${code}\n${harness}`,
      stdin: '',
      filename: 'main.c'
    };
  }

  // 6. JAVA (Unsupported in local sandbox due to javac unavailability)
  if (normLang === 'java') {
    return {
      success: false,
      error: 'Function-level test harness execution for Java is not currently supported by the local execution sandbox (local javac compiler is unavailable). Please use JavaScript, TypeScript, Python, C, or C++ for automated test cases.'
    };
  }

  // 7. GO (Unsupported in local sandbox)
  if (normLang === 'go' || normLang === 'golang') {
    return {
      success: false,
      error: 'Function-level test harness execution for Go is not currently supported by the local execution sandbox (local Go compiler is unavailable). Please use JavaScript, TypeScript, Python, C, or C++ for automated test cases.'
    };
  }

  // 8. RUST (Unsupported in local sandbox)
  if (normLang === 'rust' || normLang === 'rs') {
    return {
      success: false,
      error: 'Function-level test harness execution for Rust is not currently supported by the local execution sandbox (local Rust compiler is unavailable). Please use JavaScript, TypeScript, Python, C, or C++ for automated test cases.'
    };
  }

  // 9. BASH / SHELL (Unsupported in local Windows sandbox)
  if (normLang === 'bash' || normLang === 'sh' || normLang === 'shell') {
    return {
      success: false,
      error: 'Function-level test harness execution for Bash is not currently supported by the local execution sandbox (Windows environment lacks local Bash runner). Please use JavaScript, TypeScript, Python, C, or C++ for automated test cases.'
    };
  }

  return {
    success: false,
    error: `Function testing is currently not supported for language: "${normLang}". You can run the entire file directly in the workspace runner.`
  };
}
