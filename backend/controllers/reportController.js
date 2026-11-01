/**
 * reportController.js
 * CT-199: Generate Contribution Reports Controller
 * Author: Anistina Dsouza (Lead - Execution & QA / Contribution Reports)
 *
 * REST Endpoints:
 *   - GET  /api/workspaces/:workspaceId/reports/contribution
 *   - POST /api/workspaces/:workspaceId/reports/contribution/generate
 *   - POST /api/workspaces/:workspaceId/reports/contribution/validate
 *   - GET  /api/workspaces/:workspaceId/reports/contribution/markdown
 *   - GET  /api/workspaces/:workspaceId/reports/contribution/html
 */

const mongoose = require('mongoose');
const Workspace = require('../models/Workspace');
const ActivityLog = require('../models/ActivityLog');
const WorkspaceSession = require('../models/WorkspaceSession');
const {
  generateContributionReport,
  formatReportAsMarkdown,
  formatReportAsHtml
} = require('../utils/reportGenerator');
const { validateReportContent } = require('../utils/reportValidator');

/**
 * Helper to safely convert string to ObjectId or return 400
 */
function toObjectId(id, res) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: 'Invalid workspace ID format.' });
    return null;
  }
  return new mongoose.Types.ObjectId(id);
}

/**
 * Verify user has permission to access this workspace
 */
function checkWorkspaceAccess(workspace, req, res) {
  const requestingUserId = req.user?._id || req.user?.id;
  if (!requestingUserId) return true;

  const isOwner = workspace.owner && String(workspace.owner._id || workspace.owner) === String(requestingUserId);
  const isMember = (workspace.members || []).some(m => m.user && String(m.user._id || m.user) === String(requestingUserId));

  if (!isOwner && !isMember && req.user?.role !== 'admin') {
    res.status(403).json({ message: 'Access denied: You are not a member of this workspace.' });
    return false;
  }
  return true;
}

/**
 * GET /api/workspaces/:workspaceId/reports/contribution
 * Fetches workspace activity and compiles a validated contribution report
 */
const getContributionReport = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const wsObjectId = toObjectId(workspaceId, res);
    if (!wsObjectId) return;

    const workspace = await Workspace.findById(wsObjectId)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .lean();

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    if (!checkWorkspaceAccess(workspace, req, res)) return;

    const { timeRange = 'all', format = 'json', detailLevel = 'comprehensive' } = req.query;

    // Fetch activity logs sorted chronologically
    const activityLogs = await ActivityLog.find({ workspaceId: wsObjectId })
      .sort({ sequenceNumber: 1, timestamp: 1 })
      .lean();

    // Fetch workspace sessions
    const sessions = await WorkspaceSession.find({ workspaceId: String(wsObjectId) })
      .populate('userId', 'name email')
      .lean();

    // Generate report
    const report = generateContributionReport({
      workspace,
      activityLogs,
      sessions,
      options: { timeRange, detailLevel },
      generatedBy: req.user
    });

    // Run report validation
    const validation = validateReportContent(report);
    report.validation = validation;

    if (format === 'markdown') {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      return res.send(formatReportAsMarkdown(report));
    }

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(formatReportAsHtml(report));
    }

    return res.json(report);
  } catch (err) {
    console.error('getContributionReport Error:', err);
    return res.status(500).json({ message: 'Failed to generate contribution report', error: err.message });
  }
};

/**
 * POST /api/workspaces/:workspaceId/reports/contribution/generate
 * Generates custom contribution report with user-defined filters and options
 */
const generateCustomReport = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const wsObjectId = toObjectId(workspaceId, res);
    if (!wsObjectId) return;

    const workspace = await Workspace.findById(wsObjectId)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .lean();

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    if (!checkWorkspaceAccess(workspace, req, res)) return;

    const {
      timeRange = 'all',
      detailLevel = 'comprehensive',
      participantIds = [],
      customTitle = null,
      notes = null
    } = req.body || {};

    const activityLogs = await ActivityLog.find({ workspaceId: wsObjectId })
      .sort({ sequenceNumber: 1, timestamp: 1 })
      .lean();

    const sessions = await WorkspaceSession.find({ workspaceId: String(wsObjectId) })
      .populate('userId', 'name email')
      .lean();

    const report = generateContributionReport({
      workspace,
      activityLogs,
      sessions,
      options: { timeRange, detailLevel, participantIds, customTitle, notes },
      generatedBy: req.user
    });

    const validation = validateReportContent(report);
    report.validation = validation;

    return res.status(201).json(report);
  } catch (err) {
    console.error('generateCustomReport Error:', err);
    return res.status(500).json({ message: 'Failed to generate custom report', error: err.message });
  }
};

/**
 * POST /api/workspaces/:workspaceId/reports/contribution/validate
 * Validates any submitted report content against mathematical and cryptographic rules
 */
const validateReportContentEndpoint = async (req, res) => {
  try {
    const { report } = req.body;
    if (!report) {
      return res.status(400).json({ message: 'Missing report payload to validate.' });
    }

    const validation = validateReportContent(report);
    return res.json({
      workspaceId: req.params.workspaceId,
      reportId: report.reportId || 'unknown',
      ...validation
    });
  } catch (err) {
    console.error('validateReportContentEndpoint Error:', err);
    return res.status(500).json({ message: 'Failed to validate report content', error: err.message });
  }
};

/**
 * GET /api/workspaces/:workspaceId/reports/contribution/markdown
 * Direct attachment download for Markdown report
 */
const downloadReportMarkdown = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const wsObjectId = toObjectId(workspaceId, res);
    if (!wsObjectId) return;

    const workspace = await Workspace.findById(wsObjectId).populate('owner').lean();
    if (!workspace) return res.status(404).json({ message: 'Workspace not found.' });
    if (!checkWorkspaceAccess(workspace, req, res)) return;

    const activityLogs = await ActivityLog.find({ workspaceId: wsObjectId }).lean();
    const sessions = await WorkspaceSession.find({ workspaceId: String(wsObjectId) }).lean();

    const report = generateContributionReport({
      workspace,
      activityLogs,
      sessions,
      generatedBy: req.user
    });

    const markdown = formatReportAsMarkdown(report);
    const filename = `CodeTrail-Report-${workspace.title.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}.md`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    return res.send(markdown);
  } catch (err) {
    console.error('downloadReportMarkdown Error:', err);
    return res.status(500).json({ message: 'Failed to download markdown report', error: err.message });
  }
};

/**
 * GET /api/workspaces/:workspaceId/reports/contribution/html
 * Direct attachment download for standalone HTML report
 */
const downloadReportHtml = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const wsObjectId = toObjectId(workspaceId, res);
    if (!wsObjectId) return;

    const workspace = await Workspace.findById(wsObjectId).populate('owner').lean();
    if (!workspace) return res.status(404).json({ message: 'Workspace not found.' });
    if (!checkWorkspaceAccess(workspace, req, res)) return;

    const activityLogs = await ActivityLog.find({ workspaceId: wsObjectId }).lean();
    const sessions = await WorkspaceSession.find({ workspaceId: String(wsObjectId) }).lean();

    const report = generateContributionReport({
      workspace,
      activityLogs,
      sessions,
      generatedBy: req.user
    });

    const html = formatReportAsHtml(report);
    const filename = `CodeTrail-Report-${workspace.title.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}.html`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    console.error('downloadReportHtml Error:', err);
    return res.status(500).json({ message: 'Failed to download HTML report', error: err.message });
  }
};

module.exports = {
  getContributionReport,
  generateCustomReport,
  validateReportContentEndpoint,
  downloadReportMarkdown,
  downloadReportHtml
};
