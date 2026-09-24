const axios = require('axios');
const path = require('path');
const mongoose = require('mongoose');
const Execution = require('../models/Execution');
const Workspace = require('../models/Workspace');

// Supported language aliases and Piston configurations
const PISTON_LANGUAGE_MAP = {
  javascript: { language: 'javascript', version: '22.13.1', ext: 'js' },
  js: { language: 'javascript', version: '22.13.1', ext: 'js' },
  node: { language: 'javascript', version: '22.13.1', ext: 'js' },
  nodejs: { language: 'javascript', version: '22.13.1', ext: 'js' },
  typescript: { language: 'typescript', version: '5.0.3', ext: 'ts' },
  ts: { language: 'typescript', version: '5.0.3', ext: 'ts' },
  python: { language: 'python', version: '3.13.13', ext: 'py' },
  py: { language: 'python', version: '3.13.13', ext: 'py' },
  python3: { language: 'python', version: '3.13.13', ext: 'py' },
  cpp: { language: 'c++', version: '14.2.0', ext: 'cpp' },
  'c++': { language: 'c++', version: '14.2.0', ext: 'cpp' },
  cxx: { language: 'c++', version: '14.2.0', ext: 'cpp' },
  'g++': { language: 'c++', version: '14.2.0', ext: 'cpp' },
  c: { language: 'c', version: '14.2.0', ext: 'c' },
  gcc: { language: 'c', version: '14.2.0', ext: 'c' },
  java: { language: 'java', version: '17.0.10', ext: 'java' },
  openjdk: { language: 'java', version: '17.0.10', ext: 'java' },
  rust: { language: 'rust', version: '1.68.2', ext: 'rs' },
  rs: { language: 'rust', version: '1.68.2', ext: 'rs' },
  go: { language: 'go', version: '1.16.2', ext: 'go' },
  golang: { language: 'go', version: '1.16.2', ext: 'go' },
  shell: { language: 'bash', version: '5.2.0', ext: 'sh' },
  bash: { language: 'bash', version: '5.2.0', ext: 'sh' },
  sh: { language: 'bash', version: '5.2.0', ext: 'sh' },
  sql: { language: 'sqlite3', version: '3.36.0', ext: 'sql' },
  sqlite: { language: 'sqlite3', version: '3.36.0', ext: 'sql' },
  sqlite3: { language: 'sqlite3', version: '3.36.0', ext: 'sql' }
};

const LOCAL_PISTON_URL = process.env.PISTON_LOCAL_URL || 'http://localhost:2000/api/v2/execute';
const REMOTE_PISTON_URL = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston/execute';

const MAX_CODE_BYTES = 256 * 1024; // 256 KB max code size
const MAX_STDIN_BYTES = 128 * 1024; // 128 KB max stdin size
const MAX_OUTPUT_TRUNCATE_LEN = 64 * 1024; // 64 KB output truncate limit

// Helper function to truncate strings safely
const truncateSafe = (str, limit = MAX_OUTPUT_TRUNCATE_LEN) => {
  if (!str) return '';
  if (typeof str !== 'string') str = String(str);
  if (str.length > limit) {
    return str.slice(0, limit) + '\n... [Output truncated: exceeded 64KB limit]';
  }
  return str;
};

// Helper function to check workspace roles safely
const checkWorkspaceAccess = (workspace, userId, allowedRoles = ['owner', 'admin', 'editor', 'viewer']) => {
  if (!workspace || !userId) return false;
  const uIdStr = userId.toString();
  const ownerId = workspace.owner?._id || workspace.owner;
  if (ownerId && ownerId.toString() === uIdStr) return true;

  const member = workspace.members?.find(m => (m.user?._id || m.user)?.toString() === uIdStr);
  return Boolean(member && allowedRoles.includes(member.role));
};

/**
 * Multi-Language Code Execution Handler with Validation, Dual Sandbox Fallback & History Recording
 * POST /api/execute
 */
