const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const {
  enterWorkspaceSession,
  getCurrentSession,
  getWorkspaceSessions,
  updateActivity,
  updateCurrentFile,
  leaveWorkspaceSession
} = require('../controllers/workspaceSessionController');

// All session endpoints require authentication
router.post('/', auth, enterWorkspaceSession);
router.get('/', auth, getCurrentSession);
router.get('/all', auth, getWorkspaceSessions);
router.patch('/activity', auth, updateActivity);
router.patch('/file', auth, updateCurrentFile);
router.delete('/', auth, leaveWorkspaceSession);

module.exports = router;
