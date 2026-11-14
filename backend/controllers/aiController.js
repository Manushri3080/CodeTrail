/**
 * aiController.js
 * CodeTrail AI Assistant Controller
 * Lead: Manushri — AI Backend & Model Integration
 *
 * Endpoints:
 *   - POST /api/ai/chat         : Primary chat endpoint compatible with AssistantPanel.jsx
 *   - POST /api/ai/chat/stream  : Real-time Server-Sent Events (SSE) streaming endpoint
 *   - POST /api/ai/explain      : Specialized code explanation endpoint
 *   - POST /api/ai/debug        : Specialized runtime & compilation error debugger
 *   - POST /api/ai/review       : Automated code review with severity ratings
 *   - POST /api/ai/tests        : Comprehensive test case generation endpoint
 *   - POST /api/ai/docs         : Function and API documentation generator
 *   - GET  /api/ai/status       : AI service health, active model, and capability status
 */

const aiService = require('../services/aiService');
const aiTestCaseService = require('../services/aiTestCaseService');

/**
 * 1. Primary AI Chat Endpoint
 * Compatible with AssistantPanel.jsx payload
 */
exports.chat = async (req, res) => {
  try {
    const { message, conversation, context, attachments, actionType, workspaceId, files } = req.body;

    // Validate prompt message
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid message string is required.'
      });
    }

    const aiResult = await aiService.generateAIResponse({
      message: message.trim(),
      conversation: Array.isArray(conversation) ? conversation : [],
      context: typeof context === 'object' && context !== null ? context : {},
      attachments: Array.isArray(attachments) ? attachments : [],
      actionType: actionType || 'general',
      user: req.user || null,
      workspaceId: workspaceId || null,
      files: Array.isArray(files) ? files : null
    });

    return res.json({
      ...aiResult,
      references: aiResult.references || []
    });
  } catch (err) {
    console.error('[CodeTrail AI Controller Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate AI response.',
      error: err.message
    });
  }
};

/**
 * 2. Streaming Chat Endpoint (Server-Sent Events - SSE)
 * Uses provider-native streaming when available (Gemini/OpenAI-compatible), with chunk fallback.
 */
