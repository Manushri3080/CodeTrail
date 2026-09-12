const WorkspaceSession = require('../models/WorkspaceSession');

const initWorkspaceSessionSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Socket] New client connected: ${socket.id}`);

    // Join Workspace Room
    socket.on('joinWorkspace', async ({ workspaceId, user, currentFileId }) => {
      try {
        if (!workspaceId) return;

        const roomName = `workspace:${workspaceId}`;
        socket.join(roomName);
        socket.workspaceId = workspaceId;
        socket.userId = user?.id || user?._id;

        console.log(`[Socket] Client ${socket.id} (User ${socket.userId || 'Guest'}) joined ${roomName}`);

        if (socket.userId) {
          await WorkspaceSession.findOneAndUpdate(
            { userId: socket.userId, workspaceId },
            {
              socketId: socket.id,
              status: 'online',
              lastActiveAt: new Date(),
              leftAt: null,
              ...(currentFileId ? { currentFileId } : {})
            },
            { upsert: true }
          );

          // Broadcast user joined to other members in the workspace room
          socket.to(roomName).emit('userJoined', {
            userId: socket.userId,
            user,
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

    // Real-time Collaborative Code Synchronization (CT-85)
    socket.on('code_change', ({ workspaceId, fileId, content }) => {
      try {
        const targetWorkspaceId = workspaceId || socket.workspaceId;
        if (!targetWorkspaceId || !fileId) return;

        const roomName = `workspace:${targetWorkspaceId}`;
        // Broadcast to all other users in this workspace room, excluding sender
        socket.to(roomName).emit('code_updated', {
          workspaceId: targetWorkspaceId,
          fileId,
          content,
          updatedBy: socket.userId
        });
      } catch (err) {
        console.error('[Socket] Error in code_change:', err);
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
