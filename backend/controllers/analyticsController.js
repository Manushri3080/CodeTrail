/**
 * analyticsController.js
 * CT-197: Contribution Analytics — Backend Controller
 *
 * Sub-tasks implemented:
 *   CT-202: Calculate user contributions  (getContributionAnalytics)
 *   CT-203: Measure coding activity       (getCodingActivity)
 *   CT-204: Track participation metrics   (getParticipationMetrics)
 *   CT-206: Validate analytics data       (validateAnalytics + runFullValidation)
 */

const mongoose = require('mongoose');
const ActivityLog     = require('../models/ActivityLog');
const WorkspaceSession = require('../models/WorkspaceSession');
const Workspace       = require('../models/Workspace');
const { runFullValidation } = require('../utils/analyticsValidator');

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns an ObjectId from a string workspace ID; sends 400 on failure.
 */
const toObjectId = (id, res) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: 'Invalid workspace ID format.' });
    return null;
  }
  return new mongoose.Types.ObjectId(id);
};

/**
 * Contribution score formula:
 *   linesAdded × 1  +  linesDeleted × 0.5  +  codeExecutions × 2  +  filesCreated × 3
 */
const calcContributionScore = ({ linesAdded = 0, linesDeleted = 0, codeExecutions = 0, filesCreated = 0 }) =>
  Math.round(linesAdded * 1 + linesDeleted * 0.5 + codeExecutions * 2 + filesCreated * 3);

