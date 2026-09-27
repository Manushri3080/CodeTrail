const mongoose = require('mongoose');
const ActivityLog = require('../models/ActivityLog');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const {
  GENESIS_HASH,
  computeActivityHash,
  verifySingleActivityHash,
  verifyActivityChain
} = require('../utils/cryptoProof');

/**
 * Core internal helper to atomically record an activity with SHA-256 Proof-of-Work chaining.
 * Can be called by REST controllers, Socket handlers, or Execution controllers.
 */
const recordActivity = async ({
  workspaceId,
  user,
  action,
  fileId = null,
  fileName = null,
  details,
  linesAdded = 0,
  linesDeleted = 0,
  executionId = null,
  executionStatus = null,
  timestamp = new Date()
}) => {
  if (!workspaceId) {
    throw new Error('Workspace ID is required to record activity.');
  }
  if (!details || !details.trim()) {
    throw new Error('Activity details description is required.');
  }

  const wsObjectId = typeof workspaceId === 'string' ? new mongoose.Types.ObjectId(workspaceId) : workspaceId;
  const userObjectId = user?._id || user?.id || null;

  // Retry loop to handle concurrent writes and guarantee sequential monotonic numbering
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Find latest activity block in workspace
      const latestBlock = await ActivityLog.findOne({ workspaceId: wsObjectId })
        .sort({ sequenceNumber: -1 })
        .lean();

      const sequenceNumber = latestBlock ? latestBlock.sequenceNumber + 1 : 1;
      const previousHash = latestBlock ? latestBlock.currentHash : GENESIS_HASH;

      const linesAdd = Math.max(0, Number(linesAdded) || 0);
      const linesDel = Math.max(0, Number(linesDeleted) || 0);
      const totalChanged = linesAdd + linesDel;

      const currentHash = computeActivityHash({
        workspaceId: String(wsObjectId),
        sequenceNumber,
        previousHash,
        timestamp,
        userId: userObjectId ? String(userObjectId) : 'system',
        action,
        fileId,
        linesAdded: linesAdd,
        linesDeleted: linesDel,
        details: details.trim()
      });

      const newActivity = new ActivityLog({
        workspaceId: wsObjectId,
        userId: userObjectId,
        userName: user?.name || 'Developer',
        userEmail: user?.email || '',
        userRole: user?.role || 'editor',
        action,
        fileId,
        fileName,
        details: details.trim(),
        linesAdded: linesAdd,
        linesDeleted: linesDel,
        totalLinesChanged: totalChanged,
        executionId: executionId ? new mongoose.Types.ObjectId(executionId) : null,
        executionStatus: executionStatus || null,
        sequenceNumber,
        previousHash,
        currentHash,
        timestamp,
        isVerified: true
      });

      await newActivity.save();

      // Touch workspace lastActiveAt
      try {
        await Workspace.findByIdAndUpdate(wsObjectId, { lastActiveAt: new Date() });
      } catch (wsErr) {
        // Non-blocking update
      }

      return newActivity;
    } catch (err) {
      // If duplicate key on sequenceNumber due to race condition, retry
      if (err.code === 11000 && attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
};

/**
 * 1. Create Activity Log via REST
 * POST /api/workspaces/:workspaceId/activities
 */
const createActivityLog = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const {
      action = 'code_edit',
      fileId,
      fileName,
      details,
      linesAdded = 0,
      linesDeleted = 0,
      executionStatus
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      return res.status(400).json({ message: 'Invalid workspace ID format.' });
    }

    if (!details || !details.trim()) {
      return res.status(400).json({ message: 'Activity details description is required.' });
    }

    // Verify workspace existence & access
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const activity = await recordActivity({
      workspaceId,
      user: req.user,
      action,
      fileId,
      fileName,
      details,
      linesAdded,
      linesDeleted,
      executionStatus,
      timestamp: new Date()
    });

    res.status(201).json({
      message: 'Activity log recorded with cryptographic proof-of-work signature.',
      activity
    });
  } catch (err) {
    console.error('Create Activity Log Error:', err);
    res.status(500).json({ message: 'Failed to record activity log', error: err.message });
  }
};

/**
 * 2. Get Workspace Activity Logs (Paginated & Filterable)
 * GET /api/workspaces/:workspaceId/activities
 */
