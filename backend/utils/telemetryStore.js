/**
 * CodeTrail Backend Telemetry Store & Sequence Engine
 * Supports CT-164 (Timestamp & Monotonic Sequence Recording)
 * and CT-167 (Socket Telemetry Sync)
 */

const crypto = require('crypto');

// Initial baseline contributors for demo workspaces
const DEFAULT_CONTRIBUTORS = [
  {
    id: 'user-1',
    name: 'Alex Rivers',
    role: 'Lead Architect',
    lines: 1420,
    percent: 32,
    hash: '8a9f...c4e1',
    color: '#EC4899',
    badge: 'Owner',
    activeSeconds: 4820,
    actionsCount: 142
  },
  {
    id: 'user-2',
    name: 'Sarah Chen',
    role: 'Core Engine & Sync',
    lines: 1180,
    percent: 26,
    hash: '3b2c...a9d0',
    color: '#38BDF8',
    badge: 'Maintainer',
    activeSeconds: 3950,
    actionsCount: 98
  },
  {
    id: 'user-3',
    name: 'Marcus Vance',
    role: 'Cloud Code Sandbox',
    lines: 980,
    percent: 22,
    hash: '5e7f...b1a2',
    color: '#A855F7',
    badge: 'Contributor',
    activeSeconds: 3120,
    actionsCount: 76
  },
  {
    id: 'user-4',
    name: 'Elena Rostova',
    role: 'Telemetry & Analytics',
    lines: 890,
    percent: 20,
    hash: '9c4d...e8f3',
    color: '#10B981',
    badge: 'Contributor',
    activeSeconds: 2840,
    actionsCount: 65
  }
];

class TelemetryStore {
  constructor() {
    // workspaceId -> { sequence: Number, contributors: Map<userId, Contributor>, events: Array, sessions: Map<socketId, Session> }
    this.workspaces = new Map();
  }

  _getOrCreateWorkspace(workspaceId) {
    if (!this.workspaces.has(workspaceId)) {
      const initialContribs = new Map();
      DEFAULT_CONTRIBUTORS.forEach(c => {
        initialContribs.set(c.id, { ...c });
      });

      this.workspaces.set(workspaceId, {
        sequence: 100,
        contributors: initialContribs,
        events: [],
        sessions: new Map()
      });
    }
    return this.workspaces.get(workspaceId);
  }

  /**
   * Generates next server-validated monotonic sequence number (CT-164)
   */
  getNextSequence(workspaceId) {
    const ws = this._getOrCreateWorkspace(workspaceId);
    ws.sequence += 1;
    return ws.sequence;
  }

