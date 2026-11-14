/**
 * aiTestCaseService.js
 * CodeTrail AI Test Case Generation & Analysis Service
 * Lead: Mahi — AI Backend & Model Integration (CT-238 / AI Test Suite)
 *
 * Responsibilities:
 *   1. Accept selected function code from frontend/controller.
 *   2. Identify function name, parameters, and programming language.
 *   3. Analyze function logic, inferred types, and expected behavior.
 *   4. Generate comprehensive test cases covering:
 *      - Normal inputs
 *      - Boundary & edge cases
 *      - Invalid & unexpected inputs
 *      - Determinable expected outputs
 *      - Empty values, null/None, negative numbers, decimals
 *   5. Deduplicate and validate JSON responses, gracefully handling malformed AI outputs.
 */

const axios = require('axios');
const aiService = require('./aiService');

/**
 * Supported language mappings
 */
const LANGUAGE_ALIASES = {
  py: 'python',
  python: 'python',
  js: 'javascript',
  javascript: 'javascript',
  ts: 'typescript',
  typescript: 'typescript',
  jsx: 'javascript',
  tsx: 'typescript',
  java: 'java',
  cpp: 'cpp',
  'c++': 'cpp',
  c: 'c',
  go: 'go',
  golang: 'go',
  rust: 'rust',
  rs: 'rust'
};

/**
 * 1. Heuristic Language Detection from Code Snippet
 */
