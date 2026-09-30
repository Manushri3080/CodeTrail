import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { createTelemetryEnvelope, ActiveContributionTracker, TELEMETRY_ACTION_TYPES } from '../utils/telemetryInterceptor';
import { INITIAL_TEAM_CONTRIBUTIONS, TELEMETRY_SUMMARY_CONFIG } from '../constants/telemetry.constants';

const SOCKET_SERVER_URL = 'http://localhost:5000';

export const useWorkspaceSession = (workspaceId, currentUser, activeFile = 'index.js', role = 'editor') => {
  const [activeUsers, setActiveUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected'); // 'connected' | 'reconnecting' | 'disconnected'
  const [timeSpent, setTimeSpent] = useState('0h 0m');
  const [peerCursors, setPeerCursors] = useState({});
  const [remoteCodeUpdates, setRemoteCodeUpdates] = useState(null);
  const [fileVersions, setFileVersions] = useState({});
  
  // CT-164 & CT-167: Live Telemetry & Active Duration State
  const [dossierContributors, setDossierContributors] = useState(INITIAL_TEAM_CONTRIBUTIONS);
  const [dossierSummary, setDossierSummary] = useState(TELEMETRY_SUMMARY_CONFIG);
  const [telemetryEvents, setTelemetryEvents] = useState([]);
  const [sessionMetrics, setSessionMetrics] = useState({
    totalSessionSeconds: 0,
    activeContributionSeconds: 0,
    isActive: true
  });

  const fileVersionsRef = useRef({});
  const socketRef = useRef(null);
  const trackerRef = useRef(null);
  const isViewer = role === 'viewer';

  useEffect(() => {
    fileVersionsRef.current = fileVersions;
  }, [fileVersions]);

  // 1. Initialize Active Contribution Tracker (CT-164)
  useEffect(() => {
    if (!workspaceId) return;

    const tracker = new ActiveContributionTracker({
      workspaceId,
      user: currentUser,
      idleThresholdMs: 45000,
      onTick: (metrics) => {
        setSessionMetrics({
          totalSessionSeconds: metrics.totalSessionSeconds,
          activeContributionSeconds: metrics.activeContributionSeconds,
          isActive: metrics.isActive
        });
      },
      onStateChange: ({ isActive }) => {
        setSessionMetrics(prev => ({ ...prev, isActive }));
      }
    });

    trackerRef.current = tracker;
    tracker.start();

    return () => {
      tracker.stop();
    };
  }, [workspaceId, currentUser]);

  // 2. Initialize Socket Connection & Telemetry Engine (CT-167)
  useEffect(() => {
    if (!workspaceId) return;

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

      // Request initial telemetry dossier
      socket.emit('telemetry:request_dossier', { workspaceId });
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

    // CT-167: Real-time Telemetry Dossier Sync & Stream
    socket.on('telemetry:dossier_sync', (dossierData) => {
      if (dossierData?.contributors && Array.isArray(dossierData.contributors)) {
        setDossierContributors(dossierData.contributors);
      }
      if (dossierData?.summary) {
        setDossierSummary(prev => ({ ...prev, ...dossierData.summary }));
      }
    });

    socket.on('telemetry:stream', (eventEnvelope) => {
      if (!eventEnvelope) return;
      setTelemetryEvents(prev => [eventEnvelope, ...prev.slice(0, 29)]);
    });

    // Heartbeat every 20 seconds to sync session presence and active duration
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        const metrics = trackerRef.current ? trackerRef.current.getMetrics() : null;
        socket.emit('session_heartbeat', {
          workspaceId,
          durationSeconds: 20
        });

        if (metrics) {
          socket.emit('telemetry:heartbeat', {
            workspaceId,
            user: currentUser,
            metrics
          });
        }
      }
    }, 20000);

    return () => {
      clearInterval(heartbeatInterval);
      if (socket.connected) {
        socket.emit('leave_workspace_session');
        socket.disconnect();
      }
    };
  }, [workspaceId, currentUser, role]);

  // Intercept & Emit Telemetry Action (CT-164 + CT-167)
  const interceptTelemetryAction = useCallback(({
    actionType = TELEMETRY_ACTION_TYPES.CODE_EDIT,
    fileId = activeFile,
    details = '',
    metrics = {}
  }) => {
    if (trackerRef.current) {
      trackerRef.current.recordActivity();
    }

    const envelope = createTelemetryEnvelope({
      actionType,
      workspaceId,
      user: currentUser ? {
        id: currentUser.id || currentUser._id,
        name: currentUser.name || 'Developer',
        role,
        color: currentUser.color
      } : null,
      fileId,
      details,
      metrics
    });

    setTelemetryEvents(prev => [envelope, ...prev.slice(0, 29)]);

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('telemetry:action', envelope);
    }

    return envelope;
  }, [workspaceId, currentUser, activeFile, role]);

  // Broadcast code edits with monotonic version increment (CT-85, CT-89) + Telemetry Interception (CT-164)
  const emitCodeChange = (fileId, content, lineDiff = 1) => {
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

      // Intercept code edit telemetry action
      interceptTelemetryAction({
        actionType: TELEMETRY_ACTION_TYPES.CODE_EDIT,
        fileId,
        details: `Edited file ${fileId} (v${nextVer})`,
        metrics: {
          linesAdded: Math.max(1, lineDiff),
          totalLines: content.split('\n').length
        }
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

      interceptTelemetryAction({
        actionType: TELEMETRY_ACTION_TYPES.FILE_SWITCH,
        fileId,
        details: `Switched active editor tab to ${fileId}`
      });
    }
  };

  // Broadcast cursor movement (CT-86)
  const emitCursorPosition = (fileId, position, selection) => {
    if (trackerRef.current) {
      trackerRef.current.recordActivity();
    }
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
    socket: socketRef.current,
    activeUsers,
    peerCursors,
    isConnected,
    connectionStatus,
    isViewer,
    fileVersions,
    timeSpent,
    remoteCodeUpdates,
    dossierContributors,
    dossierSummary,
    telemetryEvents,
    sessionMetrics,
    emitCodeChange,
    emitActiveFileChange,
    emitCursorPosition,
    interceptTelemetryAction
  };
};

export default useWorkspaceSession;