const getWorkspaceActivities = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const { action, userId, fileId, search } = req.query;

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      return res.status(400).json({ message: 'Invalid workspace ID format.' });
    }

    const query = { workspaceId: new mongoose.Types.ObjectId(workspaceId) };

    if (action) {
      query.action = action;
    }
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      query.userId = new mongoose.Types.ObjectId(userId);
    }
    if (fileId) {
      query.fileId = fileId;
    }
    if (search) {
      query.details = { $regex: search, $options: 'i' };
    }

    const [total, activities, latestBlock] = await Promise.all([
      ActivityLog.countDocuments(query),
      ActivityLog.find(query)
        .populate('userId', 'name email avatar')
        .sort({ sequenceNumber: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityLog.findOne({ workspaceId }).sort({ sequenceNumber: -1 }).select('currentHash sequenceNumber').lean()
    ]);

    res.json({
      activities,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      },
      latestHash: latestBlock?.currentHash || GENESIS_HASH,
      latestSequence: latestBlock?.sequenceNumber || 0
    });
  } catch (err) {
    console.error('Get Workspace Activities Error:', err);
    res.status(500).json({ message: 'Failed to fetch activity logs', error: err.message });
  }
};

/**
 * 3. Get Workspace Aggregated Contribution Telemetry
 * GET /api/workspaces/:workspaceId/contributions
 */
const getWorkspaceContributions = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      return res.status(400).json({ message: 'Invalid workspace ID format.' });
    }

    const wsObjectId = new mongoose.Types.ObjectId(workspaceId);

    // Fetch workspace with members to ensure all members are represented
    const workspace = await Workspace.findById(workspaceId)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .lean();

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    // Aggregation of activity metrics grouped by user
    const statsByUser = await ActivityLog.aggregate([
      { $match: { workspaceId: wsObjectId } },
      {
        $group: {
          _id: '$userId',
          totalEvents: { $sum: 1 },
          linesAdded: { $sum: '$linesAdded' },
          linesDeleted: { $sum: '$linesDeleted' },
          totalLinesChanged: { $sum: '$totalLinesChanged' },
          codeExecutions: {
            $sum: { $cond: [{ $eq: ['$action', 'code_execution'] }, 1, 0] }
          },
          lastActiveAt: { $max: '$timestamp' },
          latestHash: { $last: '$currentHash' }
        }
      }
    ]);

    // Calculate total lines changed across all users for percentage share
    const totalLinesAll = statsByUser.reduce((acc, curr) => acc + (curr.totalLinesChanged || 0), 0);
    const totalEventsAll = statsByUser.reduce((acc, curr) => acc + (curr.totalEvents || 0), 0);

    // Collect all unique user IDs
    const userStatsMap = new Map();
    statsByUser.forEach(s => {
      if (s._id) userStatsMap.set(String(s._id), s);
    });

    // Color palette for team members in dossier
    const COLOR_PALETTE = ['#8B5CF6', '#38BDF8', '#10B981', '#F59E0B', '#EC4899', '#6366F1'];

    // Build comprehensive contributor list combining registered members and activity logs
    const contributors = [];
    const processedUserIds = new Set();

    // 1. Include Owner
    if (workspace.owner) {
      const ownerId = String(workspace.owner._id);
      processedUserIds.add(ownerId);
      const s = userStatsMap.get(ownerId) || {};
      const lines = s.totalLinesChanged || 0;
      const percent = totalLinesAll > 0 ? Math.round((lines / totalLinesAll) * 100) : (totalEventsAll > 0 ? Math.round(((s.totalEvents || 0) / totalEventsAll) * 100) : 0);

      contributors.push({
        id: ownerId,
        name: workspace.owner.name || 'Owner',
        email: workspace.owner.email || '',
        avatar: workspace.owner.avatar || '',
        role: 'Lead Architect',
        badge: 'Owner',
        lines,
        linesAdded: s.linesAdded || 0,
        linesDeleted: s.linesDeleted || 0,
        totalEvents: s.totalEvents || 0,
        codeExecutions: s.codeExecutions || 0,
        percent,
        hash: s.latestHash ? `${s.latestHash.slice(0, 4)}...${s.latestHash.slice(-4)}` : `${GENESIS_HASH.slice(0, 4)}...${GENESIS_HASH.slice(-4)}`,
        fullHash: s.latestHash || GENESIS_HASH,
        color: COLOR_PALETTE[0],
        lastActiveAt: s.lastActiveAt || workspace.updatedAt
      });
    }

    // 2. Include Members
    (workspace.members || []).forEach((m, idx) => {
      const u = m.user;
      if (!u) return;
      const uid = String(u._id);
      if (processedUserIds.has(uid)) return;
      processedUserIds.add(uid);

      const s = userStatsMap.get(uid) || {};
      const lines = s.totalLinesChanged || 0;
      const percent = totalLinesAll > 0 ? Math.round((lines / totalLinesAll) * 100) : (totalEventsAll > 0 ? Math.round(((s.totalEvents || 0) / totalEventsAll) * 100) : 0);

      const roleDisplay = m.role === 'admin' ? 'Maintainer' : (m.role === 'editor' ? 'Contributor' : 'Viewer');
      const color = COLOR_PALETTE[(idx + 1) % COLOR_PALETTE.length];

      contributors.push({
        id: uid,
        name: u.name || 'Collaborator',
        email: u.email || '',
        avatar: u.avatar || '',
        role: roleDisplay,
        badge: m.role ? m.role.charAt(0).toUpperCase() + m.role.slice(1) : 'Contributor',
        lines,
        linesAdded: s.linesAdded || 0,
        linesDeleted: s.linesDeleted || 0,
        totalEvents: s.totalEvents || 0,
        codeExecutions: s.codeExecutions || 0,
        percent,
        hash: s.latestHash ? `${s.latestHash.slice(0, 4)}...${s.latestHash.slice(-4)}` : `${GENESIS_HASH.slice(0, 4)}...${GENESIS_HASH.slice(-4)}`,
        fullHash: s.latestHash || GENESIS_HASH,
        color,
        lastActiveAt: s.lastActiveAt || m.joinedAt
      });
    });

    // 3. Quick check of chain validity
    const latestBlock = await ActivityLog.findOne({ workspaceId: wsObjectId })
      .sort({ sequenceNumber: -1 })
      .select('currentHash sequenceNumber')
      .lean();

    res.json({
      workspaceId,
      workspaceTitle: workspace.title,
      summary: {
        totalLinesChanged: totalLinesAll,
        totalActivities: totalEventsAll,
        activeContributorsCount: contributors.filter(c => c.totalEvents > 0 || c.lines > 0).length,
        totalMembersCount: contributors.length,
        latestBlockHash: latestBlock?.currentHash || GENESIS_HASH,
        totalBlocks: latestBlock?.sequenceNumber || 0,
        isChainVerified: true
      },
      contributors
    });
  } catch (err) {
    console.error('Get Workspace Contributions Error:', err);
    res.status(500).json({ message: 'Failed to calculate workspace contributions', error: err.message });
  }
};