function detectLanguage(code, hint = '') {
  const normHint = String(hint || '').trim().toLowerCase();
  if (LANGUAGE_ALIASES[normHint]) return LANGUAGE_ALIASES[normHint];

  const trimmed = String(code || '').trim();
  if (/^def\s+\w+\s*\(|:\s*$|elif\s+|None\b|True\b|False\b|print\(/.test(trimmed)) {
    return 'python';
  }
  if (/function\s+\w+\s*\(|=>\s*|const\s+\w+\s*=|let\s+\w+\s*=|console\.log/.test(trimmed)) {
    return 'javascript';
  }
  if (/public\s+static\s+|System\.out\.println|class\s+\w+\s*\{/.test(trimmed)) {
    return 'java';
  }
  if (/#include\s*<|std::cout|int\s+main\s*\(/.test(trimmed)) {
    return 'cpp';
  }
  if (/func\s+\w+\s*\(|package\s+\w+|fmt\.Println/.test(trimmed)) {
    return 'go';
  }
  return 'javascript';
}

/**
 * 2. Analyze Function Signature, Parameters & Logic (Task 3 & 4)
 */
function analyzeFunction(code, languageHint = '') {
  if (!code || typeof code !== 'string' || !code.trim()) {
    throw new Error('Valid code string is required for function analysis.');
  }

  const rawCode = code.trim();
  const language = detectLanguage(rawCode, languageHint);

  let functionName = 'anonymousFunction';
  let parameters = [];
  let isAsync = false;

  if (language === 'python') {
    const pyMatch = rawCode.match(/def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/);
    if (pyMatch) {
      functionName = pyMatch[1];
      const paramStr = pyMatch[2].trim();
      if (paramStr) {
        parameters = paramStr.split(',').map(p => {
          // Strip type annotations (e.g., "num: int = 0" -> "num")
          const clean = p.split('=')[0].split(':')[0].trim();
          return clean;
        }).filter(Boolean);
      }
    }
  } else {
    // JavaScript / TypeScript / Java / Go / C++
    const fnMatch = rawCode.match(/(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/);
    const arrowMatch = rawCode.match(/(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/);
    const arrowSingleParamMatch = rawCode.match(/(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?([a-zA-Z0-9_]+)\s*=>/);
    const methodMatch = rawCode.match(/(?:public|private|static|\w+\s+)?\s*([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*\{/);

    if (fnMatch) {
      functionName = fnMatch[1];
      parameters = parseParamString(fnMatch[2]);
    } else if (arrowMatch) {
      functionName = arrowMatch[1];
      parameters = parseParamString(arrowMatch[2]);
    } else if (arrowSingleParamMatch) {
      functionName = arrowSingleParamMatch[1];
      parameters = [arrowSingleParamMatch[2].trim()];
    } else if (methodMatch && !['if', 'for', 'while', 'switch'].includes(methodMatch[1])) {
      functionName = methodMatch[1];
      parameters = parseParamString(methodMatch[2]);
    }

    if (/\basync\b/.test(rawCode)) isAsync = true;
  }

  // Deduce Expected Behavior & Inferred Types
  const analysis = {
    name: functionName,
    parameters,
    language,
    isAsync,
    expectedBehavior: deduceExpectedBehavior(functionName, parameters, rawCode, language),
    inferredReturnType: deduceReturnType(rawCode, language)
  };

  return analysis;
}

function parseParamString(paramStr) {
  if (!paramStr || !paramStr.trim()) return [];
  return paramStr.split(',').map(p => {
    // Strip default values and types
    let clean = p.split('=')[0].trim();
    if (clean.includes(':')) clean = clean.split(':')[0].trim();
    // Java/C++ type-name: "int number" -> "number"
    const parts = clean.split(/\s+/);
    return parts[parts.length - 1];
  }).filter(p => p && p !== 'self' && p !== 'this');
}

function deduceReturnType(code, language) {
  if (/(?:return\s+)?([a-zA-Z0-9_]+)\s*%\s*2\s*==\s*0/.test(code) ||
      /\b(?:return\s+(?:true|false|True|False))\b/.test(code) ||
      (/===|==|!=|!==|<=|>=|<|>/.test(code) && /return\s+/.test(code))) {
    return 'boolean';
  }
  if (/return\s+\[/.test(code)) return 'array';
  if (/return\s+\{/.test(code)) return 'object';
  if (/return\s+["'`]/.test(code)) return 'string';
  if (/return\s+.*[+\-*/%]/i.test(code) ||
      /return\s+[0-9]/.test(code) ||
      /return\s+.*\b(?:sum|count|length|size|total|price|tax|rate|amount|cost|num|number)\b/i.test(code)) {
    return 'number';
  }
  return 'any';
}

function deduceExpectedBehavior(name, params, code, language) {
  const lowerName = name.toLowerCase();
  const lowerCode = code.toLowerCase();

  if (lowerName.includes('even') || lowerCode.includes('% 2 == 0') || lowerCode.includes('% 2 === 0')) {
    return 'Returns true if the input number is evenly divisible by 2 (even), otherwise false.';
  }
  if (lowerName.includes('odd') || lowerCode.includes('% 2 != 0') || lowerCode.includes('% 2 !== 0')) {
    return 'Returns true if the input number is odd, otherwise false.';
  }
  if (lowerName.includes('sum') || lowerName.includes('add') || lowerCode.includes('return a + b')) {
    return 'Computes and returns the arithmetic sum of the provided numeric arguments.';
  }
  if (lowerName.includes('max') || lowerName.includes('largest')) {
    return 'Determines and returns the maximum value among the inputs.';
  }
  if (lowerName.includes('min') || lowerName.includes('smallest')) {
    return 'Determines and returns the minimum value among the inputs.';
  }
  if (lowerName.includes('reverse')) {
    return 'Reverses the sequence of elements in the given string or array.';
  }
  if (lowerName.includes('palindrome')) {
    return 'Checks whether the string or number reads the same forwards and backwards.';
  }
  if (lowerName.includes('factorial')) {
    return 'Calculates the factorial (n!) of a non-negative integer.';
  }
  return `Executes ${name}(${params.join(', ')}) and returns computed result based on logic.`;
}

/**
 * 3. Deterministic Function Evaluator (For Accurate Expected Output Calculation)
 */
function evaluatePureFunction(code, inputArgs, language) {
  try {
    if (language === 'python') {
      // Check for isEven: number % 2 == 0
      if (/%\s*2\s*==\s*0/.test(code)) {
        const num = inputArgs[0];
        if (typeof num === 'number' && Number.isInteger(num)) {
          return num % 2 === 0;
        }
      }
      // Check for isOdd: number % 2 != 0 or number % 2 == 1
      if (/%\s*2\s*!=\s*0|%\s*2\s*==\s*1/.test(code)) {
        const num = inputArgs[0];
        if (typeof num === 'number' && Number.isInteger(num)) {
          return Math.abs(num % 2) === 1;
        }
      }
      // Check for sum / add: a + b
      if (/return\s+([a-zA-Z0-9_]+)\s*\+\s*([a-zA-Z0-9_]+)/.test(code)) {
        if (inputArgs.length >= 2 && typeof inputArgs[0] === 'number' && typeof inputArgs[1] === 'number') {
          return inputArgs[0] + inputArgs[1];
        }
      }
    } else {
      // JavaScript pure evaluation
      // isEven
      if (/%\s*2\s*===\s*0|%\s*2\s*==\s*0/.test(code)) {
        const num = inputArgs[0];
        if (typeof num === 'number' && Number.isInteger(num)) {
          return num % 2 === 0;
        }
      }
      // isOdd
      if (/%\s*2\s*!==\s*0|%\s*2\s*!=\s*0|%\s*2\s*===\s*1/.test(code)) {
        const num = inputArgs[0];
        if (typeof num === 'number' && Number.isInteger(num)) {
          return Math.abs(num % 2) === 1;
        }
      }
    }
  } catch (e) {
    // If evaluation fails or is non-deterministic
    return null;
  }
  return null;
}

/**
 * 4. Generate Comprehensive Deterministic Test Scenarios (Tasks 5, 6, 7, 8, 9)
 */
function generateHeuristicTestCases(analysis, code) {
  const { name, parameters, language, expectedBehavior } = analysis;
  const testCases = [];
  const lowerName = name.toLowerCase();
  const lowerCode = code.toLowerCase();

  const isNumericSingle = parameters.length === 1 &&
    (lowerName.includes('even') || lowerName.includes('odd') || lowerName.includes('num') ||
     lowerName.includes('fact') || lowerName.includes('prime') || lowerName.includes('square') ||
     lowerCode.includes('number') || lowerCode.includes('%') || lowerCode.includes('*'));

  // Scenario Set A: Single Number input (e.g. isEven, isOdd, factorial, etc.)
  if (isNumericSingle || (parameters.length === 1 && (lowerCode.includes('%') || lowerCode.includes('number')))) {
    // 1. Normal Input: Positive even number
    const normEvenVal = evaluatePureFunction(code, [4], language);
    testCases.push({
      input: [4],
      expectedOutput: normEvenVal !== null ? normEvenVal : true,
      description: 'Positive even number',
      category: 'normal'
    });

    // 2. Normal Input: Positive odd number
    const normOddVal = evaluatePureFunction(code, [5], language);
    testCases.push({
      input: [5],
      expectedOutput: normOddVal !== null ? normOddVal : false,
      description: 'Positive odd number',
      category: 'normal'
    });

    // 3. Boundary / Edge Case: Zero input
    const zeroVal = evaluatePureFunction(code, [0], language);
    testCases.push({
      input: [0],
      expectedOutput: zeroVal !== null ? zeroVal : true,
      description: 'Zero input',
      category: 'boundary'
    });

    // 4. Negative numbers: Negative even number
    const negEvenVal = evaluatePureFunction(code, [-2], language);
    testCases.push({
      input: [-2],
      expectedOutput: negEvenVal !== null ? negEvenVal : true,
      description: 'Negative even number',
      category: 'negative'
    });

    // 5. Negative numbers: Negative odd number
    const negOddVal = evaluatePureFunction(code, [-7], language);
    testCases.push({
      input: [-7],
      expectedOutput: negOddVal !== null ? negOddVal : false,
      description: 'Negative odd number',
      category: 'negative'
    });

    // 6. Decimal values: Floating point number
    testCases.push({
      input: [2.5],
      expectedOutput: false,
      description: 'Decimal value input',
      category: 'decimal'
    });

    // 7. Edge Case: Large boundary integer
    const largeVal = evaluatePureFunction(code, [1000000], language);
    testCases.push({
      input: [1000000],
      expectedOutput: largeVal !== null ? largeVal : true,
      description: 'Large boundary integer',
      category: 'boundary'
    });

    // 8. Invalid-input & Unexpected: String input
    testCases.push({
      input: ['abc'],
      expectedOutput: false,
      description: 'Invalid string input',
      category: 'invalid'
    });

    // 9. Null values: Null input
    testCases.push({
      input: [null],
      expectedOutput: false,
      description: 'Null value input',
      category: 'null'
    });

    // 10. Empty values: Empty string or missing arg
    testCases.push({
      input: [''],
      expectedOutput: false,
      description: 'Empty value input',
      category: 'empty'
    });
  } else if (parameters.length === 2 && (lowerName.includes('add') || lowerName.includes('sum') || lowerCode.includes('+'))) {
    // Scenario Set B: Two numeric arguments (e.g. add(a, b))
    testCases.push({
      input: [10, 20],
      expectedOutput: 30,
      description: 'Normal positive integers',
      category: 'normal'
    });
    testCases.push({
      input: [0, 0],
      expectedOutput: 0,
      description: 'Zero boundary inputs',
      category: 'boundary'
    });
    testCases.push({
      input: [-5, 15],
      expectedOutput: 10,
      description: 'Negative and positive combination',
      category: 'negative'
    });
    testCases.push({
      input: [3.14, 2.86],
      expectedOutput: 6.0,
      description: 'Decimal floating point values',
      category: 'decimal'
    });
    testCases.push({
      input: [null, 5],
      expectedOutput: null,
      description: 'Null first argument handling',
      category: 'null'
    });
    testCases.push({
      input: ['10', 20],
      expectedOutput: null,
      description: 'Invalid string input',
      category: 'invalid'
    });
  } else if (lowerName.includes('string') || lowerCode.includes('.length') || lowerCode.includes('reverse') || lowerCode.includes('slice')) {
    // Scenario Set C: String processing
    testCases.push({
      input: ['CodeTrail'],
      expectedOutput: null,
      description: 'Standard alphanumeric string',
      category: 'normal'
    });
    testCases.push({
      input: [''],
      expectedOutput: '',
      description: 'Empty string boundary',
      category: 'empty'
    });
    testCases.push({
      input: ['a'],
      expectedOutput: 'a',
      description: 'Single character string',
      category: 'boundary'
    });
    testCases.push({
      input: [null],
      expectedOutput: null,
      description: 'Null string input',
      category: 'null'
    });
    testCases.push({
      input: [12345],
      expectedOutput: null,
      description: 'Invalid numeric input for string parameter',
      category: 'invalid'
    });
  } else {
    // Scenario Set D: General multi-parameter / array function
    testCases.push({
      input: parameters.map(() => 1),
      expectedOutput: null,
      description: 'Normal default inputs',
      category: 'normal'
    });
    testCases.push({
      input: parameters.map(() => 0),
      expectedOutput: null,
      description: 'Zero boundary inputs',
      category: 'boundary'
    });
    testCases.push({
      input: parameters.map(() => -1),
      expectedOutput: null,
      description: 'Negative numbers input',
      category: 'negative'
    });
    testCases.push({
      input: parameters.map(() => 1.5),
      expectedOutput: null,
      description: 'Decimal values input',
      category: 'decimal'
    });
    testCases.push({
      input: parameters.map(() => null),
      expectedOutput: null,
      description: 'Null values scenario',
      category: 'null'
    });
    testCases.push({
      input: parameters.map(() => ''),
      expectedOutput: null,
      description: 'Empty values scenario',
      category: 'empty'
    });
    testCases.push({
      input: parameters.map(() => 'unexpected_token'),
      expectedOutput: null,
      description: 'Unexpected type scenario',
      category: 'invalid'
    });
  }

  return testCases;
}

/**
 * 5. Prompt Construction for Cloud AI Model (Task 1, 10, 11)
 */
function buildTestCasePrompt(analysis, code) {
  const { name, parameters, language, expectedBehavior } = analysis;

  return `You are a Principal Software Test Engineer specializing in rigorous test case generation.

Target Function Analysis:
- Function Name: ${name}
- Parameters: [${parameters.join(', ')}]
- Language: ${language}
- Inferred Logic/Behavior: ${expectedBehavior}

Function Implementation:
\`\`\`${language}
${code}
\`\`\`

Tasks:
1. Analyze the function's logic and expected behavior.
2. Generate comprehensive test cases covering:
   - Normal valid inputs
   - Boundary & edge cases (0, limits, empty strings/arrays)
   - Invalid & unexpected input types
   - Negative numbers (where applicable)
   - Decimal values (where applicable)
   - Null / None / Empty scenarios
3. Determine accurate expectedOutput for deterministic pure logic.
4. Output STRICT JSON ONLY. Do not wrap in markdown quotes if possible, or use standard \`\`\`json block.
5. Format must be an array of objects matching:
[
  {
    "input": [<arguments in exact order>],
    "expectedOutput": <expected output value or null if error/indeterminate>,
    "description": "<scenario explanation>",
    "category": "<normal|boundary|edge|invalid|empty|null|negative|decimal>"
  }
]`;
}

/**
 * 6. Validate & Deduplicate Generated Test Cases (Task 11 & 12)
 */
function validateAndCleanTestCases(rawCases, fallbackCases = []) {
  let cases = Array.isArray(rawCases) ? rawCases : [];

  if (cases.length === 0 && fallbackCases.length > 0) {
    cases = fallbackCases;
  }

  const seenSignatures = new Set();
  const cleaned = [];

  for (const item of cases) {
    if (!item || typeof item !== 'object') continue;

    // Normalize input array
    let input = item.input;
    if (!Array.isArray(input)) {
      if (input !== undefined) input = [input];
      else continue;
    }

    // Deduplication signature (Task 12)
    const signature = JSON.stringify(input);
    if (seenSignatures.has(signature)) continue;
    seenSignatures.add(signature);

    const description = String(item.description || item.name || 'Test case scenario').trim();
    const category = String(item.category || 'general').trim().toLowerCase();
    const expectedOutput = item.expectedOutput !== undefined ? item.expectedOutput : null;

    cleaned.push({
      input,
      expectedOutput,
      description,
      category
    });
  }

  // Ensure minimum test coverage
  if (cleaned.length === 0 && fallbackCases.length > 0) {
    return fallbackCases;
  }

  return cleaned;
}

/**
 * 7. Parse AI JSON Response Safely (Task 11)
 */
function parseAIResponseJSON(aiText) {
  if (!aiText || typeof aiText !== 'string') return null;

  try {
    // 1. Direct JSON parse
    return JSON.parse(aiText.trim());
  } catch (e) {
    // 2. Extract from markdown code fences ```json ... ```
    const jsonBlockMatch = aiText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      try {
        return JSON.parse(jsonBlockMatch[1].trim());
      } catch (innerErr) {}
    }

    // 3. Extract array bracket region [...]
    const arrayMatch = aiText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0].trim());
      } catch (innerErr) {}
    }
  }

  return null;
}

/**
 * 8. Primary Exported Service Function: Generate Test Cases
 */
async function generateTestCasesForFunction({ code, language = '', context = {}, user = null }) {
  // Step A: Parse and analyze function
  const functionAnalysis = analyzeFunction(code, language || context?.language);

  // Step B: Build deterministic fallback test suite (guaranteed resilience)
  const heuristicCases = generateHeuristicTestCases(functionAnalysis, code);

  let finalTestCases = heuristicCases;
  let providerUsed = 'local-engine';
  let modelUsed = 'codetrail-test-generator-v1';

  // Step C: Attempt AI cloud model generation if configured
  try {
    const prompt = buildTestCasePrompt(functionAnalysis, code);
    const aiResult = await aiService.generateAIResponse({
      message: prompt,
      context: {
        fileName: context?.fileName || `${functionAnalysis.name}.${functionAnalysis.language === 'python' ? 'py' : 'js'}`,
        language: functionAnalysis.language,
        content: code
      },
      actionType: 'tests',
      user
    });

    if (aiResult && aiResult.response) {
      const parsed = parseAIResponseJSON(aiResult.response);
      if (Array.isArray(parsed) && parsed.length > 0) {
        finalTestCases = validateAndCleanTestCases(parsed, heuristicCases);
        providerUsed = aiResult.provider || 'gemini';
        modelUsed = aiResult.model || 'gemini-1.5-flash';
      }
    }
  } catch (aiErr) {
    console.warn('[CodeTrail AI Test Generator] Cloud AI model failed, using deterministic test suite:', aiErr.message);
  }

  // Final validation and deduplication
  finalTestCases = validateAndCleanTestCases(finalTestCases, heuristicCases);

  // Format canonical markdown response for UI AssistantPanel
  const markdownTable = formatTestCasesMarkdown(functionAnalysis, finalTestCases);

  return {
    success: true,
    functionAnalysis,
    testCases: finalTestCases,
    totalCases: finalTestCases.length,
    provider: providerUsed,
    model: modelUsed,
    response: markdownTable,
    message: markdownTable
  };
}

/**
 * Format structured test cases into clean markdown for display in AssistantPanel & reports
 */
function formatTestCasesMarkdown(analysis, testCases) {
  const isPy = analysis.language === 'python';
  const isJs = analysis.language === 'javascript' || analysis.language === 'typescript';
  const langBlock = isPy ? 'python' : isJs ? 'javascript' : analysis.language;

  let md = `### 🧪 AI-GENERATED TEST SUITE: \`${analysis.name}(${analysis.parameters.join(', ')})\`\n\n`;
  md += `**Language:** \`${analysis.language}\` | **Parameters:** \`${analysis.parameters.length > 0 ? analysis.parameters.join(', ') : 'none'}\`\n\n`;
  md += `**Behavior:** ${analysis.expectedBehavior}\n\n`;
  
  // 1. Structured Scenario Table
  md += `#### Test Scenarios Breakdown\n\n`;
  md += `| # | Input | Expected Output | Category | Scenario |\n`;
  md += `|---|---|---|---|---|\n`;

  testCases.forEach((tc, idx) => {
    const inputStr = JSON.stringify(tc.input);
    const outStr = tc.expectedOutput !== null ? JSON.stringify(tc.expectedOutput) : '`indeterminate`';
    const cat = tc.category || 'normal';
    md += `| ${idx + 1} | \`${inputStr}\` | \`${outStr}\` | **${cat}** | ${tc.description} |\n`;
  });

  // 2. Runnable Test Suite Code Block
  md += `\n#### Runnable Test Specifications\n\n`;
  md += `\`\`\`${langBlock}\n`;
  if (isPy) {
    testCases.forEach((tc, idx) => {
      const args = tc.input.map(arg => typeof arg === 'string' ? `"${arg}"` : JSON.stringify(arg)).join(', ');
      const funcCall = `${analysis.name}(${args})`;
      const descClean = (tc.description || `Case ${idx + 1}`).replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      md += `def test_${descClean}_${idx + 1}():\n`;
      if (tc.expectedOutput !== null && tc.expectedOutput !== undefined) {
        md += `    assert ${funcCall} == ${JSON.stringify(tc.expectedOutput)}\n\n`;
      } else {
        md += `    # Verify behavior for scenario: ${tc.description}\n`;
        md += `    try:\n        result = ${funcCall}\n        assert result is not None\n    except Exception as e:\n        pass\n\n`;
      }
    });
  } else {
    md += `describe('${analysis.name} Unit Tests', () => {\n`;
    testCases.forEach((tc) => {
      const args = tc.input.map(arg => typeof arg === 'string' ? `"${arg}"` : JSON.stringify(arg)).join(', ');
      const funcCall = `${analysis.name}(${args})`;
      md += `  it('Test Case: ${tc.description}', () => {\n`;
      if (tc.expectedOutput !== null && tc.expectedOutput !== undefined) {
        md += `    expect(${funcCall}).toEqual(${JSON.stringify(tc.expectedOutput)});\n`;
      } else {
        md += `    expect(() => ${funcCall}).not.toThrow();\n`;
      }
      md += `  });\n`;
    });
    md += `});\n`;
  }
  md += `\`\`\`\n\n`;

  // 3. Structured JSON for API Consumers & Visual Runners
  md += `**Structured JSON:**\n\`\`\`json\n${JSON.stringify(testCases, null, 2)}\n\`\`\`\n`;

  return md;
}

module.exports = {
  detectLanguage,
  analyzeFunction,
  buildTestCasePrompt,
  generateHeuristicTestCases,
  validateAndCleanTestCases,
  parseAIResponseJSON,
  generateTestCasesForFunction,
  formatTestCasesMarkdown
};
