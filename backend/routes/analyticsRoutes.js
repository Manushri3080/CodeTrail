/**
 * analyticsRoutes.js
 * CT-197: Contribution Analytics — Route Definitions
 *
 * All routes are mounted under /api/workspaces/:workspaceId
 * and require authentication.
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const {
  getContributionAnalytics,
  getCodingActivity,
  getParticipationMetrics,
  validateAnalytics
} = require('../controllers/analyticsController');

// All analytics routes require authentication
router.use(auth);

// CT-202: Calculate user contributions — aggregated per-user scores, daily chart, action breakdown
router.get('/analytics/contributions', getContributionAnalytics);

// CT-203: Measure coding activity — code edits, execution success rates, file touch counts, streaks
router.get('/analytics/coding-activity', getCodingActivity);

// CT-204: Track participation metrics — session durations, session count, last active, role
router.get('/analytics/participation', getParticipationMetrics);

// CT-206: Validate analytics data — cross-check aggregated totals against raw ActivityLog data
router.get('/analytics/validate', validateAnalytics);

module.exports = router;
