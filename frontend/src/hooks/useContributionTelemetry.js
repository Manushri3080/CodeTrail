import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  createTelemetryEnvelope, 
  ActiveContributionTracker, 
  TELEMETRY_ACTION_TYPES 
} from '../utils/telemetryInterceptor';
import { INITIAL_TEAM_CONTRIBUTIONS, TELEMETRY_SUMMARY_CONFIG } from '../constants/telemetry.constants';

export const useContributionTelemetry = ({
  workspaceId = 'demo-workspace',
  currentUser = null,
  socket = null,
  activeFile = 'index.js'
} = {}) => {
  const [sessionMetrics, setSessionMetrics] = useState({
    totalSessionSeconds: 0,
    activeContributionSeconds: 0,
    isActive: true,
    efficiencyRatio: 100
  });

  const [dossierContributors, setDossierContributors] = useState(INITIAL_TEAM_CONTRIBUTIONS);
  const [dossierSummary, setDossierSummary] = useState(TELEMETRY_SUMMARY_CONFIG);
  const [recentTelemetryEvents, setRecentTelemetryEvents] = useState([]);
  const [lastBroadcastEvent, setLastBroadcastEvent] = useState(null);

  const trackerRef = useRef(null);
  const socketRef = useRef(socket);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // 1. Initialize Active Contribution Tracker (CT-164 / Session Duration Tracking)
  useEffect(() => {
    if (!workspaceId) return;

    const tracker = new ActiveContributionTracker({
      workspaceId,
      user: currentUser,
      idleThresholdMs: 45000,
      onTick: (metrics) => {
        setSessionMetrics(prev => ({
          ...prev,
          totalSessionSeconds: metrics.totalSessionSeconds,
          activeContributionSeconds: metrics.activeContributionSeconds,
          isActive: metrics.isActive,
          efficiencyRatio: metrics.totalSessionSeconds > 0
            ? Math.round((metrics.activeContributionSeconds / metrics.totalSessionSeconds) * 100)
            : 100
        }));
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

  // 2. Periodic Socket Heartbeat to Sync Session Duration & Active Contribution Time
  useEffect(() => {
    if (!workspaceId) return;

    const interval = setInterval(() => {
      const activeSock = socketRef.current;
      if (activeSock && activeSock.connected && trackerRef.current) {
        const metrics = trackerRef.current.getMetrics();
        activeSock.emit('telemetry:heartbeat', {
          workspaceId,
          user: currentUser ? {
            id: currentUser.id || currentUser._id,
            name: currentUser.name || 'Developer',
            email: currentUser.email,
            role: currentUser.role || 'editor'
          } : null,
          metrics
        });
      }
    }, 15000); // sync every 15s

    return () => clearInterval(interval);
  }, [workspaceId, currentUser]);

  // 3. Listen for Socket.IO Real-time Telemetry Updates (CT-167)
  useEffect(() => {
    const activeSock = socketRef.current;
    if (!activeSock) return;

    // Listen for live action stream from peers
    const handleTelemetryStream = (eventEnvelope) => {
      if (!eventEnvelope) return;
      setLastBroadcastEvent(eventEnvelope);
      setRecentTelemetryEvents(prev => [eventEnvelope, ...prev.slice(0, 19)]);
    };

    // Listen for live updated dossier stats (lines, percentages, hashes)
    const handleDossierSync = (dossierData) => {
      if (dossierData?.contributors && Array.isArray(dossierData.contributors)) {
        setDossierContributors(dossierData.contributors);
      }
      if (dossierData?.summary) {
        setDossierSummary(prev => ({ ...prev, ...dossierData.summary }));
      }
    };

    activeSock.on('telemetry:stream', handleTelemetryStream);
    activeSock.on('telemetry:dossier_sync', handleDossierSync);
    activeSock.on('telemetry:dossier_update', handleDossierSync);

    // Request initial telemetry state
    activeSock.emit('telemetry:request_dossier', { workspaceId });

    return () => {
      activeSock.off('telemetry:stream', handleTelemetryStream);
      activeSock.off('telemetry:dossier_sync', handleDossierSync);
      activeSock.off('telemetry:dossier_update', handleDossierSync);
    };
  }, [socket]);

  // 4. Intercept Action & Broadcast over Socket.IO (CT-164 + CT-167)
  const interceptAndBroadcast = useCallback(({
    actionType = TELEMETRY_ACTION_TYPES.CODE_EDIT,
    details = '',
    fileId = activeFile,
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
        role: currentUser.role || 'editor',
        color: currentUser.color
      } : null,
      fileId,
      details,
      metrics
    });

    setLastBroadcastEvent(envelope);
    setRecentTelemetryEvents(prev => [envelope, ...prev.slice(0, 19)]);

    // Emit over socket if connected
    const activeSock = socketRef.current;
    if (activeSock && activeSock.connected) {
      activeSock.emit('telemetry:action', envelope);
    }

    return envelope;
  }, [workspaceId, currentUser, activeFile]);

  const recordLocalActivity = useCallback(() => {
    if (trackerRef.current) {
      trackerRef.current.recordActivity();
    }
  }, []);

  return {
    sessionMetrics,
    dossierContributors,
    dossierSummary,
    recentTelemetryEvents,
    lastBroadcastEvent,
    interceptAndBroadcast,
    recordLocalActivity,
    TELEMETRY_ACTION_TYPES
  };
};

export default useContributionTelemetry;
