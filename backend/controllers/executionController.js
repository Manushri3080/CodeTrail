const axios = require('axios');
const mongoose = require('mongoose');
const Execution = require('../models/Execution');
const Workspace = require('../models/Workspace');

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
 * Multi-Language Code Execution Handler with Custom Input & Execution History Recording
 * POST /api/execute
 */
exports.executeCode = async (req, res) => {
  const startTime = Date.now();
  try {
    const { language = 'javascript', code, stdin = '', filename = 'main', workspaceId = null } = req.body;

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
      stdin: stdin || ''
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

    const responseData = {
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
      timestamp: new Date().toISOString(),
      stdin: stdin || '',
      filename
    };

    // Save Execution record to MongoDB if database is online
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
          filename,
          language: pistonConfig.language,
          code,
          stdin: stdin || '',
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
      status: 'error',
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