// ─────────────────────────────────────────────────────────────────────────────
// CT-202: Get Contribution Analytics
// GET /api/workspaces/:workspaceId/analytics/contributions
// ─────────────────────────────────────────────────────────────────────────────
const getContributionAnalytics = async (req, res) => {
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

    // ── $facet pipeline: three parallel aggregations in one round-trip ──────
    const [facetResult] = await ActivityLog.aggregate([
      { $match: { workspaceId: wsObjectId } },
      {
        $facet: {
          // (a) Per-user totals
          byUser: [
            {
              $group: {
                _id: '$userId',
                userName:          { $last: '$userName' },
                userEmail:         { $last: '$userEmail' },
                userRole:          { $last: '$userRole' },
                linesAdded:        { $sum: '$linesAdded' },
                linesDeleted:      { $sum: '$linesDeleted' },
                totalLinesChanged: { $sum: '$totalLinesChanged' },
                totalEvents:       { $sum: 1 },
                codeExecutions:    { $sum: { $cond: [{ $eq: ['$action', 'code_execution'] }, 1, 0] } },
                filesCreated:      { $sum: { $cond: [{ $eq: ['$action', 'file_create'] }, 1, 0] } },
                filesDeleted:      { $sum: { $cond: [{ $eq: ['$action', 'file_delete'] }, 1, 0] } },
                codeEdits:         { $sum: { $cond: [{ $eq: ['$action', 'code_edit'] }, 1, 0] } },
                firstEvent:        { $min: '$timestamp' },
                lastActiveAt:      { $max: '$timestamp' }
              }
            },
            { $sort: { totalLinesChanged: -1 } }
          ],

          // (b) Daily activity breakdown (for time-series chart)
          byDay: [
            {
              $group: {
                _id: {
                  year:  { $year: '$timestamp' },
                  month: { $month: '$timestamp' },
                  day:   { $dayOfMonth: '$timestamp' }
                },
                count: { $sum: 1 },
                linesChanged: { $sum: '$totalLinesChanged' }
              }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
          ],

          // (c) Action type breakdown
          byAction: [
            {
              $group: {
                _id: '$action',
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } }
          ]
        }
      }
    ]);

    const { byUser = [], byDay = [], byAction = [] } = facetResult || {};

    // ── Calculate workspace-wide totals for percentages ────────────────────
    const totalLinesAll  = byUser.reduce((s, u) => s + (u.totalLinesChanged || 0), 0);
    const totalEventsAll = byUser.reduce((s, u) => s + (u.totalEvents || 0), 0);

    // ── Enrich per-user data with scores and percentages ──────────────────
    const COLOR_PALETTE = ['#8B5CF6', '#38BDF8', '#10B981', '#F59E0B', '#EC4899', '#6366F1'];
    const contributors = byUser.map((u, idx) => {
      const lines   = u.totalLinesChanged || 0;
      const percent = totalLinesAll > 0
        ? Math.round((lines / totalLinesAll) * 100)
        : (totalEventsAll > 0 ? Math.round(((u.totalEvents || 0) / totalEventsAll) * 100) : 0);

      const score = calcContributionScore({
        linesAdded:     u.linesAdded,
        linesDeleted:   u.linesDeleted,
        codeExecutions: u.codeExecutions,
        filesCreated:   u.filesCreated
      });

      return {
        id:                String(u._id || 'unknown'),
        userId:            String(u._id || 'unknown'),
        userName:          u.userName || 'Developer',
        userEmail:         u.userEmail || '',
        role:              u.userRole || 'editor',
        linesAdded:        u.linesAdded || 0,
        linesDeleted:      u.linesDeleted || 0,
        lines:             lines,
        percent,
        totalEvents:       u.totalEvents || 0,
        codeExecutions:    u.codeExecutions || 0,
        filesCreated:      u.filesCreated || 0,
        filesDeleted:      u.filesDeleted || 0,
        codeEdits:         u.codeEdits || 0,
        score,
        rank:              idx + 1,
        firstEvent:        u.firstEvent || null,
        lastActiveAt:      u.lastActiveAt || null,
        color:             COLOR_PALETTE[idx % COLOR_PALETTE.length]
      };
    });

    // Top contributor
    const topContributor = contributors.length > 0 ? contributors[0] : null;

    // ── Format daily chart data ───────────────────────────────────────────
    const dailyActivity = byDay.map((d) => ({
      date:         `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
      events:       d.count,
      linesChanged: d.linesChanged
    }));

    // ── CT-206 Validation ─────────────────────────────────────────────────
    const validation = runFullValidation({
      reportedTotalLines: totalLinesAll,
      contributors,
      codingMetrics: []
    });

    res.json({
      workspaceId,
      workspaceTitle: workspace.title,
      generatedAt: new Date().toISOString(),
      summary: {
        totalLinesChanged:      totalLinesAll,
        totalActivities:        totalEventsAll,
        activeContributors:     contributors.filter(c => c.totalEvents > 0).length,
        totalMembersTracked:    contributors.length,
        topContributor:         topContributor ? { name: topContributor.userName, score: topContributor.score } : null
      },
      contributors,
      dailyActivity,
      actionBreakdown: byAction.map(a => ({ action: a._id, count: a.count })),
      validation
    });
  } catch (err) {
    console.error('getContributionAnalytics Error:', err);
    res.status(500).json({ message: 'Failed to compute contribution analytics', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CT-203: Get Coding Activity Metrics
// GET /api/workspaces/:workspaceId/analytics/coding-activity
// ─────────────────────────────────────────────────────────────────────────────

/** Code-related action types */
const CODE_ACTIONS = ['code_edit', 'file_create', 'file_delete', 'file_rename', 'code_execution'];

const getCodingActivity = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const wsObjectId = toObjectId(workspaceId, res);
    if (!wsObjectId) return;

    // ── Per-user coding aggregation ────────────────────────────────────────
    const codingByUser = await ActivityLog.aggregate([
      {
        $match: {
          workspaceId: wsObjectId,
          action: { $in: CODE_ACTIONS }
        }
      },
      {
        $group: {
          _id: '$userId',
          userName:            { $last: '$userName' },
          userEmail:           { $last: '$userEmail' },
          codeEdits:           { $sum: { $cond: [{ $eq: ['$action', 'code_edit'] }, 1, 0] } },
          filesCreated:        { $sum: { $cond: [{ $eq: ['$action', 'file_create'] }, 1, 0] } },
          filesDeleted:        { $sum: { $cond: [{ $eq: ['$action', 'file_delete'] }, 1, 0] } },
          filesRenamed:        { $sum: { $cond: [{ $eq: ['$action', 'file_rename'] }, 1, 0] } },
          codeExecutions:      { $sum: { $cond: [{ $eq: ['$action', 'code_execution'] }, 1, 0] } },
          successExecutions:   {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$action', 'code_execution'] }, { $eq: ['$executionStatus', 'success'] }] },
                1, 0
              ]
            }
          },
          totalLinesAdded:     { $sum: '$linesAdded' },
          totalLinesDeleted:   { $sum: '$linesDeleted' },
          distinctFiles:       { $addToSet: '$fileId' },
          activeDays:          { $addToSet: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          }},
          timestamps:          { $push: '$timestamp' },
          mostEditedFile:      { $last: '$fileName' }
        }
      }
    ]);

    // ── Enrich metrics ─────────────────────────────────────────────────────
    const codingMetrics = codingByUser.map((u) => {
      const execSuccessRate = u.codeExecutions > 0
        ? Math.round((u.successExecutions / u.codeExecutions) * 100)
        : 0;

      const activeDaysCount = (u.activeDays || []).length;
      const distinctFilesTouched = (u.distinctFiles || []).filter(Boolean).length;

      // Calculate coding streak (consecutive active days ending today or last active day)
      const sortedDays = [...new Set(u.activeDays || [])].sort();
      let streak = 0;
      if (sortedDays.length > 0) {
        streak = 1;
        for (let i = sortedDays.length - 1; i > 0; i--) {
          const current = new Date(sortedDays[i]);
          const prev    = new Date(sortedDays[i - 1]);
          const diffMs  = current - prev;
          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            streak++;
          } else {
            break;
          }
        }
      }

      const totalCodeEvents = u.codeEdits + u.filesCreated + u.filesDeleted + u.filesRenamed + u.codeExecutions;
      const avgLinesPerEdit = u.codeEdits > 0
        ? Math.round((u.totalLinesAdded + u.totalLinesDeleted) / u.codeEdits)
        : 0;

      return {
        userId:               String(u._id || 'unknown'),
        userName:             u.userName || 'Developer',
        userEmail:            u.userEmail || '',
        codeEdits:            u.codeEdits || 0,
        filesCreated:         u.filesCreated || 0,
        filesDeleted:         u.filesDeleted || 0,
        filesRenamed:         u.filesRenamed || 0,
        codeExecutions:       u.codeExecutions || 0,
        executionSuccessRate: execSuccessRate,
        distinctFilesTouched,
        mostActiveFile:       u.mostEditedFile || null,
        avgLinesPerEdit,
        activeDaysCount,
        streak,
        totalCodingEvents:    totalCodeEvents,
        linesAdded:           u.totalLinesAdded || 0,
        linesDeleted:         u.totalLinesDeleted || 0
      };
    }).sort((a, b) => b.totalCodingEvents - a.totalCodingEvents);

    // ── Workspace coding summary ───────────────────────────────────────────
    const totalCodeEdits      = codingMetrics.reduce((s, m) => s + m.codeEdits, 0);
    const totalExecutions     = codingMetrics.reduce((s, m) => s + m.codeExecutions, 0);
    const avgSuccessRate      = codingMetrics.length > 0
      ? Math.round(codingMetrics.reduce((s, m) => s + m.executionSuccessRate, 0) / codingMetrics.length)
      : 0;

    // ── CT-206 Validation ─────────────────────────────────────────────────
    const validation = runFullValidation({
      reportedTotalLines: 0,
      contributors: [],
      codingMetrics
    });

    res.json({
      workspaceId,
      generatedAt: new Date().toISOString(),
      summary: {
        totalCodeEdits,
        totalExecutions,
        avgSuccessRate,
        totalDevelopers: codingMetrics.length
      },
      codingMetrics,
      validation
    });
  } catch (err) {
    console.error('getCodingActivity Error:', err);
    res.status(500).json({ message: 'Failed to compute coding activity metrics', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CT-204: Get Participation Metrics
// GET /api/workspaces/:workspaceId/analytics/participation
// ─────────────────────────────────────────────────────────────────────────────
const getParticipationMetrics = async (req, res) => {
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

    // ── Session-based aggregation from WorkspaceSession ────────────────────
    // Note: WorkspaceSession.workspaceId is stored as String (see model)
    const sessionStats = await WorkspaceSession.aggregate([
      { $match: { workspaceId: String(wsObjectId) } },
      {
        $group: {
          _id: '$userId',
          sessionCount:    { $sum: 1 },
          role:            { $last: '$role' },
          firstJoined:     { $min: '$joinedAt' },
          lastActive:      { $max: '$lastActiveAt' },
          // Total duration: sum (leftAt - joinedAt) in ms; if no leftAt use lastActiveAt
          totalDurationMs: {
            $sum: {
              $subtract: [
                { $ifNull: ['$leftAt', '$lastActiveAt'] },
                '$joinedAt'
              ]
            }
          }
        }
      }
    ]);

    // Map session stats by userId string for easy lookup
    const sessionMap = new Map();
    sessionStats.forEach(s => sessionMap.set(String(s._id), s));

    const now = Date.now();

    // Build participation entries for all workspace members
    const allMembers = [];

    // Owner first
    if (workspace.owner) {
      const ownerId = String(workspace.owner._id);
      const s = sessionMap.get(ownerId) || {};
      allMembers.push({
        userId:          ownerId,
        userName:        workspace.owner.name || 'Owner',
        userEmail:       workspace.owner.email || '',
        role:            'owner',
        sessionCount:    s.sessionCount || 0,
        totalDurationMs: s.totalDurationMs || 0,
        totalDurationMin: Math.round((s.totalDurationMs || 0) / 60000),
        avgSessionDurationMin: s.sessionCount > 0
          ? Math.round(((s.totalDurationMs || 0) / s.sessionCount) / 60000)
          : 0,
        firstJoined:     s.firstJoined || workspace.createdAt || null,
        lastActive:      s.lastActive || null,
        daysSinceActive: s.lastActive ? Math.floor((now - new Date(s.lastActive)) / 86400000) : null,
        participationScore: calcParticipationScore(s)
      });
    }

    // Members
    (workspace.members || []).forEach(m => {
      const u = m.user;
      if (!u) return;
      const uid = String(u._id);
      const s = sessionMap.get(uid) || {};
      allMembers.push({
        userId:           uid,
        userName:         u.name || 'Collaborator',
        userEmail:        u.email || '',
        role:             m.role || 'editor',
        sessionCount:     s.sessionCount || 0,
        totalDurationMs:  s.totalDurationMs || 0,
        totalDurationMin: Math.round((s.totalDurationMs || 0) / 60000),
        avgSessionDurationMin: s.sessionCount > 0
          ? Math.round(((s.totalDurationMs || 0) / s.sessionCount) / 60000)
          : 0,
        firstJoined:     s.firstJoined || m.joinedAt || null,
        lastActive:      s.lastActive || null,
        daysSinceActive: s.lastActive ? Math.floor((now - new Date(s.lastActive)) / 86400000) : null,
        participationScore: calcParticipationScore(s)
      });
    });

    // Sort by participation score descending
    allMembers.sort((a, b) => b.participationScore - a.participationScore);

    const totalSessionTime = allMembers.reduce((s, m) => s + m.totalDurationMs, 0);
    const totalSessions    = allMembers.reduce((s, m) => s + m.sessionCount, 0);

    res.json({
      workspaceId,
      generatedAt: new Date().toISOString(),
      summary: {
        totalSessionTimeMin: Math.round(totalSessionTime / 60000),
        totalSessions,
        totalParticipants:   allMembers.length,
        avgSessionDurationMin: totalSessions > 0
          ? Math.round((totalSessionTime / totalSessions) / 60000)
          : 0
      },
      participationMetrics: allMembers
    });
  } catch (err) {
    console.error('getParticipationMetrics Error:', err);
    res.status(500).json({ message: 'Failed to compute participation metrics', error: err.message });
  }
};

/**
 * Participation score formula:
 *   sessionCount × 5  +  totalDurationMin × 0.1  (capped for sanity)
 */
function calcParticipationScore(s) {
  const durationMin = Math.round((s.totalDurationMs || 0) / 60000);
  return Math.round((s.sessionCount || 0) * 5 + Math.min(durationMin, 500) * 0.1);
}

// ─────────────────────────────────────────────────────────────────────────────
// CT-206: Run Standalone Validation Endpoint
// GET /api/workspaces/:workspaceId/analytics/validate
// ─────────────────────────────────────────────────────────────────────────────
const validateAnalytics = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const wsObjectId = toObjectId(workspaceId, res);
    if (!wsObjectId) return;

    // Pull raw data to cross-check
    const [rawTotal, byUserStats] = await Promise.all([
      ActivityLog.aggregate([
        { $match: { workspaceId: wsObjectId } },
        { $group: { _id: null, total: { $sum: '$totalLinesChanged' }, events: { $sum: 1 } } }
      ]),
      ActivityLog.aggregate([
        { $match: { workspaceId: wsObjectId } },
        {
          $group: {
            _id: '$userId',
            userName:          { $last: '$userName' },
            totalLinesChanged: { $sum: '$totalLinesChanged' },
            linesAdded:        { $sum: '$linesAdded' },
            linesDeleted:      { $sum: '$linesDeleted' },
            totalEvents:       { $sum: 1 },
            codeExecutions:    { $sum: { $cond: [{ $eq: ['$action', 'code_execution'] }, 1, 0] } },
            filesCreated:      { $sum: { $cond: [{ $eq: ['$action', 'file_create'] }, 1, 0] } }
          }
        }
      ])
    ]);

    const reportedTotal = rawTotal[0]?.total || 0;
    const totalEventsAll = rawTotal[0]?.events || 0;

    const contributors = byUserStats.map((u, idx) => {
      const lines   = u.totalLinesChanged || 0;
      const percent = reportedTotal > 0 ? Math.round((lines / reportedTotal) * 100) : 0;
      return {
        id:          String(u._id),
        name:        u.userName,
        lines,
        linesAdded:  u.linesAdded || 0,
        linesDeleted: u.linesDeleted || 0,
        totalEvents: u.totalEvents || 0,
        percent,
        score: calcContributionScore({
          linesAdded:     u.linesAdded,
          linesDeleted:   u.linesDeleted,
          codeExecutions: u.codeExecutions,
          filesCreated:   u.filesCreated
        })
      };
    });

    const validation = runFullValidation({
      reportedTotalLines: reportedTotal,
      contributors,
      codingMetrics: []
    });

    res.json({
      workspaceId,
      validatedAt: new Date().toISOString(),
      rawCounts: {
        totalLinesChanged: reportedTotal,
        totalEvents:       totalEventsAll,
        contributorCount:  contributors.length
      },
      ...validation
    });
  } catch (err) {
    console.error('validateAnalytics Error:', err);
    res.status(500).json({ message: 'Failed to run analytics validation', error: err.message });
  }
};

module.exports = {
  getContributionAnalytics,
  getCodingActivity,
  getParticipationMetrics,
  validateAnalytics
};
