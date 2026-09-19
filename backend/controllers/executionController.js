const axios = require('axios');

const PISTON_LANGUAGE_MAP = {
  javascript: { language: 'javascript', version: '24.14.1' },
  typescript: { language: 'typescript', version: '5.0.3' },
  python: { language: 'python', version: '3.13.14' },
  cpp: { language: 'c++', version: '6.3.0' },
  c: { language: 'c', version: '6.3.0' },
  java: { language: 'java', version: '15.0.2' },
  rust: { language: 'rust', version: '1.68.2' },
  go: { language: 'go', version: '1.16.2' },
  shell: { language: 'bash', version: '5.2.0' },
  bash: { language: 'bash', version: '5.2.0' },
  sql: { language: 'sqlite3', version: '3.36.0' }
};

const PISTON_API_URL = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston/execute';

/**
 * Multi-Language Code Execution Handler
 * POST /api/execute
 */
exports.executeCode = async (req, res) => {
  const startTime = Date.now();
  try {
    const { language = 'javascript', code, stdin = '', filename = 'main' } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ message: 'Source code is required for execution.' });
    }

    const pistonConfig = PISTON_LANGUAGE_MAP[language.toLowerCase()] || PISTON_LANGUAGE_MAP.javascript;

    const payload = {
      language: pistonConfig.language,
      version: pistonConfig.version,
      files: [
        {
          name: filename,
          content: code
        }
      ],
      stdin
    };

    const response = await axios.post(PISTON_API_URL, payload, {
      timeout: 15000
    });

    const runResult = response.data?.run || {};
    const compileResult = response.data?.compile || null;
    const executionTimeMs = Date.now() - startTime;

    // Check if Piston terminated due to run/compile timeout
    const isPistonTimeout = Boolean(
      runResult.signal === 'SIGKILL' || 
      runResult.status === 'timeout' || 
      (compileResult && (compileResult.signal === 'SIGKILL' || compileResult.status === 'timeout'))
    );

    // Check if compilation failed (for languages like C++, Java, Rust, Go)
    const isCompileError = Boolean(!isPistonTimeout && compileResult && compileResult.code !== 0);
    const hasRuntimeError = Boolean(!isPistonTimeout && !isCompileError && runResult.code !== undefined && runResult.code !== 0);
    const exitCode = isCompileError
      ? compileResult.code
      : (runResult.code !== undefined ? runResult.code : 0);

    let status = 'success';
    if (isPistonTimeout) {
      status = 'timeout';
    } else if (isCompileError) {
      status = 'compile_error';
    } else if (hasRuntimeError) {
      status = 'error';
    }

    const stdout = (runResult.stdout || '').trimEnd();
    const stderr = (runResult.stderr || '').trimEnd();
    const compileOutput = (compileResult ? (compileResult.output || compileResult.stderr || compileResult.stdout || '') : '').trimEnd();
    const rawOutput = (runResult.output || runResult.stdout || runResult.stderr || compileOutput || '').trimEnd();

    return res.json({
      status,
      language: pistonConfig.language,
      version: response.data?.version || pistonConfig.version,
      output: rawOutput || 'Execution completed with no output.',
      stdout,
      stderr,
      compileOutput,
      isCompileError,
      isTimeout: isPistonTimeout,
      exitCode,
      signal: runResult.signal || (compileResult ? compileResult.signal : null) || null,
      executionTimeMs,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Execution Engine Error:', err.message);
    const isTimeout = err.code === 'ECONNABORTED' || (err.message && err.message.toLowerCase().includes('timeout'));
    const executionTimeMs = Date.now() - startTime;

    if (isTimeout) {
      return res.json({
        status: 'timeout',
        isTimeout: true,
        message: 'Execution timed out',
        output: '[Execution Error]: Execution timed out.',
        stdout: '',
        stderr: 'Execution timed out.',
        compileOutput: '',
        isCompileError: false,
        exitCode: 124,
        executionTimeMs,
        timestamp: new Date().toISOString()
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'Code execution service error',
      error: err.response?.data?.message || err.message,
      output: `[Execution Error]: ${err.response?.data?.message || err.message}`,
      stdout: '',
      stderr: err.response?.data?.message || err.message,
      compileOutput: '',
      isCompileError: false,
      exitCode: 1,
      executionTimeMs,
      timestamp: new Date().toISOString()
    });
  }
};
