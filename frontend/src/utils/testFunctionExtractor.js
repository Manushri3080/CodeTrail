/**
 * testFunctionExtractor.js
 * CodeTrail Function Extractor & Target Resolver
 *
 * Scans code (selection or full file) to discover and isolate target function
 * definitions across supported languages (JS, TS, Python, C++, C, Java, Go, Rust, Bash).
 * Prevents blind whole-file submissions to the AI test generation service.
 */

/**
 * Extract parameter names from a comma-separated parameter string
 */
function parseParameters(paramStr = '', _language = '') {
  if (!paramStr || !paramStr.trim()) return [];
  return paramStr
    .split(',')
    .map(p => {
      let clean = p.trim();
      // Remove default values: "taxRate = 0.05" -> "taxRate"
      clean = clean.split('=')[0].trim();
      // Remove TS/Python type annotations: "num: number" -> "num"
      if (clean.includes(':')) clean = clean.split(':')[0].trim();
      // Java/C/C++ type declarations: "int number" -> "number"
      const parts = clean.split(/\s+/);
      clean = parts[parts.length - 1];
      return clean;
    })
    .filter(p => p && p !== 'self' && p !== 'this' && p !== 'void');
}

/**
 * Extract Python function block by tracking indentation
 */
function extractPythonBlock(lines, startLineIdx) {
  const startLine = lines[startLineIdx];
  const baseIndentMatch = startLine.match(/^(\s*)/);
  const baseIndent = baseIndentMatch ? baseIndentMatch[1].length : 0;
  const blockLines = [startLine];

  let endLineIdx = startLineIdx;
  for (let i = startLineIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      blockLines.push(line);
      continue;
    }
    const currentIndentMatch = line.match(/^(\s*)/);
    const currentIndent = currentIndentMatch ? currentIndentMatch[1].length : 0;
    if (currentIndent <= baseIndent) {
      break;
    }
    blockLines.push(line);
    endLineIdx = i;
  }

  return {
    codeSnippet: blockLines.join('\n').trimEnd(),
    endLine: endLineIdx + 1
  };
}

/**
 * Extract brace-delimited code block { ... } for C-like languages
 */
function extractBraceBlock(lines, startLineIdx) {
  const blockLines = [];
  let braceCount = 0;
  let started = false;
  let endLineIdx = startLineIdx;

  for (let i = startLineIdx; i < lines.length; i++) {
    const line = lines[i];
    blockLines.push(line);
    for (let char of line) {
      if (char === '{') {
        braceCount++;
        started = true;
      } else if (char === '}') {
        braceCount--;
      }
    }
    if (started && braceCount <= 0) {
      endLineIdx = i;
      break;
    }
  }

  return {
    codeSnippet: blockLines.join('\n').trimEnd(),
    endLine: endLineIdx + 1
  };
}

/**
 * Discover functions declared in the code string based on language
 * @param {string} code
 * @param {string} language
 * @returns {Array<Object>}
 */
