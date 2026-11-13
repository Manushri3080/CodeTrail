/**
 * notificationDeliveryService.js
 * CodeTrail Notification Delivery, Preference Enforcement & Deduplication Engine
 *
 * Coordinates delivery across:
 *  - Workspace-level notification preferences (Workspace.settings.notifications)
 *  - User-level notification preferences (User.notificationPreferences)
 *  - High-performance in-memory TTL caching of user preferences
 *  - In-memory sliding-window event deduplication
 *  - Target recipient isolation (personal vs workspace vs role-gated)
 */

const User = require('../models/User');
const Workspace = require('../models/Workspace');

// Default user notification preferences
const DEFAULT_USER_PREFERENCES = Object.freeze({
  securityAlerts: true,
  weeklyProgress: true,
  platformNews: false
});

// Default workspace notification preferences
const DEFAULT_WORKSPACE_PREFERENCES = Object.freeze({
  emailOnMemberJoin: false,
  executionFailureAlerts: true,
  sessionSummaryAlerts: true
});

// In-memory sliding window cache for deduplication: fingerprint -> timestamp
const deduplicationCache = new Map();
const DEDUPLICATION_WINDOW_MS = 4000; // 4 seconds window

// In-memory TTL cache for user preferences: userId -> { preferences, expiresAt }
const userPreferencesCache = new Map();
const USER_PREF_CACHE_TTL_MS = 60000; // 60 seconds

/**
 * Normalizes user preferences against defaults.
 */
function normalizeUserPreferences(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    securityAlerts: typeof src.securityAlerts === 'boolean' ? src.securityAlerts : DEFAULT_USER_PREFERENCES.securityAlerts,
    weeklyProgress: typeof src.weeklyProgress === 'boolean' ? src.weeklyProgress : DEFAULT_USER_PREFERENCES.weeklyProgress,
    platformNews: typeof src.platformNews === 'boolean' ? src.platformNews : DEFAULT_USER_PREFERENCES.platformNews
  };
}

/**
 * Normalizes workspace notification settings against defaults.
 */
function normalizeWorkspacePreferences(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    emailOnMemberJoin: typeof src.emailOnMemberJoin === 'boolean' ? src.emailOnMemberJoin : DEFAULT_WORKSPACE_PREFERENCES.emailOnMemberJoin,
    executionFailureAlerts: typeof src.executionFailureAlerts === 'boolean' ? src.executionFailureAlerts : DEFAULT_WORKSPACE_PREFERENCES.executionFailureAlerts,
    sessionSummaryAlerts: typeof src.sessionSummaryAlerts === 'boolean' ? src.sessionSummaryAlerts : DEFAULT_WORKSPACE_PREFERENCES.sessionSummaryAlerts
  };
}

/**
 * Fetches user notification preferences with in-memory TTL caching.
 */
async function getUserPreferences(userId) {
  if (!userId) return { ...DEFAULT_USER_PREFERENCES };
  const uid = String(userId);
  const now = Date.now();

  const cached = userPreferencesCache.get(uid);
  if (cached && cached.expiresAt > now) {
    return cached.preferences;
  }

  const { isValidObjectId } = require('mongoose');
  if (typeof isValidObjectId === 'function' && !isValidObjectId(uid)) {
    const fallback = { ...DEFAULT_USER_PREFERENCES };
    userPreferencesCache.set(uid, { preferences: fallback, expiresAt: now + USER_PREF_CACHE_TTL_MS });
    return fallback;
  }

  try {
    const user = await User.findById(uid).select('notificationPreferences');
    const prefs = user ? normalizeUserPreferences(user.notificationPreferences) : { ...DEFAULT_USER_PREFERENCES };
    userPreferencesCache.set(uid, {
      preferences: prefs,
      expiresAt: now + USER_PREF_CACHE_TTL_MS
    });
    return prefs;
  } catch (err) {
    const fallback = { ...DEFAULT_USER_PREFERENCES };
    userPreferencesCache.set(uid, { preferences: fallback, expiresAt: now + USER_PREF_CACHE_TTL_MS });
    return fallback;
  }
}

