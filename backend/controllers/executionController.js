const axios = require('axios');

const PISTON_API_URL = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston/execute';

const PISTON_LANGUAGE_MAP = {
  javascript: { language: 'javascript', runtime: 'javascript', version: '18.15.0' },
  typescript: { language: 'typescript', runtime: 'typescript', version: '5.0.3' },
  python: { language: 'python', runtime: 'python', version: '3.10.0' },
  cpp: { language: 'c++', runtime: 'c++', version: '10.2.0' },
  c: { language: 'c', runtime: 'c', version: '10.2.0' },
  java: { language: 'java', runtime: 'java', version: '15.0.2' },
  rust: { language: 'rust', runtime: 'rust', version: '1.68.2' },
  go: { language: 'go', runtime: 'go', version: '1.16.2' },
  shell: { language: 'bash', runtime: 'bash', version: '5.2.0' },
  bash: { language: 'bash', runtime: 'bash', version: '5.2.0' },
  sql: { language: 'sqlite3', runtime: 'sqlite3', version: '3.36.0' }
};

/**
 * Multi-Language Code Execution Handler
 * POST /api/execute
 */
exports.executeCode = async (req, res) => {
  try {
    const { language, runtime, code, sourceCode, stdin = '', filename = 'main' } = req.body;
    const normalizedLanguage = typeof language === 'string' ? language.toLowerCase() : '';
    const pistonConfig = PISTON_LANGUAGE_MAP[normalizedLanguage];

    if (!pistonConfig) {
      return res.status(400).json({ message: 'Unsupported programming language.' });
    }

    if (runtime && runtime.toLowerCase() !== pistonConfig.runtime) {
      return res.status(400).json({ message: 'Language and runtime do not match.' });
    }

    const source = sourceCode ?? code;

    if (!source || !source.trim()) {
      return res.status(400).json({ message: 'Source code is required for execution.' });
    }

    const payload = {
      language: pistonConfig.language,
      version: pistonConfig.version,
      files: [
        {
          name: filename,
          content: source
        }
      ],
      stdin
    };

    const pistonHeaders = process.env.PISTON_API_KEY
      ? { Authorization: `Bearer ${process.env.PISTON_API_KEY}` }
      : undefined;
    const response = await axios.post(PISTON_API_URL, payload, {
      timeout: 12000,
      headers: pistonHeaders
    });

    const runResult = response.data?.run || {};

    return res.json({
      language: pistonConfig.language,
      runtime: pistonConfig.runtime,
      version: response.data?.version || pistonConfig.version,
      output: runResult.output || runResult.stdout || runResult.stderr || 'Execution completed with no output.',
      stdout: runResult.stdout || '',
      stderr: runResult.stderr || '',
      exitCode: runResult.code !== undefined ? runResult.code : 0,
      signal: runResult.signal || null
    });

  } catch (err) {
    console.error('Execution Engine Error:', err.message);
    const providerStatus = err.response?.status;
    const isProviderUnavailable = providerStatus === 401 || providerStatus === 403 || providerStatus === 429 || providerStatus >= 500;

    if (isProviderUnavailable) {
      return res.status(503).json({
        message: 'The code execution provider is unavailable or requires valid Piston credentials.',
        error: providerStatus === 401 || providerStatus === 403
          ? 'Configure PISTON_API_URL and PISTON_API_KEY in backend/.env.'
          : 'The execution provider temporarily rejected the request.'
      });
    }

    return res.status(500).json({
      message: 'Code execution service error',
      error: err.response?.data?.message || err.message,
      output: `[Execution Error]: ${err.response?.data?.message || err.message}`
    });
  }
};
