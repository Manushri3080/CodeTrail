const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  joinWorkspaceByCode,
  deleteWorkspace
} = require('../controllers/workspaceController');

// All workspace routes require valid JWT auth
router.use(authMiddleware);

// Workspace endpoints
router.post('/', createWorkspace);
router.get('/', getUserWorkspaces);
router.get('/:id', getWorkspaceById);
router.patch('/:id', updateWorkspace);
router.post('/join', joinWorkspaceByCode);
router.delete('/:id', deleteWorkspace);

module.exports = router;