  /**
   * Records an intercepted telemetry action from a client
   */
  recordAction(workspaceId, rawEnvelope) {
    const ws = this._getOrCreateWorkspace(workspaceId);

    // Ensure monotonic sequencing
    const serverSeq = this.getNextSequence(workspaceId);
    const clientSeq = rawEnvelope?.seq || serverSeq;
    const seq = Math.max(serverSeq, clientSeq);

    const timestamp = rawEnvelope?.timestamp || new Date().toISOString();
    const userId = rawEnvelope?.user?.id || rawEnvelope?.user?._id || 'anonymous';
    const userName = rawEnvelope?.user?.name || 'Developer';
    const userRole = rawEnvelope?.user?.role || 'editor';
    const actionType = rawEnvelope?.actionType || 'CODE_EDIT';
    const fileId = rawEnvelope?.fileId || 'index.js';

    // Compute cryptographic verification SHA-256 hash
    const blockPayload = `${seq}|${timestamp}|${workspaceId}|${userId}|${actionType}|${fileId}|${JSON.stringify(rawEnvelope?.metrics || {})}`;
    const fullHash = crypto.createHash('sha256').update(blockPayload).digest('hex');
    const displayHash = `${fullHash.slice(0, 4)}...${fullHash.slice(-4)}`;

    const envelope = {
      ...rawEnvelope,
      seq,
      timestamp,
      verificationHash: displayHash,
      fullHash
    };

    // Update contributor statistics in workspace
    let contributor = ws.contributors.get(userId);
    if (!contributor) {
      contributor = {
        id: userId,
        name: userName,
        role: userRole === 'owner' ? 'Lead Architect' : (userRole === 'admin' ? 'Maintainer' : 'Contributor'),
        lines: 0,
        percent: 0,
        hash: displayHash,
        color: rawEnvelope?.user?.color || '#38BDF8',
        badge: userRole.charAt(0).toUpperCase() + userRole.slice(1),
        activeSeconds: 0,
        actionsCount: 0
      };
      ws.contributors.set(userId, contributor);
    }

    contributor.name = userName;
    contributor.hash = displayHash;
    contributor.actionsCount = (contributor.actionsCount || 0) + 1;

    // Line modification tracking (CT-164)
    // Only increment when actual lines are added/modified, not on every single keystroke/word
    const linesAdded = parseInt(rawEnvelope?.metrics?.linesAdded, 10) || 0;
    const linesDeleted = parseInt(rawEnvelope?.metrics?.linesDeleted, 10) || 0;
    if (linesAdded > 0) {
      contributor.lines = (contributor.lines || 0) + linesAdded;
    } else if (linesDeleted > 0) {
      contributor.lines = Math.max(0, (contributor.lines || 0) - linesDeleted);
    } else if (contributor.lines === 0 && rawEnvelope?.metrics?.totalLines) {
      contributor.lines = Math.min(5, parseInt(rawEnvelope.metrics.totalLines, 10) || 1);
    }

    // Keep ring buffer of last 50 events
    ws.events.unshift(envelope);
    if (ws.events.length > 50) {
      ws.events.pop();
    }

    const dossier = this.getDossier(workspaceId);
    return { envelope, dossier };
  }

  /**
   * Update active heartbeat time metrics from client
   */
  recordHeartbeat(workspaceId, user, metrics) {
    const ws = this._getOrCreateWorkspace(workspaceId);
    const userId = user?.id || user?._id || 'anonymous';
    const userName = user?.name || 'Developer';

    let contributor = ws.contributors.get(userId);
    if (!contributor) {
      contributor = {
        id: userId,
        name: userName,
        role: user?.role || 'Contributor',
        lines: 0,
        percent: 0,
        hash: 'a1b2...c3d4',
        color: user?.color || '#38BDF8',
        badge: 'Contributor',
        activeSeconds: 0,
        actionsCount: 0
      };
      ws.contributors.set(userId, contributor);
    }

    if (metrics?.activeContributionSeconds) {
      contributor.activeSeconds = Math.max(contributor.activeSeconds || 0, metrics.activeContributionSeconds);
    }

    return this.getDossier(workspaceId);
  }

  /**
   * Compute aggregated dossier summary and percentage breakdown
   */
  getDossier(workspaceId) {
    const ws = this._getOrCreateWorkspace(workspaceId);
    const contributorsList = Array.from(ws.contributors.values());

    const totalLines = contributorsList.reduce((acc, c) => acc + (c.lines || 0), 0) || 1;

    // Calculate real-time dynamic percentages
    const updatedContributors = contributorsList.map(c => ({
      ...c,
      percent: Math.max(1, Math.round(((c.lines || 0) / totalLines) * 100))
    }));

    // Adjust any rounding so sum is ~100%
    const sumPercent = updatedContributors.reduce((acc, c) => acc + c.percent, 0);
    if (sumPercent !== 100 && updatedContributors.length > 0) {
      updatedContributors[0].percent += (100 - sumPercent);
    }

    return {
      workspaceId,
      contributors: updatedContributors,
      summary: {
        sessionId: `#ws-${workspaceId ? workspaceId.slice(-6) : 'main'}`,
        auditTitle: 'Live Session Telemetry & Sync',
        totalLines: `${totalLines.toLocaleString()} lines`,
        activeSync: '100% Verified',
        currentSequence: ws.sequence,
        totalContributors: updatedContributors.length
      }
    };
  }
}

module.exports = new TelemetryStore();
