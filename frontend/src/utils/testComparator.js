/**
 * testComparator.js
 * CodeTrail Test Output Comparator & Status Classifier
 *
 * Implements type-preserving deep equality comparison, floating-point tolerance,
 * explicit exception verification, and execution delimiter parsing.
 */

export const DELIMITERS = {
  OUTPUT_START: '__CODETRAIL_TEST_OUTPUT_START__',
  OUTPUT_END: '__CODETRAIL_TEST_OUTPUT_END__',
  ERROR_START: '__CODETRAIL_TEST_ERROR_START__',
  ERROR_END: '__CODETRAIL_TEST_ERROR_END__'
};

/**
 * Deep equality check with type-preservation and floating-point tolerance
 */
export function compareValues(actual, expected) {
  // 1. Strict equality check
  if (actual === expected) {
    return true;
  }

  // 2. Both null or undefined
  if ((actual === null || actual === undefined) && (expected === null || expected === undefined)) {
    return true;
  }

  // If one is null/undefined and the other is not
  if (actual === null || actual === undefined || expected === null || expected === undefined) {
    return false;
  }

  // 3. Floating-point comparison with epsilon tolerance (1e-9)
  if (typeof actual === 'number' && typeof expected === 'number') {
    if (Number.isNaN(actual) && Number.isNaN(expected)) return true;
    return Math.abs(actual - expected) < 1e-9;
  }

  // 4. Boolean type preservation (do not equate 1 with true or "" with false)
  if (typeof actual === 'boolean' || typeof expected === 'boolean') {
    return actual === expected;
  }

  // 5. String comparison with newline normalization
  if (typeof actual === 'string' && typeof expected === 'string') {
    const normActual = actual.replace(/\r\n/g, '\n').trimEnd();
    const normExpected = expected.replace(/\r\n/g, '\n').trimEnd();
    return normActual === normExpected;
  }

  // 6. Array comparison (deep equality, respecting length and order)
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) return false;
    for (let i = 0; i < actual.length; i++) {
      if (!compareValues(actual[i], expected[i])) return false;
    }
    return true;
  }

  // 7. Object comparison (deep recursive key/value equality)
  if (typeof actual === 'object' && typeof expected === 'object') {
    if (Array.isArray(actual) !== Array.isArray(expected)) return false;

    const actualKeys = Object.keys(actual).sort();
    const expectedKeys = Object.keys(expected).sort();

    if (actualKeys.length !== expectedKeys.length) return false;
    for (let i = 0; i < actualKeys.length; i++) {
      const key = actualKeys[i];
      if (key !== expectedKeys[i]) return false;
      if (!compareValues(actual[key], expected[key])) return false;
    }
    return true;
  }

  return false;
}

/**
 * Parse sandbox execution results using boundary delimiters
 * Extracts output/error payloads while preserving developer console logs.
 */