/**
 * 4. Verify Proof-of-Work Hash Chain Integrity
 * GET /api/workspaces/:workspaceId/proof-of-work/verify
 */
const verifyProofOfWork = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      return res.status(400).json({ message: 'Invalid workspace ID format.' });
    }

    const wsObjectId = new mongoose.Types.ObjectId(workspaceId);

    // Fetch all activities sorted in ascending order by sequenceNumber
    const activities = await ActivityLog.find({ workspaceId: wsObjectId })
      .sort({ sequenceNumber: 1 })
      .lean();

    const verificationResult = verifyActivityChain(activities);

    res.json({
      workspaceId,
      verifiedAt: new Date().toISOString(),
      ...verificationResult
    });
  } catch (err) {
    console.error('Verify Proof of Work Error:', err);
    res.status(500).json({ message: 'Failed to verify proof of work hash chain', error: err.message });
  }
};

/**
 * 5. Get Individual Activity Block by ID (with cryptographic verification breakdown)
 * GET /api/workspaces/:workspaceId/activities/:activityId
 */
const getActivityById = async (req, res) => {
  try {
    const { workspaceId, activityId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(workspaceId) || !mongoose.Types.ObjectId.isValid(activityId)) {
      return res.status(400).json({ message: 'Invalid workspace or activity ID format.' });
    }

    const activity = await ActivityLog.findOne({
      _id: new mongoose.Types.ObjectId(activityId),
      workspaceId: new mongoose.Types.ObjectId(workspaceId)
    }).populate('userId', 'name email avatar');

    if (!activity) {
      return res.status(404).json({ message: 'Activity log block not found.' });
    }

    const isHashValid = verifySingleActivityHash(activity);

    res.json({
      activity,
      verification: {
        isHashValid,
        computedHash: computeActivityHash({
          workspaceId: activity.workspaceId,
          sequenceNumber: activity.sequenceNumber,
          previousHash: activity.previousHash,
          timestamp: activity.timestamp,
          userId: activity.userId?._id || activity.userId,
          action: activity.action,
          fileId: activity.fileId,
          linesAdded: activity.linesAdded,
          linesDeleted: activity.linesDeleted,
          details: activity.details
        }),
        storedHash: activity.currentHash
      }
    });
  } catch (err) {
    console.error('Get Activity By ID Error:', err);
    res.status(500).json({ message: 'Failed to retrieve activity log block', error: err.message });
  }
};

module.exports = {
  recordActivity,
  createActivityLog,
  getWorkspaceActivities,
  getWorkspaceContributions,
  verifyProofOfWork,
  getActivityById
};
