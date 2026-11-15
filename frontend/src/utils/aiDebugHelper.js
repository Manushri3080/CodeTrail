/**
 * aiDebugHelper.js
 * CodeTrail AI Debugging & Advanced Analysis Utilities
 * Lead: Rishika (Frontend / Integration Lead)
 *
 * Core Capabilities:
 *   1. Multi-language stack trace line extraction (Python, JS/TS, C++, Java, Rust, Go).
 *   2. Error type classifier and problem summarization.
 *   3. Performance & algorithmic analysis parser (complexity, inefficient loops, redundant operations).
 *   4. Test failure explanation context builder and analyzer.
 *   5. Diff metrics calculator (additions, deletions, modifications).
 */

/**
 * Extracts line number from error message or stack trace across multiple languages.
 * @param {string} text - Error output, stderr, or compile output.
 * @returns {number|null} 1-based line number or null if not found.
 */
export function extractErrorLineFromText(text) {
  if (!text || typeof text !== 'string') return null;

  // 1. Python traceback: File "...", line 12, in <module>
  const pyMatch = text.match(/File\s+["'][^"']+["'],\s+line\s+(\d+)/i);
  if (pyMatch) return parseInt(pyMatch[1], 10);

  // Python general: line 12
  const pyGenMatch = text.match(/\bline\s+(\d+)\b/i);
  if (pyGenMatch) return parseInt(pyGenMatch[1], 10);

  // 2. JavaScript / Node.js: at Object.<anonymous> (/path/to/file.js:12:34)
  const jsMatch = text.match(/:\s*(\d+):(?:\d+)/);
  if (jsMatch) return parseInt(jsMatch[1], 10);

  // 3. C/C++ compiler: file.cpp:12:5: error: ...
  const cppMatch = text.match(/\.[a-zA-Z0-9]+:(\d+):\d+:\s*(?:fatal\s+)?error/i);
  if (cppMatch) return parseInt(cppMatch[1], 10);

  // 4. Java: at Main.main(Main.java:12)
  const javaMatch = text.match(/\.java:(\d+)\)/i);
  if (javaMatch) return parseInt(javaMatch[1], 10);

  // 5. Rust: --> src/main.rs:12:5
  const rustMatch = text.match(/-->\s*[^:\n]+:(\d+):\d+/i);
  if (rustMatch) return parseInt(rustMatch[1], 10);

  // 6. Go: ./main.go:12:5: undefined: x
  const goMatch = text.match(/\.go:(\d+):\d+:/i);
  if (goMatch) return parseInt(goMatch[1], 10);

  return null;
}

/**
 * Parses and identifies the error category and type from an error message.
 * @param {string} text - Error message or stack trace.
 * @param {string} defaultType - Fallback error type.
 * @returns {string} Error classification name.
 */
export function parseErrorTypeFromText(text, defaultType = 'RuntimeError') {
  if (!text || typeof text !== 'string') return defaultType;

  const patterns = [
    { type: 'ZeroDivisionError', regex: /ZeroDivisionError|division by zero/i },
    { type: 'NameError', regex: /NameError|name '[^']+' is not defined/i },
    { type: 'SyntaxError', regex: /SyntaxError|invalid syntax|expected ';'|expected ':'/i },
    { type: 'TypeError', regex: /TypeError|cannot read propert|is not a function|unsupported operand/i },
    { type: 'ReferenceError', regex: /ReferenceError|is not defined/i },
    { type: 'IndexError', regex: /IndexError|list index out of range|index out of bounds/i },
    { type: 'KeyError', regex: /KeyError/i },
    { type: 'ValueError', regex: /ValueError|invalid literal/i },
    { type: 'AttributeError', regex: /AttributeError|has no attribute/i },
    { type: 'TimeoutError', regex: /TimeoutError|timed out|execution timed out|SIGKILL/i },
    { type: 'NullPointerException', regex: /NullPointerException/i },
    { type: 'CompilationError', regex: /compilat(?:ion)? error|fatal error|undefined reference/i },
    { type: 'RecursionError', regex: /RecursionError|maximum recursion depth exceeded|Maximum call stack size exceeded/i }
  ];

  for (const p of patterns) {
    if (p.regex.test(text)) {
      return p.type;
    }
  }

  return defaultType;
}

/**
 * Extracts fenced code block from AI markdown response.
 * @param {string} markdown - Full markdown string.
 * @returns {string|null} Extracted code or null.
 */
