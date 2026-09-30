const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
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

// All workspace routes require valid JWT auth
router.use(authMiddleware);

// Workspace endpoints
router.post('/', createWorkspace);
router.get('/', getUserWorkspaces);
router.get('/discover', discoverPublicWorkspaces);
router.get('/:id', getWorkspaceById);
router.patch('/:id', updateWorkspace);
router.patch('/:id/session', updateWorkspaceSession);

// Member management endpoints
router.get('/:id/members', getWorkspaceMembers);
router.post('/:id/members', addWorkspaceMember);
router.patch('/:id/members/:memberId', updateWorkspaceMemberRole);
router.delete('/:id/members/:memberId', removeWorkspaceMember);

// Activity History endpoints
router.get('/:id/history', getWorkspaceHistory);
router.post('/:id/history', addWorkspaceHistoryLog);
router.delete('/:id/history', clearWorkspaceHistory);

// Code Execution History endpoints
router.get('/:id/executions', getWorkspaceExecutions);
router.delete('/:id/executions', clearWorkspaceExecutions);

router.post('/join', joinWorkspaceByCode);
router.delete('/:id', deleteWorkspace);

module.exports = router;

