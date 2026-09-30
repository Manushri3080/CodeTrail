const WorkspaceSession = require('../models/WorkspaceSession');
const Workspace = require('../models/Workspace');
const telemetryStore = require('../utils/telemetryStore');

// In-memory version tracking: fileVersionMap[`${workspaceId}:${fileId}`] = currentVersionNumber
const fileVersionMap = new Map();

/**
 * Format total seconds into human readable time string like "1h 24m" or "45m"
 */
const formatTimeSpent = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const initWorkspaceSessionSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Socket] New client connected: ${socket.id}`);

    // Join Workspace Room (Supports both joinWorkspace and join_workspace_session)
    const handleJoin = async ({ workspaceId, user, currentFileId, activeFile, role }) => {
      try {
        if (!workspaceId) return;

        const fileId = currentFileId || activeFile || 'index.js';
        const roomName1 = `workspace:${workspaceId}`;
        const roomName2 = `workspace_${workspaceId}`;
        
        socket.join(roomName1);
        socket.join(roomName2);
        socket.workspaceId = workspaceId;
        socket.userId = user?.id || user?._id;
        socket.userRole = role || user?.role || 'editor';

        console.log(`[Socket] Client ${socket.id} (User ${socket.userId || 'Guest'}, Role ${socket.userRole}) joined ${roomName1}`);

        if (socket.userId) {
          // Verify actual member role against Workspace document if available
          try {
            const ws = await Workspace.findById(workspaceId);
            if (ws) {
              if (ws.owner && ws.owner.toString() === socket.userId.toString()) {
                socket.userRole = 'owner';
              } else if (Array.isArray(ws.members)) {
                const member = ws.members.find(m => (m.user?._id || m.user || '').toString() === socket.userId.toString());
                if (member && member.role) {
                  socket.userRole = member.role;
                }
              }
            }
          } catch (wsErr) {
            console.warn('[Socket] Workspace role check warning:', wsErr.message);
          }

          await WorkspaceSession.findOneAndUpdate(
            { userId: socket.userId, workspaceId },
            {
              socketId: socket.id,
              status: 'online',
              role: socket.userRole,
              lastActiveAt: new Date(),
              leftAt: null,
              ...(fileId ? { currentFileId: fileId } : {})
            },
            { upsert: true }
          );

          // Broadcast user joined to other members in the workspace room
          socket.to(roomName1).emit('userJoined', {
            userId: socket.userId,
            user: { ...(user || {}), role: socket.userRole },
            joinedAt: new Date()
          });
        }

        // Send updated workspace active presence list
        const activeSessions = await WorkspaceSession.find({ workspaceId })
          .populate('userId', 'name email role')
          .sort({ lastActiveAt: -1 });

        io.to(roomName1).emit('presenceUpdate', { workspaceId, sessions: activeSessions });
        io.to(roomName2).emit('active_users_update', {
          activeUsers: activeSessions.map(s => ({
            socketId: s.socketId,
            userId: s.userId?._id || s.userId,
            name: s.userId?.name || 'Developer',
            role: s.role,
            activeFile: s.currentFileId
          }))
        });

        // Immediately send initial Telemetry Dossier state (CT-167)
        const currentDossier = telemetryStore.getDossier(workspaceId);
        socket.emit('telemetry:dossier_sync', currentDossier);
        socket.emit('telemetry:dossier_update', currentDossier);
      } catch (err) {
        console.error('[Socket] Error in joinWorkspace:', err);
      }
    };

    socket.on('joinWorkspace', handleJoin);
    socket.on('join_workspace_session', handleJoin);

    // ==========================================
    // CT-164 & CT-167: REAL-TIME TELEMETRY ENGINE
    // ==========================================

    // Handle Intercepted Telemetry Action with Monotonic Sequence Counter (CT-164 & CT-167)
    socket.on('telemetry:action', async (rawEnvelope) => {
      try {
        const targetWorkspaceId = rawEnvelope?.workspaceId || socket.workspaceId;
        if (!targetWorkspaceId) return;

        const { envelope, dossier } = telemetryStore.recordAction(targetWorkspaceId, rawEnvelope);

        const room1 = `workspace:${targetWorkspaceId}`;
        const room2 = `workspace_${targetWorkspaceId}`;

        // Broadcast action envelope to peers in room with high-precision timestamp & sequence
        socket.to(room1).emit('telemetry:stream', envelope);
        socket.to(room2).emit('telemetry:stream', envelope);

        // Broadcast live updated dossier stats so peer dossier numbers update live (CT-167)
        io.to(room1).emit('telemetry:dossier_sync', dossier);
        io.to(room2).emit('telemetry:dossier_sync', dossier);
        io.emit('telemetry:dossier_update', dossier);
      } catch (err) {
        console.error('[Socket Telemetry] Error processing action:', err);
      }
    });

    // Request full dossier sync
    socket.on('telemetry:request_dossier', ({ workspaceId }) => {
      const targetId = workspaceId || socket.workspaceId;
      if (targetId) {
        const dossier = telemetryStore.getDossier(targetId);
        socket.emit('telemetry:dossier_sync', dossier);
        socket.emit('telemetry:dossier_update', dossier);
      }
    });

    // Sync active contribution time and session duration (CT-164)
    socket.on('telemetry:heartbeat', ({ workspaceId, user, metrics }) => {
      const targetId = workspaceId || socket.workspaceId;
      if (!targetId) return;

      const dossier = telemetryStore.recordHeartbeat(targetId, user, metrics);
      io.to(`workspace:${targetId}`).emit('telemetry:dossier_sync', dossier);
      io.to(`workspace_${targetId}`).emit('telemetry:dossier_sync', dossier);
    });

    // Activity Heartbeat Event
    socket.on('activityUpdate', async ({ workspaceId, userId }) => {
      try {
        if (!workspaceId || !userId) return;

        await WorkspaceSession.findOneAndUpdate(
          { userId, workspaceId },
          {
            status: 'online',
            lastActiveAt: new Date()
          }
        );

        const activeSessions = await WorkspaceSession.find({ workspaceId })
          .populate('userId', 'name email role')
          .sort({ lastActiveAt: -1 });

        io.to(`workspace:${workspaceId}`).emit('presenceUpdate', { workspaceId, sessions: activeSessions });
      } catch (err) {
        console.error('[Socket] Error in activityUpdate:', err);
      }
    });

    // File Opened Event
    socket.on('fileOpened', async ({ workspaceId, userId, fileId }) => {
      try {
        if (!workspaceId || !userId || !fileId) return;

        await WorkspaceSession.findOneAndUpdate(
          { userId, workspaceId },
          {
            currentFileId: fileId,
            status: 'online',
            lastActiveAt: new Date()
          }
        );

        io.to(`workspace:${workspaceId}`).emit('fileOpened', { userId, fileId });

        const activeSessions = await WorkspaceSession.find({ workspaceId })
          .populate('userId', 'name email role')
          .sort({ lastActiveAt: -1 });

        io.to(`workspace:${workspaceId}`).emit('presenceUpdate', { workspaceId, sessions: activeSessions });
      } catch (err) {
        console.error('[Socket] Error in fileOpened:', err);
      }
    });

    // Real-time Collaborative Code Synchronization with Viewer Guard & Version Counters (CT-85, CT-89)
    socket.on('code_change', async ({ workspaceId, fileId, content, version }) => {
      try {
        const targetWorkspaceId = workspaceId || socket.workspaceId;
        if (!targetWorkspaceId || !fileId) return;

        // 1. Backend Role Guard: Viewers cannot modify code
        let effectiveRole = socket.userRole;
        if (!effectiveRole && socket.userId) {
          const session = await WorkspaceSession.findOne({ userId: socket.userId, workspaceId: targetWorkspaceId });
          effectiveRole = session?.role;
        }

        if (effectiveRole === 'viewer') {
          console.warn(`[Socket Guard] Blocked unauthorized code_change from viewer user ${socket.userId || socket.id} on workspace ${targetWorkspaceId}`);
          socket.emit('code_change_error', {
            fileId,
            message: 'Permission denied: Viewers are not permitted to modify workspace code.',
            isViewer: true
          });
          return;
        }

        // 2. Version Counter & Conflict Guard (CT-89)
        const versionKey = `${targetWorkspaceId}:${fileId}`;
        const currentServerVersion = fileVersionMap.get(versionKey) || 0;
        const clientVersion = typeof version === 'number' ? version : (currentServerVersion + 1);

        // If client's edit version is strictly older than current server version, drop stale packet to prevent conflicts
        if (clientVersion < currentServerVersion) {
          console.warn(`[Socket Version] Packet conflict for file "${fileId}" in workspace "${targetWorkspaceId}". Incoming version (${clientVersion}) < server version (${currentServerVersion}). Dropping packet.`);
          socket.emit('code_conflict', {
            fileId,
            serverVersion: currentServerVersion,
            message: 'Code packet conflict: Client version is outdated.'
          });
          return;
        }

        const newVersion = Math.max(currentServerVersion + 1, clientVersion);
        fileVersionMap.set(versionKey, newVersion);

        const roomName1 = `workspace:${targetWorkspaceId}`;
        const roomName2 = `workspace_${targetWorkspaceId}`;
        
        // Broadcast to all other users in this workspace room with monotonic version counter
        socket.to(roomName1).emit('code_updated', {
          workspaceId: targetWorkspaceId,
          fileId,
          content,
          version: newVersion,
          updatedBy: socket.userId
        });
        socket.to(roomName2).emit('code_updated', {
          workspaceId: targetWorkspaceId,
          fileId,
          content,
          version: newVersion,
          updatedBy: socket.userId
        });
      } catch (err) {
        console.error('[Socket] Error in code_change:', err);
      }
    });

    // Real-time Collaborative Programming Language Selection
    socket.on('language_change', ({ workspaceId, fileId, language }) => {
      try {
        const targetWorkspaceId = workspaceId || socket.workspaceId;
        if (!targetWorkspaceId || !fileId || !language) return;

        const roomName = `workspace:${targetWorkspaceId}`;
        socket.to(roomName).emit('language_updated', {
          workspaceId: targetWorkspaceId,
          fileId,
          language,
          updatedBy: socket.userId
        });
      } catch (err) {
        console.error('[Socket] Error in language_change:', err);
      }
    });

    // Real-time File Management Events (Creation, Deletion, Renaming)
    socket.on('file_created', ({ workspaceId, file }) => {
      try {
        const targetWorkspaceId = workspaceId || socket.workspaceId;
        if (!targetWorkspaceId || !file) return;
        socket.to(`workspace:${targetWorkspaceId}`).emit('file_created', { file, createdBy: socket.userId });
      } catch (err) {
        console.error('[Socket] Error in file_created:', err);
      }
    });

    socket.on('file_deleted', ({ workspaceId, fileId }) => {
      try {
        const targetWorkspaceId = workspaceId || socket.workspaceId;
        if (!targetWorkspaceId || !fileId) return;
        socket.to(`workspace:${targetWorkspaceId}`).emit('file_deleted', { fileId, deletedBy: socket.userId });
      } catch (err) {
        console.error('[Socket] Error in file_deleted:', err);
      }
    });

    socket.on('file_renamed', ({ workspaceId, oldFileId, newFileId }) => {
      try {
        const targetWorkspaceId = workspaceId || socket.workspaceId;
        if (!targetWorkspaceId || !oldFileId || !newFileId) return;
        socket.to(`workspace:${targetWorkspaceId}`).emit('file_renamed', { oldFileId, newFileId, renamedBy: socket.userId });
      } catch (err) {
        console.error('[Socket] Error in file_renamed:', err);
      }
    });

    socket.on('files_updated', ({ workspaceId, files }) => {
      try {
        const targetWorkspaceId = workspaceId || socket.workspaceId;
        if (!targetWorkspaceId || !files) return;
        socket.to(`workspace:${targetWorkspaceId}`).emit('files_updated', { files, updatedBy: socket.userId });
      } catch (err) {
        console.error('[Socket] Error in files_updated:', err);
      }
    });

    // Real-time Multiplayer Monaco Cursor Tracking & Broadcast (CT-86)
    socket.on('cursor_position_update', (data) => {
      try {
        const targetWorkspaceId = data?.workspaceId || socket.workspaceId;
        if (!targetWorkspaceId) return;

        const payload = {
          ...data,
          workspaceId: targetWorkspaceId,
          userId: socket.userId || data?.user?.id || data?.user?._id || socket.id
        };

        socket.to(`workspace:${targetWorkspaceId}`).emit('cursor_position_updated', payload);
        socket.to(`workspace:${targetWorkspaceId}`).emit('cursor_updated', payload);
        socket.to(`workspace_${targetWorkspaceId}`).emit('cursor_position_updated', payload);
        socket.to(`workspace_${targetWorkspaceId}`).emit('cursor_updated', payload);
      } catch (err) {
        console.error('[Socket] Error in cursor_position_update:', err);
      }
    });

    socket.on('cursor_move', (data) => {
      try {
        const targetWorkspaceId = data?.workspaceId || socket.workspaceId;
        if (!targetWorkspaceId) return;

        const payload = {
          ...data,
          workspaceId: targetWorkspaceId,
          userId: socket.userId || data?.user?.id || data?.user?._id || socket.id
        };

        socket.to(`workspace:${targetWorkspaceId}`).emit('cursor_position_updated', payload);
        socket.to(`workspace:${targetWorkspaceId}`).emit('cursor_updated', payload);
        socket.to(`workspace_${targetWorkspaceId}`).emit('cursor_position_updated', payload);
        socket.to(`workspace_${targetWorkspaceId}`).emit('cursor_updated', payload);
      } catch (err) {
        console.error('[Socket] Error in cursor_move:', err);
      }
    });

    // Session Heartbeat & Duration Sync (CT-164)
    socket.on('session_heartbeat', async ({ workspaceId, durationSeconds = 30 }) => {
      const targetWorkspaceId = workspaceId || socket.workspaceId;
      if (!targetWorkspaceId) return;

      try {
        const workspace = await Workspace.findById(targetWorkspaceId);
        if (workspace) {
          workspace.totalActiveSeconds = (workspace.totalActiveSeconds || 0) + durationSeconds;
          workspace.timeSpent = formatTimeSpent(workspace.totalActiveSeconds);
          workspace.lastActiveAt = new Date();
          await workspace.save();

          io.to(`workspace:${targetWorkspaceId}`).emit('session_time_updated', {
            timeSpent: workspace.timeSpent,
            totalActiveSeconds: workspace.totalActiveSeconds
          });
          io.to(`workspace_${targetWorkspaceId}`).emit('session_time_updated', {
            timeSpent: workspace.timeSpent,
            totalActiveSeconds: workspace.totalActiveSeconds
          });
        }
      } catch (err) {
        console.error('[Socket Heartbeat Error]:', err.message);
      }
    });

    // Leave Workspace Explicitly
    const handleLeaveWorkspace = async (data = {}) => {
      try {
        const targetWorkspaceId = data?.workspaceId || socket.workspaceId;
        const uid = data?.userId || socket.userId;
        if (!targetWorkspaceId) return;

        const room1 = `workspace:${targetWorkspaceId}`;
        const room2 = `workspace_${targetWorkspaceId}`;
        socket.leave(room1);
        socket.leave(room2);

        if (uid) {
          await WorkspaceSession.findOneAndUpdate(
            { userId: uid, workspaceId: targetWorkspaceId },
            {
              status: 'offline',
              leftAt: new Date(),
              socketId: null
            }
          );

          socket.to(room1).emit('userLeft', { userId: uid, leftAt: new Date() });
          socket.to(room2).emit('userLeft', { userId: uid, leftAt: new Date() });
        }

        const activeSessions = await WorkspaceSession.find({ workspaceId: targetWorkspaceId })
          .populate('userId', 'name email role')
          .sort({ lastActiveAt: -1 });

        io.to(room1).emit('presenceUpdate', { workspaceId: targetWorkspaceId, sessions: activeSessions });
      } catch (err) {
        console.error('[Socket] Error in leaveWorkspace:', err);
      }
    };

    socket.on('leaveWorkspace', handleLeaveWorkspace);
    socket.on('leave_workspace_session', handleLeaveWorkspace);

    // Handle Client Disconnect (Window closed, tab crash, network loss)
    socket.on('disconnect', async () => {
      try {
        console.log(`[Socket] Client disconnected: ${socket.id}`);

        const session = await WorkspaceSession.findOneAndUpdate(
          { socketId: socket.id },
          {
            status: 'offline',
            leftAt: new Date(),
            socketId: null
          },
          { returnDocument: 'after' }
        );

        if (session) {
          const roomName1 = `workspace:${session.workspaceId}`;
          const roomName2 = `workspace_${session.workspaceId}`;
          socket.to(roomName1).emit('userLeft', { userId: session.userId, leftAt: new Date() });
          socket.to(roomName2).emit('userLeft', { userId: session.userId, leftAt: new Date() });

          const activeSessions = await WorkspaceSession.find({ workspaceId: session.workspaceId })
            .populate('userId', 'name email role')
            .sort({ lastActiveAt: -1 });

          io.to(roomName1).emit('presenceUpdate', { workspaceId: session.workspaceId, sessions: activeSessions });
        }
      } catch (err) {
        console.error('[Socket] Error in disconnect:', err);
      }
    });
  });
};

module.exports = initWorkspaceSessionSocket;
