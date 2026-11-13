/**
 * aiRoutes.js
 * CodeTrail AI Assistant API Routes
 * Lead: Manushri — AI Backend & Model Integration
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

const {
  chat,
  chatStream,
  explainCode,
  debugError,
  reviewCode,
  generateTests,
  generateDocs,
  getStatus
} = require('../controllers/aiController');

// System status and health
router.get('/status', optionalAuth, getStatus);

// Core Chat Endpoints
router.post('/chat', optionalAuth, chat);
router.post('/chat/stream', optionalAuth, chatStream);
router.get('/chat/stream', optionalAuth, chatStream);

// Specialized AI Capability Endpoints
router.post('/explain', optionalAuth, explainCode);
router.post('/debug', optionalAuth, debugError);
router.post('/review', optionalAuth, reviewCode);
router.post('/tests', optionalAuth, generateTests);
router.post('/docs', optionalAuth, generateDocs);

module.exports = router;