export function parseExecutionOutput(stdout = '', stderr = '', compileOutput = '', isCompileError = false, isTimeout = false) {
  const result = {
    hasOutput: false,
    hasError: false,
    rawOutput: null,
    parsedOutput: null,
    errorPayload: null,
    consoleLogs: [],
    isCompileError: Boolean(isCompileError),
    isTimeout: Boolean(isTimeout)
  };

  if (isTimeout) {
    result.hasError = true;
    result.errorPayload = {
      message: 'Execution timed out (process exceeded maximum limit)',
      type: 'TimeoutError'
    };
    return result;
  }

  if (isCompileError) {
    result.hasError = true;
    result.errorPayload = {
      message: (compileOutput || stderr || 'Compilation failed').trim(),
      type: 'CompileError'
    };
    return result;
  }

  const combinedStdout = String(stdout || '');

  // 1. Check for Delimited Error
  if (combinedStdout.includes(DELIMITERS.ERROR_START)) {
    const errorPattern = new RegExp(`${DELIMITERS.ERROR_START}\\s*([\\s\\S]*?)\\s*${DELIMITERS.ERROR_END}`);
    const errorMatch = combinedStdout.match(errorPattern);
    if (errorMatch) {
      result.hasError = true;
      try {
        result.errorPayload = JSON.parse(errorMatch[1].trim());
      } catch (_e) {
        result.errorPayload = { message: errorMatch[1].trim(), type: 'RuntimeError' };
      }
    }
  }

  // 2. Check for Delimited Output
  if (combinedStdout.includes(DELIMITERS.OUTPUT_START)) {
    const outputPattern = new RegExp(`${DELIMITERS.OUTPUT_START}\\s*([\\s\\S]*?)\\s*${DELIMITERS.OUTPUT_END}`);
    const outputMatch = combinedStdout.match(outputPattern);
    if (outputMatch) {
      result.hasOutput = true;
      const rawCaptured = outputMatch[1].trim();
      result.rawOutput = rawCaptured;

      if (rawCaptured === '__CODETRAIL_UNDEFINED__') {
        result.parsedOutput = undefined;
      } else {
        try {
          result.parsedOutput = JSON.parse(rawCaptured);
        } catch (_e) {
          // If not strict JSON, fallback to raw string/number/boolean parsing
          if (rawCaptured === 'true') result.parsedOutput = true;
          else if (rawCaptured === 'false') result.parsedOutput = false;
          else if (rawCaptured === 'null') result.parsedOutput = null;
          else if (!Number.isNaN(Number(rawCaptured)) && rawCaptured !== '') result.parsedOutput = Number(rawCaptured);
          else result.parsedOutput = rawCaptured;
        }
      }
    }
  }

  // 3. Extract extraneous console logs outside delimiters
  const cleanLines = combinedStdout
    .replace(new RegExp(`${DELIMITERS.OUTPUT_START}[\\s\\S]*?${DELIMITERS.OUTPUT_END}`, 'g'), '')
    .replace(new RegExp(`${DELIMITERS.ERROR_START}[\\s\\S]*?${DELIMITERS.ERROR_END}`, 'g'), '')
    .split('\n')
    .map(l => l.trimEnd())
    .filter(Boolean);

  result.consoleLogs = cleanLines;

  // 4. Fallback if no delimiter found but stderr contains crash trace
  if (!result.hasOutput && !result.hasError) {
    if (stderr && stderr.trim()) {
      result.hasError = true;
      result.errorPayload = {
        message: stderr.trim(),
        type: 'RuntimeError'
      };
    } else if (cleanLines.length > 0) {
      // Last-ditch: entire line was printed without harness
      const lastLine = cleanLines[cleanLines.length - 1];
      result.hasOutput = true;
      result.rawOutput = lastLine;
      try {
        result.parsedOutput = JSON.parse(lastLine);
      } catch (_e) {
        result.parsedOutput = lastLine;
      }
    }
  }

  return result;
}

/**
 * Format a human-readable visual diff between actual and expected results
 */
export function formatDiff(actual, expected) {
  const actualStr = actual === undefined ? 'undefined' : JSON.stringify(actual, null, 2);
  const expectedStr = expected === undefined ? 'undefined' : JSON.stringify(expected, null, 2);

  if (actualStr === expectedStr) {
    return 'Values match identically.';
  }

  return `Expected: ${expectedStr}\nActual:   ${actualStr}`;
}

/**
 * Evaluates an executed test case against its expected output and returns the final status.
 * Adheres strictly to the mandatory requirement:
 * "Expected exceptions must use an explicit expected-exception structure. Never classify an
 *  exception as PASSED simply because its category is invalid or its expected output contains
 *  the word 'error'."
 *
 * @param {Object} executionResult - Output from execution API ({ stdout, stderr, compileOutput, isCompileError, isTimeout, exitCode })
 * @param {Object} testCase - Test case specification ({ expectedOutput, expectException, expectedError, ... })
 * @returns {Object} { status: 'PASSED'|'FAILED'|'ERROR', actualOutput, actualRaw, diff, errorDetails, executionTimeMs }
 */