/**
 * Invalidates the cached preferences for a user when they update preferences.
 */
function invalidateUserPreferenceCache(userId) {
  if (userId) {
    userPreferencesCache.delete(String(userId));
  }
}

/**
 * Fetches workspace notification preferences.
 */
async function getWorkspaceNotificationPreferences(workspaceOrId) {
  if (!workspaceOrId) return { ...DEFAULT_WORKSPACE_PREFERENCES };

  if (typeof workspaceOrId === 'object' && workspaceOrId !== null) {
    const notifs = workspaceOrId.settings?.notifications;
    return normalizeWorkspacePreferences(notifs);
  }

  const { isValidObjectId } = require('mongoose');
  if (typeof isValidObjectId === 'function' && !isValidObjectId(workspaceOrId)) {
    return { ...DEFAULT_WORKSPACE_PREFERENCES };
  }

  try {
    const ws = await Workspace.findById(workspaceOrId).select('settings.notifications');
    return ws ? normalizeWorkspacePreferences(ws.settings?.notifications) : { ...DEFAULT_WORKSPACE_PREFERENCES };
  } catch (err) {
    console.warn(`[NotificationService] Error fetching workspace ${workspaceOrId} settings:`, err.message);
    return { ...DEFAULT_WORKSPACE_PREFERENCES };
  }
}

/**
 * Generates an event fingerprint for deduplication.
 */
function createEventFingerprint(notification) {
  if (!notification || typeof notification !== 'object') return 'empty';
  const type = notification.type || 'unknown';
  const ws = notification.workspaceId || 'global';
  const actor = notification.actorId || '';
  const target = notification.targetUserId || '';
  const title = (notification.title || '').trim().toLowerCase();
  const status = notification.status || '';
  return `${type}:${ws}:${actor}:${target}:${title}:${status}`;
}

/**
 * Checks if a notification is a duplicate within the sliding window, and records it if not.
 */
function checkAndRecordDeduplication(notification) {
  const fingerprint = createEventFingerprint(notification);
  const now = Date.now();

  // Housekeeping: purge entries older than 2x window
  if (deduplicationCache.size > 200) {
    for (const [key, timestamp] of deduplicationCache.entries()) {
      if (now - timestamp > DEDUPLICATION_WINDOW_MS * 2) {
        deduplicationCache.delete(key);
      }
    }
  }

  const existing = deduplicationCache.get(fingerprint);
  if (existing && (now - existing) < DEDUPLICATION_WINDOW_MS) {
    return { isDuplicate: true, fingerprint };
  }

  deduplicationCache.set(fingerprint, now);
  return { isDuplicate: false, fingerprint };
}

/**
 * Evaluates whether a notification should be delivered based on workspace- and user-level preferences.
 * @returns {Promise<{ shouldDeliver: boolean, reason?: string, preference?: string }>}
 */
async function evaluateNotificationDelivery(notification, workspaceContext = null) {
  if (!notification || !notification.type) {
    return { shouldDeliver: false, reason: 'invalid_notification_payload' };
  }

  // 1. Workspace-level notification preferences
  const wsId = notification.workspaceId;
  const wsPrefs = await getWorkspaceNotificationPreferences(workspaceContext || wsId);

  // Execution failure check: type === 'execution_status' and status in ['error', 'compile_error', 'timeout']
  if (notification.type === 'execution_status') {
    const isFailure = ['error', 'compile_error', 'timeout'].includes(notification.status);
    if (isFailure && wsPrefs.executionFailureAlerts === false) {
      return {
        shouldDeliver: false,
        reason: 'suppressed_by_workspace_preference',
        preference: 'executionFailureAlerts'
      };
    }
  }

  // Member join notification check
  if (notification.type === 'participant_joined') {
    if (wsPrefs.emailOnMemberJoin === false) {
      return {
        shouldDeliver: false,
        reason: 'suppressed_by_workspace_preference',
        preference: 'emailOnMemberJoin'
      };
    }
  }

  // Session summary alert check
  if (notification.type === 'session_summary') {
    if (wsPrefs.sessionSummaryAlerts === false) {
      return {
        shouldDeliver: false,
        reason: 'suppressed_by_workspace_preference',
        preference: 'sessionSummaryAlerts'
      };
    }
  }

  // 2. User-level notification preferences
  // For security alerts, role changes, or removals targeted to a user
  const isSecurityNotification = [
    'security_alert',
    'role_updated',
    'member_removed',
    'permissions_updated'
  ].includes(notification.type);

  if (isSecurityNotification && notification.targetUserId) {
    const userPrefs = await getUserPreferences(notification.targetUserId);
    if (userPrefs.securityAlerts === false) {
      return {
        shouldDeliver: false,
        reason: 'suppressed_by_user_preference',
        preference: 'securityAlerts'
      };
    }
  }

  return { shouldDeliver: true };
}

