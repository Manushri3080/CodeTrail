const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const {
  createActivityLog,
  getWorkspaceActivities,
  getWorkspaceContributions,
  verifyProofOfWork,
  getActivityById
} = require('../controllers/activityController');

// All activity routes require authentication
router.use(auth);

// Activity logs endpoints
router.post('/activities', createActivityLog);
router.get('/activities', getWorkspaceActivities);
router.get('/activities/:activityId', getActivityById);

// Aggregated contribution telemetry endpoint
router.get('/contributions', getWorkspaceContributions);

// Proof-of-work cryptographic chain verification endpoint
router.get('/proof-of-work/verify', verifyProofOfWork);

module.exports = router;
