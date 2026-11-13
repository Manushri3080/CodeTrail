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

/**
 * 1. Primary AI Chat Endpoint
 * Compatible with AssistantPanel.jsx payload
 */
exports.chat = async (req, res) => {
  try {
    const { message, conversation, context, attachments, actionType } = req.body;

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
      user: req.user || null
    });

    return res.json(aiResult);
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
 */
exports.chatStream = async (req, res) => {
  try {
    const { message, conversation, context, attachments, actionType } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid message string is required.'
      });
    }

    // Configure SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // 1. Initial connection payload
    const status = aiService.getAIStatus();
    res.write(`data: ${JSON.stringify({ type: 'start', model: status.activeModel, provider: status.activeProvider })}\n\n`);

    // 2. Generate complete response payload
    const result = await aiService.generateAIResponse({
      message: message.trim(),
      conversation: Array.isArray(conversation) ? conversation : [],
      context: typeof context === 'object' && context !== null ? context : {},
      attachments: Array.isArray(attachments) ? attachments : [],
      actionType: actionType || 'general',
      user: req.user || null
    });

    const fullText = result.response || result.message || '';

    // 3. Stream text chunks progressively to emulate real-time generation
    const chunkSize = 25;
    for (let i = 0; i < fullText.length; i += chunkSize) {
      const slice = fullText.slice(i, i + chunkSize);
      res.write(`data: ${JSON.stringify({ type: 'chunk', delta: slice })}\n\n`);
      // Brief micro-pause for smooth streaming illusion
      await new Promise(resolve => setTimeout(resolve, 15));
    }

    // 4. Send completion marker
    res.write(`data: ${JSON.stringify({ type: 'done', fullResponse: fullText })}\n\n`);
    res.end();
  } catch (err) {
    console.error('[CodeTrail AI Streaming Error]:', err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Streaming failed', error: err.message });
    }
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
};

/**
 * 3. Explain Code Endpoint
 */
exports.explainCode = async (req, res) => {
  try {
    const { code, context, message } = req.body;
    const promptMessage = message || 'Explain how this code works step by step.';

    const mergedContext = {
      ...(typeof context === 'object' && context !== null ? context : {}),
      content: code || context?.content || ''
    };

    const result = await aiService.generateAIResponse({
      message: promptMessage,
      context: mergedContext,
      actionType: 'explain',
      user: req.user || null
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
    const { error, code, context, message } = req.body;
    const promptMessage = message || `Debug this error: ${error || 'Runtime or execution error'}`;

    const mergedContext = {
      ...(typeof context === 'object' && context !== null ? context : {}),
      content: code || context?.content || (error ? `Error Log:\n${error}` : '')
    };

    const result = await aiService.generateAIResponse({
      message: promptMessage,
      context: mergedContext,
      actionType: 'debug',
      user: req.user || null
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
    const { code, context, message } = req.body;
    const promptMessage = message || 'Review this code for duplication, complexity, security, and performance.';

    const mergedContext = {
      ...(typeof context === 'object' && context !== null ? context : {}),
      content: code || context?.content || ''
    };

    const result = await aiService.generateAIResponse({
      message: promptMessage,
      context: mergedContext,
      actionType: 'review',
      user: req.user || null
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Code review failed', error: err.message });
  }
};

/**
 * 6. Generate Tests Endpoint
 */
exports.generateTests = async (req, res) => {
  try {
    const { code, context, message } = req.body;
    const promptMessage = message || 'Generate unit and edge-case test cases for this code.';

    const mergedContext = {
      ...(typeof context === 'object' && context !== null ? context : {}),
      content: code || context?.content || ''
    };

    const result = await aiService.generateAIResponse({
      message: promptMessage,
      context: mergedContext,
      actionType: 'tests',
      user: req.user || null
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
    const { code, context, message } = req.body;
    const promptMessage = message || 'Generate documentation, JSDoc/docstrings, and usage examples for this code.';

    const mergedContext = {
      ...(typeof context === 'object' && context !== null ? context : {}),
      content: code || context?.content || ''
    };

    const result = await aiService.generateAIResponse({
      message: promptMessage,
      context: mergedContext,
      actionType: 'docs',
      user: req.user || null
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Generate docs failed', error: err.message });
  }
};

/**
 * 8. Status & Capability Query
 */
exports.getStatus = (req, res) => {
  return res.json({
    success: true,
    status: aiService.getAIStatus()
  });
};