/**
 * Standardizes a notification payload ensuring all mandatory fields are present.
 */
function standardizeNotification(notification) {
  const now = new Date();
  const id = notification.id || `notif_${now.getTime()}_${Math.random().toString(36).substring(2, 8)}`;
  return {
    id,
    type: notification.type || 'info',
    title: notification.title || 'Workspace Update',
    message: notification.message || '',
    workspaceId: notification.workspaceId ? String(notification.workspaceId) : null,
    actorId: notification.actorId ? String(notification.actorId) : null,
    targetUserId: notification.targetUserId ? String(notification.targetUserId) : null,
    status: notification.status || null,
    createdAt: notification.createdAt || now.toISOString(),
    ...(notification.metadata || {})
  };
}

/**
 * Dispatches a notification through Socket.IO with preference gating and deduplication.
 */
async function dispatchNotification({
  io,
  notification,
  workspaceContext = null,
  includeSender = false,
  roleGate = null
}) {
  if (!io) {
    return { delivered: false, reason: 'socket_io_not_available' };
  }

  const standardized = standardizeNotification(notification);

  // 1. Deduplication check
  const dedup = checkAndRecordDeduplication(standardized);
  if (dedup.isDuplicate) {
    return { delivered: false, reason: 'duplicate', fingerprint: dedup.fingerprint };
  }

  // 2. Preference evaluation
  const evaluation = await evaluateNotificationDelivery(standardized, workspaceContext);
  if (!evaluation.shouldDeliver) {
    return {
      delivered: false,
      reason: evaluation.reason,
      preference: evaluation.preference
    };
  }

  // 3. Socket dispatch routing
  try {
    if (standardized.targetUserId) {
      // Personal notification
      io.to(`user:${standardized.targetUserId}`).emit('notification', standardized);
      return { delivered: true, recipient: `user:${standardized.targetUserId}`, notification: standardized };
    }

    if (standardized.workspaceId) {
      const room1 = `workspace:${standardized.workspaceId}`;
      const room2 = `workspace_${standardized.workspaceId}`;

      if (includeSender || !standardized.actorId) {
        io.to(room1).to(room2).emit('notification', standardized);
      } else {
        io.to(room1).to(room2).except(`user:${standardized.actorId}`).emit('notification', standardized);
      }
      return { delivered: true, recipient: room1, notification: standardized };
    }

    // Default broadcast
    io.emit('notification', standardized);
    return { delivered: true, recipient: 'global', notification: standardized };
  } catch (err) {
    console.error('[NotificationService] Dispatch error:', err.message);
    return { delivered: false, reason: 'dispatch_error', error: err.message };
  }
}

/**
 * Clears in-memory caches (for testing and resets).
 */
function clearCaches() {
  deduplicationCache.clear();
  userPreferencesCache.clear();
}

module.exports = {
  DEFAULT_USER_PREFERENCES,
  DEFAULT_WORKSPACE_PREFERENCES,
  normalizeUserPreferences,
  normalizeWorkspacePreferences,
  getUserPreferences,
  invalidateUserPreferenceCache,
  getWorkspaceNotificationPreferences,
  createEventFingerprint,
  checkAndRecordDeduplication,
  evaluateNotificationDelivery,
  standardizeNotification,
  dispatchNotification,
  clearCaches
};
