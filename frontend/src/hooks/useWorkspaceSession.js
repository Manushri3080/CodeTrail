import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://localhost:5000';

export const useWorkspaceSession = (workspaceId, currentUser, activeFile = 'index.js', role = 'editor') => {
  const [activeUsers, setActiveUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected'); // 'connected' | 'reconnecting' | 'disconnected'
  const [timeSpent, setTimeSpent] = useState('0h 0m');
  const [peerCursors, setPeerCursors] = useState({});
  const [remoteCodeUpdates, setRemoteCodeUpdates] = useState(null);
  const [fileVersions, setFileVersions] = useState({});
  const fileVersionsRef = useRef({});
  const socketRef = useRef(null);
  const isViewer = role === 'viewer';

  useEffect(() => {
    fileVersionsRef.current = fileVersions;
  }, [fileVersions]);

  useEffect(() => {
    if (!workspaceId) return;

    // Initialize Socket Connection
    const socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      timeout: 10000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      // Join room session
      socket.emit('join_workspace_session', {
        workspaceId,
        user: currentUser ? {
          id: currentUser.id || currentUser._id,
          name: currentUser.name || 'Anonymous Developer',
          email: currentUser.email,
          role
        } : null,
        activeFile,
        role
      });
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (reason !== 'io client disconnect') {
        setConnectionStatus('reconnecting');
      }
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
      setConnectionStatus('reconnecting');
    });

    socket.io.on('reconnect_failed', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('code_change_error', (err) => {
      console.warn('[useWorkspaceSession Guard]:', err);
    });

    socket.on('code_conflict', ({ fileId, serverVersion }) => {
      if (typeof serverVersion === 'number') {
        fileVersionsRef.current[fileId] = serverVersion;
        setFileVersions(prev => ({ ...prev, [fileId]: serverVersion }));
      }
    });

    // Listen for live active peers in this workspace
    socket.on('active_users_update', ({ activeUsers: peers }) => {
      if (Array.isArray(peers)) {
        setActiveUsers(peers);
      }
    });

    // Listen for code changes made by other collaborators with version checks (CT-85, CT-89)
    socket.on('code_updated', ({ fileId, content, updatedBy, version }) => {
      const currentVer = fileVersionsRef.current[fileId] || 0;
      if (typeof version === 'number') {
        if (version < currentVer) return; // Drop stale packet
        fileVersionsRef.current[fileId] = version;
        setFileVersions(prev => ({ ...prev, [fileId]: version }));
      }
      setRemoteCodeUpdates({ fileId, content, updatedBy, version, timestamp: Date.now() });
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
  }, [workspaceId, currentUser, role]);

  // Broadcast code edits with monotonic version increment (CT-85, CT-89)
  const emitCodeChange = (fileId, content) => {
    if (isViewer) {
      console.warn('[useWorkspaceSession] Viewers cannot emit code edits');
      return;
    }
    if (socketRef.current && socketRef.current.connected) {
      const nextVer = (fileVersionsRef.current[fileId] || 0) + 1;
      fileVersionsRef.current[fileId] = nextVer;
      setFileVersions(prev => ({ ...prev, [fileId]: nextVer }));

      socketRef.current.emit('code_change', {
        workspaceId,
        fileId,
        content,
        version: nextVer
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
    connectionStatus,
    isViewer,
    fileVersions,
    timeSpent,
    remoteCodeUpdates,
    emitCodeChange,
    emitActiveFileChange,
    emitCursorPosition
  };
};

export default useWorkspaceSession;