export function extractFunctions(code = '', language = 'javascript') {
  if (!code || typeof code !== 'string' || !code.trim()) {
    return [];
  }

  const normLang = String(language || '').toLowerCase().trim();
  const isPython = normLang === 'python' || normLang === 'py';
  const isCpp = normLang === 'cpp' || normLang === 'c++' || normLang === 'c';
  const isJava = normLang === 'java';
  const isGo = normLang === 'go' || normLang === 'golang';
  const isRust = normLang === 'rust' || normLang === 'rs';
  const isBash = normLang === 'bash' || normLang === 'sh' || normLang === 'shell';

  const lines = code.split('\n');
  const discovered = [];
  const seenSignatures = new Set();

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();

    // Skip comment lines
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      continue;
    }

    if (isPython) {
      const pyMatch = line.match(/^\s*(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*(?:->\s*[^:]+)?\s*:/);
      if (pyMatch) {
        const name = pyMatch[1];
        const params = parseParameters(pyMatch[2], 'python');
        const signature = `${name}(${params.join(', ')})`;
        if (!seenSignatures.has(signature)) {
          seenSignatures.add(signature);
          const block = extractPythonBlock(lines, idx);
          discovered.push({
            name,
            parameters: params,
            signature,
            codeSnippet: block.codeSnippet,
            startLine: idx + 1,
            endLine: block.endLine,
            language: 'python'
          });
        }
      }
    } else if (isCpp || isJava) {
      // Return type + function name + (params)
      // e.g. "int isEven(int number) {" or "public static boolean isEven(int number) {"
      const funcMatch = line.match(/(?:public|private|protected|static|virtual|inline|const|\s)*\b([\w<>\[\]:*&]+)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*(?:const)?\s*(?:throws\s+[\w,\s]+)?\s*\{?/);
      if (funcMatch) {
        const name = funcMatch[2];
        const ignoredKeywords = new Set(['if', 'for', 'while', 'switch', 'catch', 'sizeof', 'typeof', 'class', 'struct', 'enum']);
        if (!ignoredKeywords.has(name) && !name.startsWith('~')) {
          const params = parseParameters(funcMatch[3], normLang);
          const signature = `${name}(${params.join(', ')})`;
          if (!seenSignatures.has(signature)) {
            seenSignatures.add(signature);
            const block = extractBraceBlock(lines, idx);
            discovered.push({
              name,
              parameters: params,
              signature,
              codeSnippet: block.codeSnippet,
              startLine: idx + 1,
              endLine: block.endLine,
              language: normLang
            });
          }
        }
      }
    } else if (isGo) {
      const goMatch = line.match(/^\s*func\s+(?:\([^)]+\)\s+)?([a-zA-Z0-9_]+)\s*\(([^)]*)\)/);
      if (goMatch) {
        const name = goMatch[1];
        const params = parseParameters(goMatch[2], 'go');
        const signature = `${name}(${params.join(', ')})`;
        if (!seenSignatures.has(signature)) {
          seenSignatures.add(signature);
          const block = extractBraceBlock(lines, idx);
          discovered.push({
            name,
            parameters: params,
            signature,
            codeSnippet: block.codeSnippet,
            startLine: idx + 1,
            endLine: block.endLine,
            language: 'go'
          });
        }
      }
    } else if (isRust) {
      const rustMatch = line.match(/^\s*(?:pub(?:\([^)]+\))?\s+)?(?:async\s+)?fn\s+([a-zA-Z0-9_]+)\s*(?:<[^>]*>)?\s*\(([^)]*)\)/);
      if (rustMatch) {
        const name = rustMatch[1];
        const params = parseParameters(rustMatch[2], 'rust');
        const signature = `${name}(${params.join(', ')})`;
        if (!seenSignatures.has(signature)) {
          seenSignatures.add(signature);
          const block = extractBraceBlock(lines, idx);
          discovered.push({
            name,
            parameters: params,
            signature,
            codeSnippet: block.codeSnippet,
            startLine: idx + 1,
            endLine: block.endLine,
            language: 'rust'
          });
        }
      }
    } else if (isBash) {
      const bashMatch = line.match(/^\s*(?:function\s+)?([a-zA-Z0-9_-]+)\s*(?:\(\s*\))?\s*\{/);
      if (bashMatch) {
        const name = bashMatch[1];
        const signature = `${name}()`;
        if (!seenSignatures.has(signature)) {
          seenSignatures.add(signature);
          const block = extractBraceBlock(lines, idx);
          discovered.push({
            name,
            parameters: [],
            signature,
            codeSnippet: block.codeSnippet,
            startLine: idx + 1,
            endLine: block.endLine,
            language: 'bash'
          });
        }
      }
    } else {
      // JavaScript / TypeScript
      const standardFn = line.match(/(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/);
      const arrowFn = line.match(/(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?(?:\(([^)]*)\)|([a-zA-Z0-9_]+))\s*=>/);
      const methodFn = line.match(/^\s*(?:async\s+)?([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*\{/);

      let name = null;
      let paramStr = '';

      if (standardFn) {
        name = standardFn[1];
        paramStr = standardFn[2];
      } else if (arrowFn) {
        name = arrowFn[1];
        paramStr = arrowFn[2] !== undefined ? arrowFn[2] : arrowFn[3];
      } else if (methodFn) {
        const potentialName = methodFn[1];
        const reserved = new Set(['if', 'for', 'while', 'switch', 'catch', 'constructor']);
        if (!reserved.has(potentialName)) {
          name = potentialName;
          paramStr = methodFn[2];
        }
      }

      if (name) {
        const params = parseParameters(paramStr, 'javascript');
        const signature = `${name}(${params.join(', ')})`;
        if (!seenSignatures.has(signature)) {
          seenSignatures.add(signature);
          const block = extractBraceBlock(lines, idx);
          discovered.push({
            name,
            parameters: params,
            signature,
            codeSnippet: block.codeSnippet,
            startLine: idx + 1,
            endLine: block.endLine,
            language: normLang || 'javascript'
          });
        }
      }
    }
  }

  return discovered;
}

/**
 * 4-Tier Target Function Resolver
 * Resolves whether to auto-target, show picker, or display guidance error.
 */
export function resolveTargetFunction({ selectedCode = '', fullFileContent = '', language = 'javascript' }) {
  const hasSelection = Boolean(selectedCode && selectedCode.trim());

  if (hasSelection) {
    const funcsInSelection = extractFunctions(selectedCode, language);

    if (funcsInSelection.length === 1) {
      return {
        status: 'single',
        source: 'selection',
        targetFunction: funcsInSelection[0],
        functions: funcsInSelection,
        message: `Targeting selected function: ${funcsInSelection[0].signature}`
      };
    }

    if (funcsInSelection.length > 1) {
      return {
        status: 'multiple',
        source: 'selection',
        targetFunction: null,
        functions: funcsInSelection,
        message: 'Multiple functions found in selection. Choose which function to test.'
      };
    }

    // Selected text has no recognized function declaration
    // Check if whole selection might still be a single anonymous expression or single-line arrow
    const trimmedSel = selectedCode.trim();
    if (/^(?:(?:async\s*)?\([^)]*\)\s*=>|function\s*\()/.test(trimmedSel)) {
      const anonFunc = {
        name: 'anonymousFunction',
        parameters: [],
        signature: 'anonymousFunction(...)',
        codeSnippet: trimmedSel,
        startLine: 1,
        endLine: trimmedSel.split('\n').length,
        language
      };
      return {
        status: 'single',
        source: 'selection_anonymous',
        targetFunction: anonFunc,
        functions: [anonFunc],
        message: 'Targeting selected anonymous function expression.'
      };
    }

    return {
      status: 'none',
      source: 'selection',
      targetFunction: null,
      functions: [],
      message: 'Selected code does not contain a recognizable function signature. Please highlight a function definition or select from detected functions in the file.'
    };
  }

  // Fallback: Scan full file content when nothing is selected
  const funcsInFile = extractFunctions(fullFileContent, language);

  if (funcsInFile.length === 1) {
    return {
      status: 'single',
      source: 'file',
      targetFunction: funcsInFile[0],
      functions: funcsInFile,
      message: `Targeting function in active file: ${funcsInFile[0].signature}`
    };
  }

  if (funcsInFile.length > 1) {
    return {
      status: 'multiple',
      source: 'file',
      targetFunction: null,
      functions: funcsInFile,
      message: `Found ${funcsInFile.length} functions in active file. Select the target function to test:`
    };
  }

  return {
    status: 'none',
    source: 'file',
    targetFunction: null,
    functions: [],
    message: 'No function definitions found in active file. Write or open a function definition, or select a function block in the editor to generate test cases.'
  };
}