exports.executeCode = async (req, res) => {
  const startTime = Date.now();
  try {
    const {
      language = 'javascript',
      code,
      stdin = '',
      filename = 'main',
      workspaceId = null
    } = req.body || {};

    // 1. Validate Code Payload
    if (code === undefined || code === null || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Source code is required for execution.',
        error: 'VALIDATION_EMPTY_CODE'
      });
    }

    if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
      return res.status(400).json({
        status: 'error',
        message: `Source code exceeds maximum allowed size (${MAX_CODE_BYTES / 1024} KB).`,
        error: 'VALIDATION_CODE_TOO_LARGE'
      });
    }

    // 2. Validate Standard Input (stdin)
    const sanitizedStdin = typeof stdin === 'string' ? stdin : String(stdin || '');
    if (Buffer.byteLength(sanitizedStdin, 'utf8') > MAX_STDIN_BYTES) {
      return res.status(400).json({
        status: 'error',
        message: `Standard input exceeds maximum allowed size (${MAX_STDIN_BYTES / 1024} KB).`,
        error: 'VALIDATION_STDIN_TOO_LARGE'
      });
    }

    // 3. Resolve Language Configuration & Fallbacks
    const normalizedLangKey = String(language).toLowerCase().trim();
    const pistonConfig = PISTON_LANGUAGE_MAP[normalizedLangKey] || PISTON_LANGUAGE_MAP.javascript;

    // 4. Sanitize Filename
    let sanitizedFilename = path.basename(String(filename || 'main')).trim();
    if (!sanitizedFilename || sanitizedFilename === '.') {
      sanitizedFilename = `main.${pistonConfig.ext || 'txt'}`;
    }

    const payload = {
      language: pistonConfig.language,
      version: pistonConfig.version,
      files: [
        {
          name: sanitizedFilename,
          content: code
        }
      ],
      stdin: sanitizedStdin
    };

    // 5. Dual Sandbox Execution Attempt: Local Fast Piston -> Remote EMKC Piston Fallback
    let response = null;
    let engineUsed = 'local';

    try {
      response = await axios.post(LOCAL_PISTON_URL, payload, { timeout: 10000 });
      engineUsed = 'local';
    } catch (localErr) {
      // If local server is not reachable, or language is not installed locally, fallback to Remote Piston
      try {
        response = await axios.post(REMOTE_PISTON_URL, payload, { timeout: 15000 });
        engineUsed = 'remote';
      } catch (remoteErr) {
        throw new Error(remoteErr.response?.data?.message || remoteErr.message || localErr.message);
      }
    }

    const runResult = response.data?.run || {};
    const compileResult = response.data?.compile || null;
    const executionTimeMs = Date.now() - startTime;

    // 6. Detailed Status & Error Validation
    const isPistonTimeout = Boolean(
      runResult.signal === 'SIGKILL' || 
      runResult.status === 'timeout' || 
      (compileResult && (compileResult.signal === 'SIGKILL' || compileResult.status === 'timeout'))
    );

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

    const stdout = truncateSafe((runResult.stdout || '').trimEnd());
    const stderr = truncateSafe((runResult.stderr || '').trimEnd());
    const compileOutput = truncateSafe((compileResult ? (compileResult.output || compileResult.stderr || compileResult.stdout || '') : '').trimEnd());
    const rawOutput = truncateSafe((runResult.output || runResult.stdout || runResult.stderr || compileOutput || '').trimEnd());

    const responseData = {
      status,
      language: pistonConfig.language,
      version: response.data?.version || pistonConfig.version,
      engine: engineUsed,
      output: rawOutput || 'Execution completed with no output.',
      stdout,
      stderr,
      compileOutput,
      isCompileError,
      isTimeout: isPistonTimeout,
      exitCode,
      signal: runResult.signal || (compileResult ? compileResult.signal : null) || null,
      executionTimeMs,
      timestamp: new Date().toISOString(),
      stdin: sanitizedStdin,
      filename: sanitizedFilename
    };

    // 7. Persist Execution record to MongoDB if database is online
    if (mongoose.connection.readyState === 1) {
      try {
        let validWorkspaceId = null;
        if (workspaceId && mongoose.Types.ObjectId.isValid(workspaceId)) {
          validWorkspaceId = workspaceId;
        }

        const executionDoc = new Execution({
          workspace: validWorkspaceId,
          user: req.user?._id || null,
          userName: req.user?.name || 'Developer',
          filename: sanitizedFilename,
          language: pistonConfig.language,
          code,
          stdin: sanitizedStdin,
          stdout,
          stderr,
          compileOutput,
          status,
          exitCode,
          executionTimeMs,
          timestamp: new Date()
        });

        await executionDoc.save();
        responseData.executionId = executionDoc._id;
      } catch (dbErr) {
        console.warn('Execution history DB save notice:', dbErr.message);
      }
    }

    return res.json(responseData);

  } catch (err) {
    console.error('Execution Engine Error:', err.message);
    const isTimeout = err.code === 'ECONNABORTED' || (err.message && err.message.toLowerCase().includes('timeout'));
    const executionTimeMs = Date.now() - startTime;

    const errorResponse = {
      status: isTimeout ? 'timeout' : 'error',
      message: 'Code execution service error',
      error: err.response?.data?.message || err.message,
      output: `[Execution Error]: ${err.response?.data?.message || err.message}`,
      stdout: '',
      stderr: isTimeout ? 'Execution timed out.' : (err.response?.data?.message || err.message),
      compileOutput: '',
      isCompileError: false,
      isTimeout,
      exitCode: isTimeout ? 124 : 1,
      executionTimeMs,
      timestamp: new Date().toISOString(),
      stdin: req.body?.stdin || '',
      filename: req.body?.filename || 'main'
    };

    return res.status(isTimeout ? 200 : 500).json(errorResponse);
  }
};

/**
 * Get Workspace Execution History from DB
 * GET /api/workspaces/:id/executions
 */
exports.getWorkspaceExecutions = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.json({ executions: [] });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    if (!checkWorkspaceAccess(workspace, req.user._id, ['owner', 'admin', 'editor', 'viewer'])) {
      return res.status(403).json({ message: 'You do not have permission to view this workspace execution history.' });
    }

    const executions = await Execution.find({ workspace: id })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    return res.json({ executions });
  } catch (err) {
    console.error('Get Workspace Executions Error:', err);
    return res.status(500).json({ message: 'Failed to fetch workspace execution history', error: err.message });
  }
};

/**
 * Clear Workspace Execution History in DB
 * DELETE /api/workspaces/:id/executions
 */
exports.clearWorkspaceExecutions = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.json({ message: 'Execution history cleared', executions: [] });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    if (!checkWorkspaceAccess(workspace, req.user._id, ['owner', 'admin'])) {
      return res.status(403).json({ message: 'Only workspace owners and admins can clear execution history.' });
    }

    await Execution.deleteMany({ workspace: id });

    return res.json({ message: 'Workspace execution history cleared successfully', executions: [] });
  } catch (err) {
    console.error('Clear Workspace Executions Error:', err);
    return res.status(500).json({ message: 'Failed to clear workspace execution history', error: err.message });
  }
};
