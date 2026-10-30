const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const optionalAuth = auth.optionalAuth || ((req,res,next)=>next());
const {
  enterWorkspaceSession,
  getCurrentSession,
  getWorkspaceSessions,
  updateActivity,
  updateCurrentFile,
  leaveWorkspaceSession
} = require('../controllers/workspaceSessionController');

// Writes need auth; reads allow optional auth for local dev
router.post('/', auth, enterWorkspaceSession);
router.get('/', optionalAuth, getCurrentSession);
router.get('/all', optionalAuth, getWorkspaceSessions);
router.patch('/activity', auth, updateActivity);
router.patch('/file', auth, updateCurrentFile);
router.delete('/', auth, leaveWorkspaceSession);

module.exports = router;
