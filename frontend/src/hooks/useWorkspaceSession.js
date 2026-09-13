import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://localhost:5000';

export const useWorkspaceSession = (workspaceId, currentUser, activeFile = 'index.js') => {
  const [activeUsers, setActiveUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [timeSpent, setTimeSpent] = useState('0h 0m');
  const [peerCursors, setPeerCursors] = useState({});
  const [remoteCodeUpdates, setRemoteCodeUpdates] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!workspaceId) return;

    // Initialize Socket Connection
    const socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      timeout: 10000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Join room session
      socket.emit('join_workspace_session', {
        workspaceId,
        user: currentUser ? {
          id: currentUser.id || currentUser._id,
          name: currentUser.name || 'Anonymous Developer',
          email: currentUser.email
        } : null,
        activeFile
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen for live active peers in this workspace
    socket.on('active_users_update', ({ activeUsers: peers }) => {
      if (Array.isArray(peers)) {
        setActiveUsers(peers);
      }
    });

    // Listen for code changes made by other collaborators
    socket.on('code_updated', ({ fileId, content, updatedBy }) => {
      setRemoteCodeUpdates({ fileId, content, updatedBy, timestamp: Date.now() });
    });

    // Listen for remote peer cursor movements (CT-86)
    socket.on('cursor_position_updated', (data) => {
      if (!data || !data.userId) return;
      setPeerCursors(prev => ({
        ...prev,
        [data.userId]: {
          ...data,
          lastUpdatedAt: Date.now()
        }
      }));
    });

    socket.on('cursor_updated', (data) => {
      if (!data || !data.userId) return;
      setPeerCursors(prev => ({
        ...prev,
        [data.userId]: {
          ...data,
          lastUpdatedAt: Date.now()
        }
      }));
    });

    // Listen for real-time updated session duration
    socket.on('session_time_updated', ({ timeSpent: newTimeSpent }) => {
      if (newTimeSpent) {
        setTimeSpent(newTimeSpent);
      }
    });

    // Heartbeat every 30 seconds to record time spent and maintain session presence
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('session_heartbeat', {
          workspaceId,
          durationSeconds: 30
        });
      }
    }, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      if (socket.connected) {
        socket.emit('leave_workspace_session');
        socket.disconnect();
      }
    };
  }, [workspaceId, currentUser]);

  // Broadcast code edits
  const emitCodeChange = (fileId, content) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('code_change', {
        workspaceId,
        fileId,
        content
      });
    }
  };

  // Broadcast active file tab switch
  const emitActiveFileChange = (fileId) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('active_file_change', {
        workspaceId,
        activeFile: fileId
      });
    }
  };

  // Broadcast cursor movement (CT-86)
  const emitCursorPosition = (fileId, position, selection) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('cursor_position_update', {
        workspaceId,
        fileId,
        user: currentUser ? {
          id: currentUser.id || currentUser._id,
          name: currentUser.name || 'Anonymous Developer',
          email: currentUser.email
        } : null,
        position,
        selection
      });
    }
  };

  return {
    activeUsers,
    peerCursors,
    isConnected,
    timeSpent,
    remoteCodeUpdates,
    emitCodeChange,
    emitActiveFileChange,
    emitCursorPosition
  };
};

export default useWorkspaceSession;