export function evaluateTestCase(executionResult = {}, testCase = {}) {
  const { stdout = '', stderr = '', compileOutput = '', isCompileError = false, isTimeout = false, executionTimeMs = 0 } = executionResult;
  const parsedExec = parseExecutionOutput(stdout, stderr, compileOutput, isCompileError, isTimeout);

  // Explicit exception expectation check
  const isExplicitExceptionExpected = Boolean(
    testCase.expectException === true ||
    (testCase.expectedOutput && typeof testCase.expectedOutput === 'object' && (testCase.expectedOutput.__throws === true || testCase.expectedOutput.expectError === true)) ||
    (testCase.expectedError && typeof testCase.expectedError === 'object')
  );

  // 1. Compilation Error
  if (parsedExec.isCompileError) {
    return {
      status: 'ERROR',
      category: 'Compilation Error',
      actualOutput: null,
      actualRaw: parsedExec.errorPayload?.message || 'Compilation failed',
      diff: null,
      errorDetails: parsedExec.errorPayload?.message || compileOutput || 'Compiler diagnostics reported errors',
      consoleLogs: parsedExec.consoleLogs,
      executionTimeMs
    };
  }

  // 2. Timeout
  if (parsedExec.isTimeout) {
    return {
      status: 'ERROR',
      category: 'Timeout Error',
      actualOutput: null,
      actualRaw: 'Process timed out',
      diff: null,
      errorDetails: 'Execution exceeded maximum runtime limit (6000ms). Infinite loop or hanging process terminated.',
      consoleLogs: parsedExec.consoleLogs,
      executionTimeMs
    };
  }

  // 3. Runtime Error / Exception
  if (parsedExec.hasError) {
    // If and ONLY IF an explicit exception was expected by contract:
    if (isExplicitExceptionExpected) {
      const expectedErrorObj = testCase.expectedError || (typeof testCase.expectedOutput === 'object' ? testCase.expectedOutput : {});
      let matches = true;

      if (expectedErrorObj.message) {
        matches = String(parsedExec.errorPayload?.message || '').toLowerCase().includes(String(expectedErrorObj.message).toLowerCase());
      }
      if (expectedErrorObj.type) {
        matches = matches && String(parsedExec.errorPayload?.type || '').toLowerCase() === String(expectedErrorObj.type).toLowerCase();
      }

      if (matches) {
        return {
          status: 'PASSED',
          actualOutput: `[Expected Exception Caught]: ${parsedExec.errorPayload?.message || 'Error'}`,
          actualRaw: JSON.stringify(parsedExec.errorPayload),
          diff: null,
          errorDetails: null,
          consoleLogs: parsedExec.consoleLogs,
          executionTimeMs
        };
      } else {
        return {
          status: 'FAILED',
          actualOutput: parsedExec.errorPayload,
          actualRaw: JSON.stringify(parsedExec.errorPayload),
          diff: `Expected Exception: ${JSON.stringify(expectedErrorObj)}\nActual Exception: ${JSON.stringify(parsedExec.errorPayload)}`,
          errorDetails: 'Caught exception did not match expected exception message/type.',
          consoleLogs: parsedExec.consoleLogs,
          executionTimeMs
        };
      }
    }

    // Default: Runtime error without explicit exception expectation is always ERROR
    return {
      status: 'ERROR',
      category: 'Runtime Exception',
      actualOutput: null,
      actualRaw: parsedExec.errorPayload?.message || stderr || 'Unhandled runtime exception',
      diff: null,
      errorDetails: parsedExec.errorPayload?.message || stderr || 'Process terminated with non-zero exit code',
      consoleLogs: parsedExec.consoleLogs,
      executionTimeMs
    };
  }

  // 4. Output Comparison
  const actual = parsedExec.parsedOutput;
  const expected = testCase.expectedOutput;

  // If test case explicitly expected an exception, but code executed without error:
  if (isExplicitExceptionExpected) {
    return {
      status: 'FAILED',
      actualOutput: actual,
      actualRaw: parsedExec.rawOutput,
      diff: `Expected explicit exception, but function returned normally with value: ${JSON.stringify(actual)}`,
      errorDetails: 'Expected exception was not raised.',
      consoleLogs: parsedExec.consoleLogs,
      executionTimeMs
    };
  }

  const isMatch = compareValues(actual, expected);

  if (isMatch) {
    return {
      status: 'PASSED',
      actualOutput: actual,
      actualRaw: parsedExec.rawOutput,
      diff: null,
      errorDetails: null,
      consoleLogs: parsedExec.consoleLogs,
      executionTimeMs
    };
  }

  return {
    status: 'FAILED',
    actualOutput: actual,
    actualRaw: parsedExec.rawOutput,
    diff: formatDiff(actual, expected),
    errorDetails: 'Actual output does not match expected output.',
    consoleLogs: parsedExec.consoleLogs,
    executionTimeMs
  };
}
