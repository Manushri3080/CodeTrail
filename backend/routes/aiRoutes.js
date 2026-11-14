/**
 * aiRoutes.js
 * CodeTrail AI Assistant API Routes
 * Lead: Manushri â€” AI Backend & Model Integration
 *
 * Routes:
 *   - POST /api/ai/chat        : Main chat interaction (supports context, history, attachments)
 *   - POST /api/ai/chat/stream : Streaming Server-Sent Events (SSE) chat interaction
 *   - POST /api/ai/explain     : Code explanation
 *   - POST /api/ai/debug       : Compilation & runtime error debugging
 *   - POST /api/ai/review      : Automated code review
 *   - POST /api/ai/tests       : Unit & edge-case test generation
 *   - POST /api/ai/docs        : Code documentation & JSDoc generation
 *   - GET  /api/ai/status      : Model status, providers, and capabilities
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const optionalAuth = authMiddleware.optionalAuth || ((req, res, next) => next());
const { aiGeneralLimiter, aiStreamLimiter, aiStatusLimiter } = require('../middleware/rateLimiter');

const {
  chat,
  chatStream,
  explainCode,
  debugError,
  reviewCode,
  generateTests,
  generateDocs,
  generateCode,
  refactorCode,
  suggestAlgorithm,
  analyzeFunction,
  getStatus
} = require('../controllers/aiController');

// System status and health
router.get('/status', optionalAuth, aiStatusLimiter, getStatus);

// Core Chat Endpoints
router.post('/chat', optionalAuth, aiGeneralLimiter, chat);
router.post('/chat/stream', optionalAuth, aiStreamLimiter, chatStream);
router.get('/chat/stream', optionalAuth, aiStreamLimiter, chatStream);

// Specialized AI Capability Endpoints
router.post('/explain', optionalAuth, aiGeneralLimiter, explainCode);
router.post('/debug', optionalAuth, aiGeneralLimiter, debugError);
router.post('/review', optionalAuth, aiGeneralLimiter, reviewCode);
router.post('/tests', optionalAuth, aiGeneralLimiter, generateTests);
router.post('/docs', optionalAuth, aiGeneralLimiter, generateDocs);
router.post('/generate', optionalAuth, aiGeneralLimiter, generateCode);
router.post('/refactor', optionalAuth, aiGeneralLimiter, refactorCode);
router.post('/algorithm', optionalAuth, aiGeneralLimiter, suggestAlgorithm);
router.post('/analyze', optionalAuth, aiGeneralLimiter, analyzeFunction);

module.exports = router;


