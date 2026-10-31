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
const { runFullValidation, runSessionValidation } = require('../utils/analyticsValidator');

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

/**
 * Helper to format duration in ms to human-readable string
 */
const formatDuration = (ms) => {
  if (!ms || ms <= 0) return '0s';
  const totalSecs = Math.floor(ms / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

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


// ─────────────────────────────────────────────────────────────────────────────
// CT-198: Get Session Analytics & Summary
// GET /api/workspaces/:workspaceId/analytics/session
// ─────────────────────────────────────────────────────────────────────────────
const getSessionAnalytics = async (req, res) => {
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

    // Access check: verify user has access to workspace
    const requestingUserId = req.user?._id || req.user?.id;
    if (requestingUserId) {
      const isOwner = workspace.owner && String(workspace.owner._id) === String(requestingUserId);
      const isMember = (workspace.members || []).some(m => m.user && String(m.user._id) === String(requestingUserId));
      if (!isOwner && !isMember && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied: You are not a member of this workspace.' });
      }
    }

    // Fetch active/recent sessions from WorkspaceSession
    const wsSessions = await WorkspaceSession.find({ workspaceId: String(wsObjectId) })
      .populate('userId', 'name email')
      .lean();

    // Map sessions by userId
    const sessionMap = new Map();
    wsSessions.forEach(s => {
      if (s.userId) {
        const uid = String(s.userId._id || s.userId);
        sessionMap.set(uid, s);
      }
    });

    // ── Single aggregation pipeline on ActivityLog for optimal performance ──
    const [stats] = await ActivityLog.aggregate([
      { $match: { workspaceId: wsObjectId } },
      {
        $facet: {
          // (a) Participant summary
          byUser: [
            {
              $group: {
                _id: '$userId',
                userName:             { $last: '$userName' },
                userEmail:            { $last: '$userEmail' },
                userRole:             { $last: '$userRole' },
                totalEvents:          { $sum: 1 },
                linesAdded:           { $sum: '$linesAdded' },
                linesDeleted:         { $sum: '$linesDeleted' },
                totalLinesChanged:    { $sum: '$totalLinesChanged' },
                codeEdits:            { $sum: { $cond: [{ $eq: ['$action', 'code_edit'] }, 1, 0] } },
                filesCreated:         { $sum: { $cond: [{ $eq: ['$action', 'file_create'] }, 1, 0] } },
                filesDeleted:         { $sum: { $cond: [{ $eq: ['$action', 'file_delete'] }, 1, 0] } },
                filesRenamed:         { $sum: { $cond: [{ $eq: ['$action', 'file_rename'] }, 1, 0] } },
                codeExecutions:       { $sum: { $cond: [{ $eq: ['$action', 'code_execution'] }, 1, 0] } },
                successfulExecutions: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ['$action', 'code_execution'] }, { $eq: ['$executionStatus', 'success'] }] },
                      1, 0
                    ]
                  }
                },
                collaborationEvents: {
                  $sum: {
                    $cond: [
                      { $in: ['$action', ['session_start', 'session_end', 'member_join', 'member_leave', 'role_change', 'settings_update', 'general']] },
                      1, 0
                    ]
                  }
                },
                earliestTimestamp:    { $min: '$timestamp' },
                latestTimestamp:      { $max: '$timestamp' }
              }
            },
            { $sort: { totalEvents: -1, totalLinesChanged: -1 } }
          ],

          // (b) Category breakdown
          byAction: [
            {
              $group: {
                _id: '$action',
                count: { $sum: 1 }
              }
            }
          ],

          // (c) Hourly activity timeline
          hourlyTimeline: [
            {
              $group: {
                _id: {
                  date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                  hour: { $hour: '$timestamp' }
                },
                events:       { $sum: 1 },
                linesChanged: { $sum: '$totalLinesChanged' },
                codeEdits:    { $sum: { $cond: [{ $eq: ['$action', 'code_edit'] }, 1, 0] } },
                executions:   { $sum: { $cond: [{ $eq: ['$action', 'code_execution'] }, 1, 0] } }
              }
            },
            { $sort: { '_id.date': 1, '_id.hour': 1 } }
          ],

          // (d) Overall session bounds & totals
          overallBounds: [
            {
              $group: {
                _id: null,
                earliestEvent:     { $min: '$timestamp' },
                latestEvent:       { $max: '$timestamp' },
                totalEvents:       { $sum: 1 },
                totalLinesAdded:   { $sum: '$linesAdded' },
                totalLinesDeleted: { $sum: '$linesDeleted' },
                totalLinesChanged: { $sum: '$totalLinesChanged' },
                totalExecutions:   { $sum: { $cond: [{ $eq: ['$action', 'code_execution'] }, 1, 0] } },
                successfulExecs:   {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ['$action', 'code_execution'] }, { $eq: ['$executionStatus', 'success'] }] },
                      1, 0
                    ]
                  }
                }
              }
            }
          ]
        }
      }
    ]);

    const { byUser = [], byAction = [], hourlyTimeline = [], overallBounds = [] } = stats || {};
    const bounds = overallBounds[0] || {};

    const totalEventsAll = bounds.totalEvents || 0;
    const totalLinesAddedAll = bounds.totalLinesAdded || 0;
    const totalLinesDeletedAll = bounds.totalLinesDeleted || 0;
    const totalLinesChangedAll = bounds.totalLinesChanged || 0;
    const totalExecutionsAll = bounds.totalExecutions || 0;
    const successfulExecsAll = bounds.successfulExecs || 0;

    // Action category classification
    const actionCounts = {};
    byAction.forEach(a => { actionCounts[a._id] = a.count; });

    const codingCount = actionCounts['code_edit'] || 0;
    const fileOpsCount = (actionCounts['file_create'] || 0) + (actionCounts['file_delete'] || 0) + (actionCounts['file_rename'] || 0);
    const executionsCount = actionCounts['code_execution'] || 0;
    const collaborationCount = (actionCounts['session_start'] || 0) +
                               (actionCounts['session_end'] || 0) +
                               (actionCounts['member_join'] || 0) +
                               (actionCounts['member_leave'] || 0) +
                               (actionCounts['role_change'] || 0) +
                               (actionCounts['settings_update'] || 0) +
                               (actionCounts['general'] || 0);

    const eventCategories = {
      coding: codingCount,
      fileOps: fileOpsCount,
      executions: executionsCount,
      collaboration: collaborationCount
    };

    // Calculate session duration safely
    const sessionEarliest = bounds.earliestEvent || (wsSessions.length > 0 ? wsSessions.reduce((min, s) => s.joinedAt && (!min || s.joinedAt < min) ? s.joinedAt : min, null) : null) || workspace.createdAt;
    const sessionLatest   = bounds.latestEvent || (wsSessions.length > 0 ? wsSessions.reduce((max, s) => s.lastActiveAt && (!max || s.lastActiveAt > max) ? s.lastActiveAt : max, null) : null) || workspace.updatedAt;

    let sessionDurationMs = 0;
    if (sessionEarliest && sessionLatest) {
      sessionDurationMs = Math.max(0, new Date(sessionLatest).getTime() - new Date(sessionEarliest).getTime());
    }
    const sessionDurationSeconds = Math.round(sessionDurationMs / 1000);
    const sessionDurationFormatted = formatDuration(sessionDurationMs);

    // Active session duration accumulated from sessions
    const activeTimeMs = wsSessions.reduce((sum, s) => {
      const start = s.joinedAt ? new Date(s.joinedAt).getTime() : 0;
      const end = (s.leftAt ? new Date(s.leftAt).getTime() : (s.lastActiveAt ? new Date(s.lastActiveAt).getTime() : start));
      return sum + Math.max(0, end - start);
    }, 0);
    const activeTimeSeconds = Math.round(activeTimeMs / 1000);
    const activeTimeFormatted = formatDuration(activeTimeMs);

    // Build comprehensive participant breakdown
    // Map existing activity by string userId
    const activityMap = new Map();
    byUser.forEach(u => {
      const uid = String(u._id || 'unknown');
      activityMap.set(uid, u);
    });

    const COLOR_PALETTE = ['#8B5CF6', '#38BDF8', '#10B981', '#F59E0B', '#EC4899', '#6366F1'];
    const participants = [];
    const processedUserIds = new Set();

    // Helper to add participant
    const addParticipant = (userObj, roleDefault) => {
      if (!userObj) return;
      const uid = String(userObj._id || userObj.id || userObj);
      if (processedUserIds.has(uid)) return;
      processedUserIds.add(uid);

      const act = activityMap.get(uid) || {};
      const sess = sessionMap.get(uid) || null;

      const userEvents = act.totalEvents || 0;
      const sharePercent = totalEventsAll > 0 ? Math.round((userEvents / totalEventsAll) * 100) : 0;
      const userExecs = act.codeExecutions || 0;
      const userSuccessExecs = act.successfulExecutions || 0;
      const execSuccessRate = userExecs > 0 ? Math.round((userSuccessExecs / userExecs) * 100) : 0;

      // Determine real-time participant status
      let status = 'offline';
      if (sess) {
        if (sess.status === 'online') {
          const isRecentlyActive = sess.lastActiveAt && (Date.now() - new Date(sess.lastActiveAt).getTime() < 5 * 60 * 1000);
          status = isRecentlyActive ? 'online' : 'away';
        } else if (sess.status === 'away') {
          status = 'away';
        }
      }

      const score = calcContributionScore({
        linesAdded:     act.linesAdded || 0,
        linesDeleted:   act.linesDeleted || 0,
        codeExecutions: userExecs,
        filesCreated:   act.filesCreated || 0
      });

      participants.push({
        userId:               uid,
        userName:             userObj.name || act.userName || 'Developer',
        userEmail:            userObj.email || act.userEmail || '',
        avatar:               userObj.avatar || null,
        role:                 roleDefault || act.userRole || sess?.role || 'editor',
        status,
        totalEvents:          userEvents,
        activitySharePercent: sharePercent,
        linesAdded:           act.linesAdded || 0,
        linesDeleted:         act.linesDeleted || 0,
        totalLinesChanged:    act.totalLinesChanged || 0,
        codeEdits:            act.codeEdits || 0,
        filesCreated:         act.filesCreated || 0,
        filesDeleted:         act.filesDeleted || 0,
        filesRenamed:         act.filesRenamed || 0,
        codeExecutions:       userExecs,
        executionSuccessRate: execSuccessRate,
        collaborationEvents:  act.collaborationEvents || 0,
        contributionScore:    score,
        firstActiveAt:        act.earliestTimestamp || sess?.joinedAt || null,
        lastActiveAt:         act.latestTimestamp || sess?.lastActiveAt || null,
        hasRecordedActivity:  userEvents > 0,
        color:                COLOR_PALETTE[participants.length % COLOR_PALETTE.length]
      });
    };

    // 1. Owner
    if (workspace.owner) {
      addParticipant(workspace.owner, 'owner');
    }

    // 2. Members
    (workspace.members || []).forEach(m => {
      if (m.user) {
        addParticipant(m.user, m.role || 'editor');
      }
    });

    // 3. Any additional contributors in activity log (e.g. historical contributors)
    byUser.forEach(u => {
      const uid = String(u._id);
      if (!processedUserIds.has(uid)) {
        addParticipant({ _id: uid, name: u.userName, email: u.userEmail }, u.userRole || 'editor');
      }
    });

    // Sort participants by totalEvents descending, then linesChanged descending
    participants.sort((a, b) => b.totalEvents - a.totalEvents || b.totalLinesChanged - a.totalLinesChanged);

    // Normalize share percentages so they sum to 100% if events > 0
    if (totalEventsAll > 0 && participants.length > 0) {
      const currentSum = participants.reduce((s, p) => s + p.activitySharePercent, 0);
      if (currentSum !== 100 && participants.some(p => p.totalEvents > 0)) {
        // Adjust the top contributor by the rounding diff
        const top = participants.find(p => p.totalEvents > 0);
        if (top) {
          top.activitySharePercent += (100 - currentSum);
        }
      }
    }

    const totalParticipants = participants.length;
    const activeParticipants = participants.filter(p => p.status === 'online').length;
    const overallSuccessRate = totalExecutionsAll > 0 ? Math.round((successfulExecsAll / totalExecutionsAll) * 100) : 0;

    const sessionSummary = {
      status:                   activeParticipants > 0 ? 'active' : (totalEventsAll > 0 ? 'completed' : 'empty'),
      sessionDurationFormatted,
      sessionDurationSeconds,
      activeTimeFormatted,
      activeTimeSeconds,
      totalParticipants,
      activeParticipants,
      offlineParticipants:      Math.max(0, totalParticipants - activeParticipants),
      totalEvents:              totalEventsAll,
      totalLinesAdded:          totalLinesAddedAll,
      totalLinesDeleted:        totalLinesDeletedAll,
      totalLinesChanged:        totalLinesChangedAll,
      totalExecutions:          totalExecutionsAll,
      successfulExecutions:     successfulExecsAll,
      executionSuccessRate:     overallSuccessRate,
      startedAt:                sessionEarliest,
      lastActiveAt:             sessionLatest,
      mostActiveParticipant:    participants.length > 0 && participants[0].totalEvents > 0
        ? { userId: participants[0].userId, name: participants[0].userName, events: participants[0].totalEvents }
        : null
    };

    // Format timeline for UI visualization
    const activityTimeline = hourlyTimeline.map(t => ({
      label:        `${String(t._id.hour).padStart(2, '0')}:00`,
      date:         t._id.date,
      events:       t.events,
      linesChanged: t.linesChanged,
      codeEdits:    t.codeEdits,
      executions:   t.executions
    }));

    // CT-201 Session Analytics Validation
    const validation = runSessionValidation({
      sessionSummary,
      participants,
      eventCategories,
      rawEvents: []
    });

    res.json({
      workspaceId,
      workspaceTitle: workspace.title,
      generatedAt: new Date().toISOString(),
      sessionSummary,
      eventCategoryBreakdown: eventCategories,
      participantBreakdown: participants,
      activityTimeline,
      validation
    });
  } catch (err) {
    console.error('getSessionAnalytics Error:', err);
    res.status(500).json({ message: 'Failed to compute session analytics', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CT-201: Run Standalone Session Analytics Validation Endpoint
// GET /api/workspaces/:workspaceId/analytics/session/validate
// ─────────────────────────────────────────────────────────────────────────────
const validateSessionAnalyticsEndpoint = async (req, res) => {
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

    // Pull raw events and sessions
    const [rawEvents, wsSessions] = await Promise.all([
      ActivityLog.find({ workspaceId: wsObjectId }).sort({ sequenceNumber: 1 }).lean(),
      WorkspaceSession.find({ workspaceId: String(wsObjectId) }).lean()
    ]);

    const totalEvents = rawEvents.length;
    let coding = 0;
    let fileOps = 0;
    let executions = 0;
    let collaboration = 0;
    const byUserMap = new Map();

    for (const ev of rawEvents) {
      if (ev.action === 'code_edit') coding++;
      else if (['file_create', 'file_delete', 'file_rename'].includes(ev.action)) fileOps++;
      else if (ev.action === 'code_execution') executions++;
      else collaboration++;

      const uid = String(ev.userId || 'unknown');
      const cur = byUserMap.get(uid) || { totalEvents: 0, linesAdded: 0, linesDeleted: 0, totalLinesChanged: 0 };
      cur.totalEvents++;
      cur.linesAdded += (ev.linesAdded || 0);
      cur.linesDeleted += (ev.linesDeleted || 0);
      cur.totalLinesChanged += (ev.totalLinesChanged || 0);
      byUserMap.set(uid, cur);
    }

    const participants = [];
    const seen = new Set();
    const addP = (u) => {
      const uid = String(u._id || u.id || u);
      if (seen.has(uid)) return;
      seen.add(uid);
      const a = byUserMap.get(uid) || { totalEvents: 0, linesAdded: 0, linesDeleted: 0, totalLinesChanged: 0 };
      const share = totalEvents > 0 ? Math.round((a.totalEvents / totalEvents) * 100) : 0;
      participants.push({
        userId: uid,
        userName: u.name || 'Member',
        totalEvents: a.totalEvents,
        linesAdded: a.linesAdded,
        linesDeleted: a.linesDeleted,
        totalLinesChanged: a.totalLinesChanged,
        activitySharePercent: share
      });
    };

    if (workspace.owner) addP(workspace.owner);
    (workspace.members || []).forEach(m => { if (m.user) addP(m.user); });
    byUserMap.forEach((_, uid) => { if (!seen.has(uid)) addP({ _id: uid, name: 'Contributor' }); });

    if (totalEvents > 0 && participants.length > 0) {
      const curSum = participants.reduce((s, p) => s + p.activitySharePercent, 0);
      if (curSum !== 100) {
        participants[0].activitySharePercent += (100 - curSum);
      }
    }

    const firstTime = rawEvents[0]?.timestamp || workspace.createdAt;
    const lastTime = rawEvents[rawEvents.length - 1]?.timestamp || workspace.updatedAt;
    const durationMs = Math.max(0, new Date(lastTime).getTime() - new Date(firstTime).getTime());
    const durationSec = Math.round(durationMs / 1000);

    const activeParticipants = wsSessions.filter(s => s.status === 'online').length;

    const sessionSummary = {
      sessionDurationSeconds: durationSec,
      sessionDurationFormatted: formatDuration(durationMs),
      startedAt: firstTime,
      lastActiveAt: lastTime,
      totalParticipants: participants.length,
      activeParticipants: Math.min(activeParticipants, participants.length),
      totalEvents
    };

    const eventCategories = { coding, fileOps, executions, collaboration };

    const validation = runSessionValidation({
      sessionSummary,
      participants,
      eventCategories,
      rawEvents
    });

    res.json({
      workspaceId,
      validatedAt: new Date().toISOString(),
      rawStats: {
        rawEventsCount: rawEvents.length,
        rawSessionsCount: wsSessions.length,
        totalParticipants: participants.length
      },
      ...validation
    });
  } catch (err) {
    console.error('validateSessionAnalyticsEndpoint Error:', err);
    res.status(500).json({ message: 'Failed to run session analytics validation', error: err.message });
  }
};

module.exports = {
  getContributionAnalytics,
  getCodingActivity,
  getParticipationMetrics,
  validateAnalytics,
  // CT-198 & CT-201
  getSessionAnalytics,
  validateSessionAnalyticsEndpoint
};
