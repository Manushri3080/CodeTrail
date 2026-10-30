const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const optionalAuth = auth.optionalAuth || ((req,res,next)=>next());
const {
  createActivityLog,
  getWorkspaceActivities,
  getWorkspaceContributions,
  verifyProofOfWork,
  auditWorkspaceChainIntegrity,
  simulateTamperDetection,
  getActivityById
} = require('../controllers/activityController');

// Activity logs endpoints - writes need auth
router.post('/activities', auth, createActivityLog);
router.get('/activities', optionalAuth, getWorkspaceActivities);

// Chain integrity forensic audit & tamper simulation endpoints (CT-166)
router.get('/activities/audit', optionalAuth, auditWorkspaceChainIntegrity);
router.post('/activities/simulate-tamper', auth, simulateTamperDetection);

// Single block lookup with verification breakdown
router.get('/activities/:activityId', optionalAuth, getActivityById);

// Aggregated contribution telemetry endpoint
router.get('/contributions', optionalAuth, getWorkspaceContributions);

// Proof-of-work cryptographic chain verification endpoint
router.get('/proof-of-work/verify', optionalAuth, verifyProofOfWork);

module.exports = router;
