const { Server } = require('socket.io');
const Workspace = require('../models/Workspace');

const AVATAR_COLORS = ['#EC4899', '#38BDF8', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];

// In-memory active session tracking: roomMap[workspaceId] = Array of active user objects
const activeRoomSessions = new Map();

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

const setupSocketHandler = (server) => {
  const io = new Server(server, {
    cors: {
      origin: 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    let currentWorkspaceId = null;
    let currentUser = null;

    // 1. Join Workspace Session Room
    socket.on('join_workspace_session', async ({ workspaceId, user, activeFile = 'index.js' }) => {
      if (!workspaceId) return;

      currentWorkspaceId = workspaceId;
      currentUser = user || { name: 'Anonymous', initial: 'A' };
      const roomName = `workspace_${workspaceId}`;

      socket.join(roomName);

      if (!activeRoomSessions.has(workspaceId)) {
        activeRoomSessions.set(workspaceId, []);
      }

      const roomUsers = activeRoomSessions.get(workspaceId);

      // Check if user session already exists for this socket
      const existingUserIdx = roomUsers.findIndex(u => u.socketId === socket.id);
      const colorIndex = roomUsers.length % AVATAR_COLORS.length;

      const userSession = {
        socketId: socket.id,
        userId: currentUser._id || currentUser.id || socket.id,
        name: currentUser.name || 'Developer',
        initial: (currentUser.name || 'Dev').charAt(0).toUpperCase(),
        color: currentUser.color || AVATAR_COLORS[colorIndex],
        joinedAt: new Date(),
        activeFile: activeFile
      };

      if (existingUserIdx >= 0) {
        roomUsers[existingUserIdx] = userSession;
      } else {
        roomUsers.push(userSession);
      }

      // Broadcast active user list to all participants in this workspace room
      io.to(roomName).emit('active_users_update', {
        activeUsers: roomUsers,
        joinedUser: userSession
      });

      console.log(`[Socket Session] ${userSession.name} joined workspace room: ${workspaceId} (${roomUsers.length} online)`);
    });

    // 2. Real-time File/Code Changes
    socket.on('code_change', ({ workspaceId, fileId, content }) => {
      if (!workspaceId) return;
      socket.to(`workspace_${workspaceId}`).emit('code_updated', {
        fileId,
        content,
        updatedBy: currentUser?.name || 'Peer'
      });
    });

    // Real-time Multiplayer Monaco Cursor Tracking & Broadcast (CT-86)
    socket.on('cursor_position_update', (data) => {
      if (!data?.workspaceId) return;
      const payload = {
        ...data,
        userId: currentUser?._id || currentUser?.id || socket.id
      };
      socket.to(`workspace_${data.workspaceId}`).emit('cursor_position_updated', payload);
      socket.to(`workspace_${data.workspaceId}`).emit('cursor_updated', payload);
    });

    socket.on('cursor_move', (data) => {
      if (!data?.workspaceId) return;
      const payload = {
        ...data,
        userId: currentUser?._id || currentUser?.id || socket.id
      };
      socket.to(`workspace_${data.workspaceId}`).emit('cursor_position_updated', payload);
      socket.to(`workspace_${data.workspaceId}`).emit('cursor_updated', payload);
    });

    // 3. Switch Active File
    socket.on('active_file_change', ({ workspaceId, activeFile }) => {
      if (!workspaceId) return;
      const roomUsers = activeRoomSessions.get(workspaceId);
      if (roomUsers) {
        const u = roomUsers.find(user => user.socketId === socket.id);
        if (u) {
          u.activeFile = activeFile;
          io.to(`workspace_${workspaceId}`).emit('active_users_update', {
            activeUsers: roomUsers
          });
        }
      }
    });

    // 4. Session Heartbeat & Duration Sync (Called periodically from frontend)
    socket.on('session_heartbeat', async ({ workspaceId, durationSeconds = 30 }) => {
      if (!workspaceId) return;

      try {
        const workspace = await Workspace.findById(workspaceId);
        if (workspace) {
          workspace.totalActiveSeconds = (workspace.totalActiveSeconds || 0) + durationSeconds;
          workspace.timeSpent = formatTimeSpent(workspace.totalActiveSeconds);
          workspace.lastActiveAt = new Date();
          await workspace.save();

          io.to(`workspace_${workspaceId}`).emit('session_time_updated', {
            timeSpent: workspace.timeSpent,
            totalActiveSeconds: workspace.totalActiveSeconds
          });
        }
      } catch (err) {
        console.error('[Socket Heartbeat Error]:', err.message);
      }
    });

    // 5. Handle Disconnect or Leave Session
    const handleLeave = () => {
      if (!currentWorkspaceId) return;

      const roomUsers = activeRoomSessions.get(currentWorkspaceId);
      if (roomUsers) {
        const updatedUsers = roomUsers.filter(u => u.socketId !== socket.id);
        if (updatedUsers.length === 0) {
          activeRoomSessions.delete(currentWorkspaceId);
        } else {
          activeRoomSessions.set(currentWorkspaceId, updatedUsers);
        }

        io.to(`workspace_${currentWorkspaceId}`).emit('active_users_update', {
          activeUsers: updatedUsers,
          leftUser: currentUser
        });

        console.log(`[Socket Session] User left workspace room: ${currentWorkspaceId} (${updatedUsers.length} online remaining)`);
      }
    };

    socket.on('leave_workspace_session', handleLeave);
    socket.on('disconnect', handleLeave);
  });

  return io;
};

module.exports = setupSocketHandler;
