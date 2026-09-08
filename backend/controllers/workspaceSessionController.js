const WorkspaceSession = require('../models/WorkspaceSession');
const Workspace = require('../models/Workspace');

const getWorkspaceRole = (workspace, userId) => {
  if (workspace.owner.toString() === userId.toString()) return 'owner';
  const member = workspace.members.find(item => item.user.toString() === userId.toString());
  return member?.role || null;
};

const getWorkspaceForMember = async (workspaceId, userId) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { workspace: null, role: null };
  return { workspace, role: getWorkspaceRole(workspace, userId) };
};

/**
 * API 1 — Enter Workspace (POST /api/workspaces/:workspaceId/session)
 * Creates or reactivates user's session in the workspace.
 */
const enterWorkspaceSession = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { workspaceId } = req.params;
    const { role } = await getWorkspaceForMember(workspaceId, userId);
    if (!role) return res.status(403).json({ message: 'You are not a member of this workspace.' });
    const sessionRole = role === 'owner' ? 'admin' : role;
    const currentFileId = req.body.currentFileId || 'index.js';

    const session = await WorkspaceSession.findOneAndUpdate(
      { userId, workspaceId },
      {
        role: sessionRole,
        status: 'online',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        leftAt: null,
        currentFileId
      },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    ).populate('userId', 'name email role');

    return res.status(200).json({
      message: 'Workspace session started',
      session
    });
  } catch (error) {
    console.error('Error in enterWorkspaceSession:', error);
    return res.status(500).json({ message: 'Failed to enter workspace session', error: error.message });
  }
};

/**
 * API 2 — Get Current User Session (GET /api/workspaces/:workspaceId/session)
 */
const getCurrentSession = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { workspaceId } = req.params;
    const access = await getWorkspaceForMember(workspaceId, userId);
    if (!access.role) return res.status(403).json({ message: 'You are not a member of this workspace.' });

    const session = await WorkspaceSession.findOne({ userId, workspaceId })
      .populate('userId', 'name email role');

    if (!session) {
      return res.status(444 || 404).json({ message: 'No active session found for user in workspace' });
    }

    // Dynamic Away calculation if inactive > 5 mins
    if (session.status === 'online' && (Date.now() - new Date(session.lastActiveAt).getTime() > 5 * 60 * 1000)) {
      session.status = 'away';
      await session.save();
    }

    return res.status(200).json({ session });
  } catch (error) {
    console.error('Error in getCurrentSession:', error);
    return res.status(500).json({ message: 'Failed to retrieve session', error: error.message });
  }
};

/**
 * API — Get All Workspace Active Sessions (GET /api/workspaces/:workspaceId/sessions)
 * Returns active members currently inside the workspace.
 */
const getWorkspaceSessions = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { workspaceId } = req.params;
    const access = await getWorkspaceForMember(workspaceId, userId);
    if (!access.role) return res.status(403).json({ message: 'You are not a member of this workspace.' });
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Auto update status to away for inactive sessions
    await WorkspaceSession.updateMany(
      { workspaceId, status: 'online', lastActiveAt: { $lt: fiveMinsAgo } },
      { $set: { status: 'away' } }
    );

    const sessions = await WorkspaceSession.find({ workspaceId })
      .populate('userId', 'name email role')
      .sort({ lastActiveAt: -1 });

    return res.status(200).json({
      workspaceId,
      count: sessions.length,
      sessions
    });
  } catch (error) {
    console.error('Error in getWorkspaceSessions:', error);
    return res.status(500).json({ message: 'Failed to list workspace sessions', error: error.message });
  }
};

/**
 * API 3 — Update Activity Heartbeat (PATCH /api/workspaces/:workspaceId/session/activity)
 */
const updateActivity = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { workspaceId } = req.params;
    const access = await getWorkspaceForMember(workspaceId, userId);
    if (!access.role) return res.status(403).json({ message: 'You are not a member of this workspace.' });

    const session = await WorkspaceSession.findOneAndUpdate(
      { userId, workspaceId },
      {
        lastActiveAt: new Date(),
        status: 'online'
      },
      { returnDocument: 'after' }
    ).populate('userId', 'name email role');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    return res.status(200).json({
      message: 'Session activity updated',
      session
    });
  } catch (error) {
    console.error('Error in updateActivity:', error);
    return res.status(500).json({ message: 'Failed to update activity', error: error.message });
  }
};

/**
 * API 4 — Update Current File (PATCH /api/workspaces/:workspaceId/session/file)
 */
const updateCurrentFile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { workspaceId } = req.params;
    const access = await getWorkspaceForMember(workspaceId, userId);
    if (!access.role) return res.status(403).json({ message: 'You are not a member of this workspace.' });
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ message: 'fileId is required' });
    }

    const session = await WorkspaceSession.findOneAndUpdate(
      { userId, workspaceId },
      {
        currentFileId: fileId,
        lastActiveAt: new Date(),
        status: 'online'
      },
      { returnDocument: 'after' }
    ).populate('userId', 'name email role');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    return res.status(200).json({
      message: 'Current file updated',
      session
    });
  } catch (error) {
    console.error('Error in updateCurrentFile:', error);
    return res.status(500).json({ message: 'Failed to update active file', error: error.message });
  }
};

/**
 * API 5 — Leave Workspace (DELETE /api/workspaces/:workspaceId/session)
 */
const leaveWorkspaceSession = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { workspaceId } = req.params;
    const access = await getWorkspaceForMember(workspaceId, userId);
    if (!access.role) return res.status(403).json({ message: 'You are not a member of this workspace.' });

    const session = await WorkspaceSession.findOneAndUpdate(
      { userId, workspaceId },
      {
        status: 'offline',
        leftAt: new Date(),
        lastActiveAt: new Date(),
        socketId: null
      },
      { returnDocument: 'after' }
    );

    return res.status(200).json({
      message: 'Workspace session ended',
      session
    });
  } catch (error) {
    console.error('Error in leaveWorkspaceSession:', error);
    return res.status(500).json({ message: 'Failed to leave workspace session', error: error.message });
  }
};

module.exports = {
  enterWorkspaceSession,
  getCurrentSession,
  getWorkspaceSessions,
  updateActivity,
  updateCurrentFile,
  leaveWorkspaceSession
};