exports.chatStream = async (req, res) => {
  let streamStarted = false;
  try {
    const { message, conversation, context, attachments, actionType, workspaceId, files } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid message string is required.'
      });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    streamStarted = true;

    const status = aiService.getAIStatus();
    res.write(`data: ${JSON.stringify({ type: 'start', model: status.activeModel, provider: status.activeProvider })}\n\n`);

    let fullText = '';
    let meta = { provider: status.activeProvider, model: status.activeModel, references: [], workspaceContextSummary: null };

    if (typeof aiService.streamAIResponse === 'function') {
      for await (const event of aiService.streamAIResponse({
        message: message.trim(),
        conversation: Array.isArray(conversation) ? conversation : [],
        context: typeof context === 'object' && context !== null ? context : {},
        attachments: Array.isArray(attachments) ? attachments : [],
        actionType: actionType || 'general',
        user: req.user || null,
        workspaceId: workspaceId || null,
        files: Array.isArray(files) ? files : null
      })) {
        if (!event) continue;
        if (event.type === 'meta') {
          meta = { ...meta, ...event };
          if (event.provider || event.model) {
            res.write(`data: ${JSON.stringify({ type: 'meta', provider: event.provider, model: event.model, references: event.references || [], workspaceContextSummary: event.workspaceContextSummary || null })}\n\n`);
          }
          continue;
        }
        if (event.type === 'delta' && typeof event.delta === 'string' && event.delta) {
          fullText += event.delta;
          res.write(`data: ${JSON.stringify({ type: 'chunk', delta: event.delta })}\n\n`);
        }
      }
    } else {
      const result = await aiService.generateAIResponse({
        message: message.trim(),
        conversation: Array.isArray(conversation) ? conversation : [],
        context: typeof context === 'object' && context !== null ? context : {},
        attachments: Array.isArray(attachments) ? attachments : [],
        actionType: actionType || 'general',
        user: req.user || null,
        workspaceId: workspaceId || null,
        files: Array.isArray(files) ? files : null
      });
      fullText = result.response || result.message || '';
      meta = { ...meta, provider: result.provider, model: result.model, references: result.references || [], workspaceContextSummary: result.workspaceContextSummary || null };
      const chunkSize = 25;
      for (let i = 0; i < fullText.length; i += chunkSize) {
        const slice = fullText.slice(i, i + chunkSize);
        res.write(`data: ${JSON.stringify({ type: 'chunk', delta: slice })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done', fullResponse: fullText, references: meta.references || [], provider: meta.provider, model: meta.model, workspaceContextSummary: meta.workspaceContextSummary || null })}\n\n`);
    res.end();
  } catch (err) {
    console.error('[CodeTrail AI Streaming Error]:', err);
    if (!streamStarted) {
      return res.status(500).json({ success: false, message: 'Streaming failed', error: err.message });
    }
    try { res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`); } catch {}
    try { res.end(); } catch {}
  }
};

/**
 * 3. Explain Code Endpoint
 */
exports.explainCode = async (req, res) => {
  try {
    const { code, context, message, workspaceId, files } = req.body;
    const promptMessage = message || 'Explain how this code works step by step.';

    const mergedContext = {
      ...(typeof context === 'object' && context !== null ? context : {}),
      content: code || context?.content || ''
    };

    const result = await aiService.generateAIResponse({
      message: promptMessage,
      context: mergedContext,
      actionType: 'explain',
      user: req.user || null,
      workspaceId: workspaceId || null,
      files: Array.isArray(files) ? files : null
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Explain code failed', error: err.message });
  }
};

/**
 * 4. Debug Error Endpoint
 */
exports.debugError = async (req, res) => {
  try {
    const { error, code, context, message, workspaceId, files } = req.body;
    const promptMessage = message || `Debug this error: ${error || 'Runtime or execution error'}`;

    const mergedContext = {
      ...(typeof context === 'object' && context !== null ? context : {}),
      content: code || context?.content || (error ? `Error Log:\n${error}` : '')
    };

    const result = await aiService.generateAIResponse({
      message: promptMessage,
      context: mergedContext,
      actionType: 'debug',
      user: req.user || null,
      workspaceId: workspaceId || null,
      files: Array.isArray(files) ? files : null
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Debug error failed', error: err.message });
  }
};

/**
 * 5. Code Review Endpoint
 */
exports.reviewCode = async (req, res) => {
  try {
    const { code, context, message, workspaceId, files } = req.body;
    const promptMessage = message || 'Review this code for duplication, complexity, security, and performance.';

    const mergedContext = {
      ...(typeof context === 'object' && context !== null ? context : {}),
      content: code || context?.content || ''
    };

    const result = await aiService.generateAIResponse({
      message: promptMessage,
      context: mergedContext,
      actionType: 'review',
      user: req.user || null,
      workspaceId: workspaceId || null,
      files: Array.isArray(files) ? files : null
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Code review failed', error: err.message });
  }
};

/**
 * 6. Generate Tests Endpoint (CT-238: AI Test Case Generation & Function Analysis - Mahi)
 */
exports.generateTests = async (req, res) => {
  try {
    const { code, context, message, workspaceId, files, language } = req.body || {};
    const targetCode = (code || context?.content || '').trim();

    // If code/function is provided, run specialized AI test case generator & function analysis
    if (targetCode) {
      const langHint = language || context?.language || '';
      const testResult = await aiTestCaseService.generateTestCasesForFunction({
        code: targetCode,
        language: langHint,
        context: typeof context === 'object' && context !== null ? context : {},
        user: req.user || null
      });

      return res.json({
        ...testResult,
        references: []
      });
    }

    // Fallback if no specific code provided
    const promptMessage = message || 'Generate unit and edge-case test cases for this code.';
    const mergedContext = {
      ...(typeof context === 'object' && context !== null ? context : {}),
      content: ''
    };

    const result = await aiService.generateAIResponse({
      message: promptMessage,
      context: mergedContext,
      actionType: 'tests',
      user: req.user || null,
      workspaceId: workspaceId || null,
      files: Array.isArray(files) ? files : null
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Generate tests failed', error: err.message });
  }
};

/**
 * 7. Generate Documentation Endpoint
 */
exports.generateDocs = async (req, res) => {
  try {
    const { code, context, message, workspaceId, files } = req.body;
    const promptMessage = message || 'Generate documentation, JSDoc/docstrings, and usage examples for this code.';

    const mergedContext = {
      ...(typeof context === 'object' && context !== null ? context : {}),
      content: code || context?.content || ''
    };

    const result = await aiService.generateAIResponse({
      message: promptMessage,
      context: mergedContext,
      actionType: 'docs',
      user: req.user || null,
      workspaceId: workspaceId || null,
      files: Array.isArray(files) ? files : null
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Generate docs failed', error: err.message });
  }
};

/**
 * 8. Generate Code from Natural Language
 */
exports.generateCode = async (req, res) => {
  try {
    const { prompt, message, code, context, workspaceId, files } = req.body || {};
    const promptMessage = message || prompt || 'Generate code based on the provided request and context.';

    const mergedContext = {
      ...(typeof context === 'object' && context !== null ? context : {}),
      content: code || context?.content || ''
    };

    const result = await aiService.generateAIResponse({
      message: promptMessage,
      context: mergedContext,
      actionType: 'generate',
      user: req.user || null,
      workspaceId: workspaceId || null,
      files: Array.isArray(files) ? files : null
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Generate code failed', error: err.message });
  }
};

/**
 * 9. Refactor / Improve Code
 */
exports.refactorCode = async (req, res) => {
  try {
    const { code, context, message, workspaceId, files } = req.body || {};
    const promptMessage = message || 'Refactor and improve this code for readability, maintainability, performance, and correctness. Provide an improved version.';

    const mergedContext = {
      ...(typeof context === 'object' && context !== null ? context : {}),
      content: code || context?.content || ''
    };

    const result = await aiService.generateAIResponse({
      message: promptMessage,
      context: mergedContext,
      actionType: 'refactor',
      user: req.user || null,
      workspaceId: workspaceId || null,
      files: Array.isArray(files) ? files : null
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Refactor code failed', error: err.message });
  }
};

/**
 * 10. Algorithm Suggestions & Complexity Analysis
 */
exports.suggestAlgorithm = async (req, res) => {
  try {
    const { code, context, message, workspaceId, files } = req.body || {};
    const promptMessage = message || 'Suggest a more efficient algorithm or approach for this code/problem and explain time/space complexity trade-offs.';

    const mergedContext = {
      ...(typeof context === 'object' && context !== null ? context : {}),
      content: code || context?.content || ''
    };

    const result = await aiService.generateAIResponse({
      message: promptMessage,
      context: mergedContext,
      actionType: 'algorithm',
      user: req.user || null,
      workspaceId: workspaceId || null,
      files: Array.isArray(files) ? files : null
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Algorithm suggestion failed', error: err.message });
  }
};

/**
 * 11. Function / Code Analysis (CT-238: Function Analysis Logic - Mahi)
 */
exports.analyzeFunction = async (req, res) => {
  try {
    const { code, context, message, workspaceId, files, language } = req.body || {};
    const targetCode = (code || context?.content || '').trim();
    const promptMessage = message || 'Analyze this function/code: explain parameters, return values, dependencies, side effects, and execution flow.';

    let functionAnalysis = null;
    if (targetCode) {
      try {
        functionAnalysis = aiTestCaseService.analyzeFunction(targetCode, language || context?.language || '');
      } catch (e) {}
    }

    const mergedContext = {
      ...(typeof context === 'object' && context !== null ? context : {}),
      content: targetCode
    };

    const result = await aiService.generateAIResponse({
      message: promptMessage,
      context: mergedContext,
      actionType: 'analyze',
      user: req.user || null,
      workspaceId: workspaceId || null,
      files: Array.isArray(files) ? files : null
    });

    return res.json({
      ...result,
      functionAnalysis: functionAnalysis || {
        name: 'unknown',
        parameters: [],
        language: language || 'code',
        expectedBehavior: 'Code logic analysis'
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Function analysis failed', error: err.message });
  }
};

exports.generateTestCases = exports.generateTests;

/**
 * 12. Status & Capability Query
 */
exports.getStatus = (req, res) => {
  return res.json({
    success: true,
    status: aiService.getAIStatus()
  });
};

