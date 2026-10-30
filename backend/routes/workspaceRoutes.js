const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const optionalAuth = authMiddleware.optionalAuth || ((req,res,next)=>next());
const {
  createWorkspace,
  getUserWorkspaces,
  discoverPublicWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  joinWorkspaceByCode,
  deleteWorkspace,
  updateWorkspaceSession,
  getWorkspaceHistory,
  addWorkspaceHistoryLog,
  clearWorkspaceHistory,
  getWorkspaceMembers,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember
} = require('../controllers/workspaceController');
const {
  getWorkspaceExecutions,
  clearWorkspaceExecutions
} = require('../controllers/executionController');

// Writes need auth; reads allow optional auth for local dev
router.post('/', authMiddleware, createWorkspace);
router.get('/', authMiddleware, getUserWorkspaces);
router.get('/discover', authMiddleware, discoverPublicWorkspaces);
router.get('/:id', optionalAuth, getWorkspaceById);
router.patch('/:id', authMiddleware, updateWorkspace);
router.patch('/:id/session', authMiddleware, updateWorkspaceSession);

// Member management endpoints
router.get('/:id/members', optionalAuth, getWorkspaceMembers);
router.post('/:id/members', authMiddleware, addWorkspaceMember);
router.patch('/:id/members/:memberId', authMiddleware, updateWorkspaceMemberRole);
router.delete('/:id/members/:memberId', authMiddleware, removeWorkspaceMember);

// Activity History endpoints
router.get('/:id/history', optionalAuth, getWorkspaceHistory);
router.post('/:id/history', authMiddleware, addWorkspaceHistoryLog);
router.delete('/:id/history', authMiddleware, clearWorkspaceHistory);

// Code Execution History endpoints
router.get('/:id/executions', optionalAuth, getWorkspaceExecutions);
router.delete('/:id/executions', authMiddleware, clearWorkspaceExecutions);

router.post('/join', optionalAuth, joinWorkspaceByCode);
router.delete('/:id', authMiddleware, deleteWorkspace);

module.exports = router;

