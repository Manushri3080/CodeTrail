/**
 * CodeTrail Telemetry Interceptor & Monotonic Sequence Engine
 * Implements CT-164 (High-Precision Timestamp Recording & Monotonic Sequencing)
 * and supports CT-167 (Socket Telemetry Synchronization).
 */

import { getHighPrecisionISO } from './timeUtils';

// Monotonic Sequence Counter per client session
let currentMonotonicSequence = 0;

/**
 * Get next monotonic sequence counter number.
 * Ensures strict total order across all intercepted workspace events.
 */
export const getNextMonotonicSequence = () => {
  currentMonotonicSequence += 1;
  return currentMonotonicSequence;
};

/**
 * Reset or seed the sequence counter (e.g. on workspace room rejoin).
 */
export const setMonotonicSequence = (seed = 0) => {
  currentMonotonicSequence = Math.max(0, seed);
  return currentMonotonicSequence;
};

export const getMonotonicSequence = () => currentMonotonicSequence;

/**
 * Standard Workspace Action Types for Telemetry
 */
export const TELEMETRY_ACTION_TYPES = {
  CODE_EDIT: 'CODE_EDIT',
  CURSOR_MOVE: 'CURSOR_MOVE',
  FILE_SWITCH: 'FILE_SWITCH',
  FILE_CREATE: 'FILE_CREATE',
  FILE_DELETE: 'FILE_DELETE',
  RUN_CODE: 'RUN_CODE',
  SAVE: 'SAVE',
  HEARTBEAT: 'HEARTBEAT',
  SESSION_JOIN: 'SESSION_JOIN',
  SESSION_LEAVE: 'SESSION_LEAVE'
};

/**
 * Lightweight fast hash generator for event integrity verification.
 */
export const generateEventHash = (dataStr) => {
  let hash = 0;
  for (let i = 0; i < dataStr.length; i++) {
    const char = dataStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hex.slice(0, 4)}...${hex.slice(-4)}`;
};

/**
 * Factory to create a standardized, high-precision Telemetry Action Envelope (CT-164)
 */
export const createTelemetryEnvelope = ({
  actionType = TELEMETRY_ACTION_TYPES.CODE_EDIT,
  workspaceId,
  user,
  fileId = 'index.js',
  details = '',
  metrics = {}
}) => {
  const seq = getNextMonotonicSequence();
  const timestamp = getHighPrecisionISO();
  const monotonicTimeMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const userId = user?.id || user?._id || 'anonymous_user';
  const userName = user?.name || 'Developer';
  const userRole = user?.role || 'editor';

  const rawPayload = `${seq}|${timestamp}|${workspaceId}|${userId}|${actionType}|${fileId}`;
  const verificationHash = generateEventHash(rawPayload);

  return {
    eventId: `evt_${Date.now()}_${seq}`,
    seq,
    actionType,
    timestamp, // ISO-8601 string with milliseconds (e.g. "2026-09-28T17:07:21.456Z")
    monotonicTimeMs,
    workspaceId,
    user: {
      id: userId,
      name: userName,
      role: userRole,
      color: user?.color
    },
    fileId,
    details,
    metrics: {
      linesAdded: metrics.linesAdded || 0,
      linesDeleted: metrics.linesDeleted || 0,
      totalLines: metrics.totalLines || 0,
      charsModified: metrics.charsModified || 0,
      durationMs: metrics.durationMs || 0,
      ...metrics
    },
    verificationHash
  };
};

/**
 * Active Contribution Tracker Class
 * Accurately measures Session Duration vs Active Contribution Time
 */
export class ActiveContributionTracker {
  constructor({
    workspaceId,
    user,
    idleThresholdMs = 45000, // 45 seconds of no activity = idle
    onTick = null,
    onStateChange = null
  } = {}) {
    this.workspaceId = workspaceId;
    this.user = user;
    this.idleThresholdMs = idleThresholdMs;
    this.onTick = onTick;
    this.onStateChange = onStateChange;

    this.sessionStartTime = Date.now();
    this.totalSessionSeconds = 0;
    this.activeContributionSeconds = 0;
    this.lastActivityTime = Date.now();
    this.isActive = true;
    this.timerId = null;
  }

  start() {
    this.sessionStartTime = Date.now();
    this.lastActivityTime = Date.now();
    this.isActive = true;

    if (this.timerId) clearInterval(this.timerId);

    this.timerId = setInterval(() => {
      this.totalSessionSeconds += 1;

      const timeSinceLastActivity = Date.now() - this.lastActivityTime;
      const wasActive = this.isActive;

      if (timeSinceLastActivity <= this.idleThresholdMs) {
        this.activeContributionSeconds += 1;
        this.isActive = true;
      } else {
        this.isActive = false;
      }

      if (wasActive !== this.isActive && this.onStateChange) {
        this.onStateChange({
          isActive: this.isActive,
          status: this.isActive ? 'active' : 'idle'
        });
      }

      if (this.onTick) {
        this.onTick({
          totalSessionSeconds: this.totalSessionSeconds,
          activeContributionSeconds: this.activeContributionSeconds,
          isActive: this.isActive
        });
      }
    }, 1000);
  }

  recordActivity() {
    this.lastActivityTime = Date.now();
    if (!this.isActive) {
      this.isActive = true;
      if (this.onStateChange) {
        this.onStateChange({ isActive: true, status: 'active' });
      }
    }
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  getMetrics() {
    return {
      sessionStartTime: new Date(this.sessionStartTime).toISOString(),
      totalSessionSeconds: this.totalSessionSeconds,
      activeContributionSeconds: this.activeContributionSeconds,
      isActive: this.isActive,
      efficiencyRatio: this.totalSessionSeconds > 0 
        ? Math.round((this.activeContributionSeconds / this.totalSessionSeconds) * 100) 
        : 100
    };
  }
}
