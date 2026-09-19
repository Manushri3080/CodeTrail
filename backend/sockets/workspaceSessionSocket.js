const WorkspaceSession = require('../models/WorkspaceSession');
const Workspace = require('../models/Workspace');

// In-memory version tracking: fileVersionMap[`${workspaceId}:${fileId}`] = currentVersionNumber
const fileVersionMap = new Map();

const initWorkspaceSessionSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Socket] New client connected: ${socket.id}`);

    // Join Workspace Room
    socket.on('joinWorkspace', async ({ workspaceId, user, currentFileId, role }) => {
      try {
        if (!workspaceId) return;

        const roomName = `workspace:${workspaceId}`;
        socket.join(roomName);
        socket.workspaceId = workspaceId;
        socket.userId = user?.id || user?._id;
        socket.userRole = role || user?.role || 'editor';

        console.log(`[Socket] Client ${socket.id} (User ${socket.userId || 'Guest'}, Role ${socket.userRole}) joined ${roomName}`);

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
              ...(currentFileId ? { currentFileId } : {})
            },
            { upsert: true }
          );

          // Broadcast user joined to other members in the workspace room
          socket.to(roomName).emit('userJoined', {
            userId: socket.userId,
            user: { ...(user || {}), role: socket.userRole },
            joinedAt: new Date()
          });
        }

        // Send updated workspace active presence list
        const activeSessions = await WorkspaceSession.find({ workspaceId })
          .populate('userId', 'name email role')
          .sort({ lastActiveAt: -1 });

        io.to(roomName).emit('presenceUpdate', { workspaceId, sessions: activeSessions });
      } catch (err) {
        console.error('[Socket] Error in joinWorkspace:', err);
      }
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

        const roomName = `workspace:${targetWorkspaceId}`;
        // Broadcast to all other users in this workspace room with monotonic version counter
        socket.to(roomName).emit('code_updated', {
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

        const roomName = `workspace:${targetWorkspaceId}`;
        const payload = {
          ...data,
          workspaceId: targetWorkspaceId,
          userId: socket.userId || data?.user?.id || data?.user?._id || socket.id
        };

        // Broadcast live cursor and selection coordinates to other peers in room
        socket.to(roomName).emit('cursor_position_updated', payload);
        socket.to(roomName).emit('cursor_updated', payload);
      } catch (err) {
        console.error('[Socket] Error in cursor_position_update:', err);
      }
    });

    socket.on('cursor_move', (data) => {
      try {
        const targetWorkspaceId = data?.workspaceId || socket.workspaceId;
        if (!targetWorkspaceId) return;

        const roomName = `workspace:${targetWorkspaceId}`;
        const payload = {
          ...data,
          workspaceId: targetWorkspaceId,
          userId: socket.userId || data?.user?.id || data?.user?._id || socket.id
        };

        socket.to(roomName).emit('cursor_position_updated', payload);
        socket.to(roomName).emit('cursor_updated', payload);
      } catch (err) {
        console.error('[Socket] Error in cursor_move:', err);
      }
    });

    // Leave Workspace Explicitly
    socket.on('leaveWorkspace', async ({ workspaceId, userId }) => {
      try {
        if (!workspaceId) return;

        const roomName = `workspace:${workspaceId}`;
        socket.leave(roomName);

        if (userId) {
          await WorkspaceSession.findOneAndUpdate(
            { userId, workspaceId },
            {
              status: 'offline',
              leftAt: new Date(),
              socketId: null
            }
          );

          socket.to(roomName).emit('userLeft', { userId, leftAt: new Date() });
        }

        const activeSessions = await WorkspaceSession.find({ workspaceId })
          .populate('userId', 'name email role')
          .sort({ lastActiveAt: -1 });

        io.to(roomName).emit('presenceUpdate', { workspaceId, sessions: activeSessions });
      } catch (err) {
        console.error('[Socket] Error in leaveWorkspace:', err);
      }
    });

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
          const roomName = `workspace:${session.workspaceId}`;
          socket.to(roomName).emit('userLeft', { userId: session.userId, leftAt: new Date() });

          const activeSessions = await WorkspaceSession.find({ workspaceId: session.workspaceId })
            .populate('userId', 'name email role')
            .sort({ lastActiveAt: -1 });

          io.to(roomName).emit('presenceUpdate', { workspaceId: session.workspaceId, sessions: activeSessions });
        }
      } catch (err) {
        console.error('[Socket] Error in disconnect:', err);
      }
    });
  });
};

module.exports = initWorkspaceSessionSocket;
