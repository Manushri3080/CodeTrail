const axios = require('axios');

const PISTON_LANGUAGE_MAP = {
  javascript: { language: 'javascript', version: '18.15.0' },
  typescript: { language: 'typescript', version: '5.0.3' },
  python: { language: 'python', version: '3.10.0' },
  cpp: { language: 'c++', version: '10.2.0' },
  c: { language: 'c', version: '10.2.0' },
  java: { language: 'java', version: '15.0.2' },
  rust: { language: 'rust', version: '1.68.2' },
  go: { language: 'go', version: '1.16.2' },
  shell: { language: 'bash', version: '5.2.0' },
  bash: { language: 'bash', version: '5.2.0' },
  sql: { language: 'sqlite3', version: '3.36.0' }
};

/**
 * Multi-Language Code Execution Handler
 * POST /api/execute
 */
exports.executeCode = async (req, res) => {
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

    const response = await axios.post('https://emkc.org/api/v2/piston/execute', payload, {
      timeout: 12000
    });

    const runResult = response.data?.run || {};

    return res.json({
      language: pistonConfig.language,
      version: response.data?.version || pistonConfig.version,
      output: runResult.output || runResult.stdout || runResult.stderr || 'Execution completed with no output.',
      stdout: runResult.stdout || '',
      stderr: runResult.stderr || '',
      exitCode: runResult.code !== undefined ? runResult.code : 0,
      signal: runResult.signal || null
    });

  } catch (err) {
    console.error('Execution Engine Error:', err.message);
    return res.status(500).json({
      message: 'Code execution service error',
      error: err.response?.data?.message || err.message,
      output: `[Execution Error]: ${err.response?.data?.message || err.message}`
    });
  }
};
