/**
 * reportRoutes.js
 * CT-199: Generate Contribution Reports Routes
 * Author: Anistina Dsouza (Lead - Execution & QA / Contribution Reports)
 *
 * Mounted under: /api/workspaces/:workspaceId
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const {
  getContributionReport,
  generateCustomReport,
  validateReportContentEndpoint,
  downloadReportMarkdown,
  downloadReportHtml
} = require('../controllers/reportController');

// All report routes require authentication
router.use(auth);

// CT-199: Generate & fetch standard contribution report (supports ?format=json|markdown|html)
router.get('/reports/contribution', getContributionReport);

// CT-199: Generate custom contribution report with user parameters & filters
router.post('/reports/contribution/generate', generateCustomReport);

// CT-199: Validate report content integrity & schema consistency
router.post('/reports/contribution/validate', validateReportContentEndpoint);

// CT-199 & CT-200: Direct attachment downloads for Markdown and HTML formats
router.get('/reports/contribution/markdown', downloadReportMarkdown);
router.get('/reports/contribution/html', downloadReportHtml);

module.exports = router;