export function extractCodeBlock(markdown) {
  if (!markdown || typeof markdown !== 'string') return null;
  const match = markdown.match(/```[a-zA-Z0-9_-]*\r?\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

/**
 * Calculates diff statistics between original code and AI proposed fix.
 * @param {string} original - Original source code.
 * @param {string} modified - Proposed corrected source code.
 * @returns {{ linesAdded: number, linesRemoved: number, linesModified: number, hasDifferences: boolean }}
 */
export function calculateDiffStats(original = '', modified = '') {
  const origLines = String(original || '').split('\n');
  const modLines = String(modified || '').split('\n');

  if (original.trim() === modified.trim()) {
    return { linesAdded: 0, linesRemoved: 0, linesModified: 0, hasDifferences: false };
  }

  const origSet = new Set(origLines.map(l => l.trim()));
  const modSet = new Set(modLines.map(l => l.trim()));

  let linesAdded = 0;
  let linesRemoved = 0;

  for (const line of modLines) {
    if (!origSet.has(line.trim())) linesAdded++;
  }
  for (const line of origLines) {
    if (!modSet.has(line.trim())) linesRemoved++;
  }

  return {
    linesAdded,
    linesRemoved,
    linesModified: Math.abs(modLines.length - origLines.length),
    hasDifferences: linesAdded > 0 || linesRemoved > 0 || original !== modified
  };
}

/**
 * Validates that proposed code preserves the original code's structure,
 * function names, variable names, parameters, and surrounding implementation.
 * Guards against the AI replacing the user's code with an unrelated textbook algorithm.
 *
 * @param {string} originalCode - Original source code.
 * @param {string} proposedCode - Proposed corrected or optimized source code.
 * @returns {{
 *   isPreserved: boolean,
 *   hasPreservedSignatures: boolean,
 *   reason: string,
 *   preservedSymbols: string[],
 *   missingSymbols: string[],
 *   originalSymbolCount: number
 * }}
 */
export function validateCodePreservation(originalCode = '', proposedCode = '') {
  const orig = String(originalCode || '').trim();
  const prop = String(proposedCode || '').trim();

  if (!orig) {
    return {
      isPreserved: true,
      hasPreservedSignatures: true,
      reason: 'No original code context provided to validate against.',
      preservedSymbols: [],
      missingSymbols: [],
      originalSymbolCount: 0
    };
  }

  if (!prop) {
    return {
      isPreserved: false,
      hasPreservedSignatures: false,
      reason: 'Proposed code is empty.',
      preservedSymbols: [],
      missingSymbols: [],
      originalSymbolCount: 0
    };
  }

  // Extract function and class names from original code
  // JS/TS: function foo(, const foo = (, let foo = (, class Foo
  // Python: def foo(, class Foo:
  // Java/C++/Go/Rust: void foo(, int foo(, fn foo(
  const symbolRegex = /(?:def\s+([A-Za-z0-9_]+)|function\s+([A-Za-z0-9_$]+)|(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>|class\s+([A-Za-z0-9_$]+)|fn\s+([A-Za-z0-9_]+)|func\s+([A-Za-z0-9_]+)|(?:public|private|protected|static|\s)+\s+[A-Za-z0-9_<>[\]]+\s+([A-Za-z0-9_]+)\s*\()/g;

  const originalSymbols = new Set();
  let match;
  while ((match = symbolRegex.exec(orig)) !== null) {
    const sym = match[1] || match[2] || match[3] || match[4] || match[5] || match[6] || match[7];
    if (sym && !['if', 'for', 'while', 'switch', 'catch', 'return'].includes(sym)) {
      originalSymbols.add(sym);
    }
  }

  const origSymbolsList = Array.from(originalSymbols);
  const preservedSymbols = [];
  const missingSymbols = [];

  for (const sym of origSymbolsList) {
    const symWordRegex = new RegExp(`\\b${sym}\\b`);
    if (symWordRegex.test(prop)) {
      preservedSymbols.push(sym);
    } else {
      missingSymbols.push(sym);
    }
  }

  // Check line count ratio (if proposed code drastically drops 80%+ of original lines)
  const origLines = orig.split('\n').filter(l => l.trim().length > 0).length;
  const propLines = prop.split('\n').filter(l => l.trim().length > 0).length;
  const isSevereTruncation = origLines >= 10 && propLines < Math.max(3, Math.floor(origLines * 0.25));

  // Determine preservation status
  let isPreserved = true;
  let reason = 'Original code structure, variable names, and function signatures are preserved.';

  if (origSymbolsList.length > 0 && missingSymbols.length > 0) {
    // If half or more of original functions/classes are missing, flag as replacement
    if (missingSymbols.length >= Math.ceil(origSymbolsList.length / 2)) {
      isPreserved = false;
      reason = `Proposed code fails preservation check: missing original functions/classes: ${missingSymbols.join(', ')}.`;
    }
  } else if (isSevereTruncation) {
    isPreserved = false;
    reason = `Proposed code appears to be an isolated snippet rather than full preserved code (${propLines} lines vs ${origLines} lines in original).`;
  }

  return {
    isPreserved,
    hasPreservedSignatures: missingSymbols.length === 0,
    reason,
    preservedSymbols,
    missingSymbols,
    originalSymbolCount: origSymbolsList.length
  };
}

/**
 * Extracts structured optimization sections: Problematic Section,
 * Optimized Replacement, Complexity Evolution, and Full Preserved Code.
 *
 * @param {string} markdown - Full AI response markdown.
 * @param {string} originalCode - Original source code for in-place surgical replacement.
 * @returns {object} Structured optimization sections.
 */
export function extractOptimizationSections(markdown = '', originalCode = '') {
  const content = String(markdown || '');
  const orig = String(originalCode || '');

  // 1. Detect if code is already optimal
  const isOptimal = /already optimal|well-structured and optimal|no changes are required|no critical bottlenecks|no quadratic loops/i.test(content) &&
                    !/severe|critical bottleneck|O\(n\^2\)/i.test(content);

  // 2. Extract complexities: Current and Suggested
  let currentComplexity = null;
  let suggestedComplexity = null;

  const currentCompMatch = content.match(/Current:\s*(O\([a-zA-Z0-9\s*+^]+\))/i);
  if (currentCompMatch) currentComplexity = currentCompMatch[1];

  const suggestedCompMatch = content.match(/Suggested:\s*(O\([a-zA-Z0-9\s*+^]+\))/i);
  if (suggestedCompMatch) suggestedComplexity = suggestedCompMatch[1];

  const allComplexities = Array.from(new Set(content.match(/O\([a-zA-Z0-9\s*+^]+\)/g) || []));
  if (!currentComplexity && allComplexities.length > 0) {
    currentComplexity = allComplexities[0];
    if (allComplexities.length > 1) suggestedComplexity = allComplexities[1];
  }

  // 3. Extract Bottleneck description
  let bottleneck = null;
  const bottleneckMatch = content.match(/(?:Bottleneck:\*\*|\*\*Bottleneck:\*\*|\bBottleneck:)\s*([^\n\r]+)/i);
  if (bottleneckMatch) {
    bottleneck = bottleneckMatch[1].trim();
  } else if (/nested loop|quadratic/i.test(content)) {
    bottleneck = 'Nested loop iteration performing repeated quadratic scans';
  } else if (/redundant/i.test(content)) {
    bottleneck = 'Redundant repeated computations or duplicate operations';
  }

  // 4. Extract Problematic Section & Optimized Replacement snippets
  let problematicSection = null;
  const probMatch = content.match(/###\s*(?:Problematic Section|Problematic Code|Inefficient Code)[^\n]*\r?\n```[a-zA-Z0-9_-]*\r?\n([\s\S]*?)```/i);
  if (probMatch) problematicSection = probMatch[1].trim();

  let optimizedReplacement = null;
  const optMatch = content.match(/###\s*(?:Optimized Replacement|Proposed Replacement|Improved Section)[^\n]*\r?\n```[a-zA-Z0-9_-]*\r?\n([\s\S]*?)```/i);
  if (optMatch) optimizedReplacement = optMatch[1].trim();

  // 5. Extract Complete Preserved Code block
  let fullPreservedCode = null;
  const fullMatch = content.match(/###\s*(?:Complete Preserved Code|Preserved Code|Full Preserved Source)[^\n]*\r?\n```[a-zA-Z0-9_-]*\r?\n([\s\S]*?)```/i);
  if (fullMatch) {
    fullPreservedCode = fullMatch[1].trim();
  }

  // 6. Safe synthesized code:
  // If fullPreservedCode is missing or fails validation, but we have problematicSection and optimizedReplacement,
  // we can safely surgically apply optimizedReplacement to originalCode!
  if (!fullPreservedCode && problematicSection && optimizedReplacement && orig) {
    if (orig.includes(problematicSection)) {
      fullPreservedCode = orig.replace(problematicSection, optimizedReplacement);
    }
  }

  // Fallback: If no code block extracted yet, extract first fenced code block
  if (!fullPreservedCode) {
    const generalBlock = extractCodeBlock(content);
    if (generalBlock) {
      const validation = validateCodePreservation(orig, generalBlock);
      if (validation.isPreserved || !orig) {
        fullPreservedCode = generalBlock;
      }
    }
  }

  if (isOptimal && !fullPreservedCode && orig) {
    fullPreservedCode = orig;
  }

  const validation = validateCodePreservation(orig, fullPreservedCode || orig);

  return {
    isOptimal,
    bottleneck: bottleneck || (isOptimal ? 'None detected (code is optimal)' : 'Algorithmic performance bottleneck'),
    currentComplexity: currentComplexity || (isOptimal ? 'O(n)' : 'O(n^2)'),
    suggestedComplexity: suggestedComplexity || 'O(n)',
    complexities: allComplexities,
    problematicSection,
    optimizedReplacement,
    fullPreservedCode: fullPreservedCode || orig,
    validation
  };
}

/**
 * Parses a performance & algorithmic review response into structured diagnostic blocks.
 * @param {string} text - AI response markdown.
 * @param {string} [originalCode=''] - Original source code to validate preservation.
 * @returns {object} Structured performance diagnostics.
 */
export function parsePerformanceReview(text = '', originalCode = '') {
  const content = String(text || '');
  const sections = extractOptimizationSections(content, originalCode);

  // Inefficient loops detection
  const hasInefficientLoop = /nested loop|O\(n\^2\)|quadratic|redundant iteration|repeated scan|nested iteration/i.test(content);
  // Redundant operations detection
  const hasRedundantOps = /redundant|unnecessary|repeated computation|duplicate (?:call|lookup)|recalculat/i.test(content);
  // Memory or cache opportunity
  const hasCachingOpportunity = /memoiz|cache|hash\s*(?:map|table|set)|lookup table/i.test(content);

  // Extract severity level
  let severity = 'MEDIUM';
  if (/\[CRITICAL\]|critical bottleneck|infinite loop|severe slowdown/i.test(content)) {
    severity = 'CRITICAL';
  } else if (/\[HIGH\]|O\(n\^2\)|exponential|heavy recalculation/i.test(content)) {
    severity = 'HIGH';
  } else if (/\[LOW\]|minor optimization|micro-benchmark|readability/i.test(content)) {
    severity = 'LOW';
  } else if (sections.isOptimal || /\[OPTIMAL\]/i.test(content)) {
    severity = 'OPTIMAL';
  }

  // Extract suggested optimized code snippet if present
  const generalCodeBlock = extractCodeBlock(content);
  const suggestedCode = sections.fullPreservedCode || generalCodeBlock;

  return {
    rawMarkdown: content,
    complexities: sections.complexities,
    hasInefficientLoop,
    hasRedundantOps,
    hasCachingOpportunity,
    severity,
    suggestedCode,
    // Enhanced structured fields:
    isOptimal: sections.isOptimal,
    bottleneck: sections.bottleneck,
    currentComplexity: sections.currentComplexity,
    suggestedComplexity: sections.suggestedComplexity,
    problematicSection: sections.problematicSection,
    optimizedReplacement: sections.optimizedReplacement,
    fullPreservedCode: sections.fullPreservedCode,
    validation: sections.validation
  };
}

/**
 * Builds structured context for explaining test case failures.
 * @param {object} params
 * @param {object} params.testCase - The failed test case.
 * @param {object} [params.targetFunction] - Function metadata.
 * @param {string} params.sourceCode - Full source code.
 * @param {string} params.language - Language.
 * @returns {{ prompt: string, expectedFormatted: string, actualFormatted: string }}
 */
export function formatTestFailureContext({
  testCase,
  targetFunction,
  sourceCode = '',
  language = 'javascript'
}) {
  const fnName = targetFunction?.name || 'target function';
  const inputStr = typeof testCase?.input === 'object' ? JSON.stringify(testCase.input) : String(testCase?.input ?? '');
  const expectedStr = typeof testCase?.expectedOutput === 'object' ? JSON.stringify(testCase.expectedOutput) : String(testCase?.expectedOutput ?? '');
  const actualStr = typeof testCase?.actualOutput === 'object'
    ? JSON.stringify(testCase.actualOutput)
    : String(testCase?.actualOutput ?? testCase?.actualRaw ?? 'null');

  const prompt = `TEST CASE FAILURE ANALYSIS:
The automated test case for function "${fnName}" (${language}) failed.

[TEST CASE DETAILS]
- Description: ${testCase?.description || testCase?.scenario || 'Standard scenario'}
- Input: ${inputStr}
- Expected Output: ${expectedStr}
- Actual Output: ${actualStr}
${testCase?.errorDetails ? `- Runtime Error Details: ${testCase.errorDetails}` : ''}

[SOURCE CODE]
\`\`\`${language}
${sourceCode}
\`\`\`

TASK:
1. Explain the root cause of why the actual output did not match the expected output.
2. Identify whether this is an off-by-one error, missing edge-case check, incorrect boundary condition, or logic bug.
3. Provide the corrected, working code for the function in a fenced code block so it passes this test case.`;

  return {
    prompt,
    functionName: fnName,
    expectedFormatted: expectedStr,
    actualFormatted: actualStr
  };
}
