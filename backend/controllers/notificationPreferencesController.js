const User = require('../models/User');

const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  securityAlerts: true,
  weeklyProgress: true,
  platformNews: false
});

const ALLOWED_PREFERENCE_KEYS = Object.freeze([
  'securityAlerts',
  'weeklyProgress',
  'platformNews'
]);

/**
 * Extracts authenticated user ID strictly from req.user populated by auth middleware.
 */
const getAuthenticatedUserId = (req) => {
  if (!req || !req.user) return null;
  return req.user._id || req.user.id || null;
};

/**
 * Normalizes raw user notificationPreferences into a complete object using defaults for missing keys.
 */
const normalizeNotificationPreferences = (rawPreferences) => {
  const source = rawPreferences && typeof rawPreferences === 'object' ? rawPreferences : {};
  return ALLOWED_PREFERENCE_KEYS.reduce((acc, key) => {
    acc[key] = typeof source[key] === 'boolean'
      ? source[key]
      : DEFAULT_NOTIFICATION_PREFERENCES[key];
    return acc;
  }, {});
};

/**
 * Validates PATCH payload against allowed preference keys and strict boolean values.
 * Rejects unknown keys (preventing mass assignment), non-boolean types, and empty updates.
 */
const validatePreferenceUpdates = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, message: 'Request body must be a valid JSON object.' };
  }

  const keys = Object.keys(body);
  if (keys.length === 0) {
    return { valid: false, message: 'At least one notification preference must be provided.' };
  }

  const invalidKeys = keys.filter((key) => !ALLOWED_PREFERENCE_KEYS.includes(key));
  if (invalidKeys.length > 0) {
    return {
      valid: false,
      message: `Unsupported preference field(s): ${invalidKeys.join(', ')}. Allowed fields: ${ALLOWED_PREFERENCE_KEYS.join(', ')}.`
    };
  }

  const setFields = {};
  for (const key of keys) {
    const value = body[key];
    if (typeof value !== 'boolean') {
      return {
        valid: false,
        message: `Preference "${key}" must be a boolean value (true or false).`
      };
    }
    setFields[`notificationPreferences.${key}`] = value;
  }

  return { valid: true, setFields };
};

/**
 * Supports both Mongoose Query objects (.select chaining) and direct Promise stubs in unit tests.
 */
const resolveUserQuery = async (queryOrPromise) => {
  if (queryOrPromise && typeof queryOrPromise.select === 'function') {
    return queryOrPromise.select('notificationPreferences');
  }
  return queryOrPromise;
};

/**
 * GET /api/notifications/preferences
 * Returns the authenticated user's persisted notification preferences with defaults applied.
 */
exports.getNotificationPreferences = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (req.dbOffline) {
      return res.status(503).json({
        message: 'Database connection is currently offline or unreachable.'
      });
    }

    const user = await resolveUserQuery(User.findById(userId));
    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    return res.status(200).json({
      preferences: normalizeNotificationPreferences(user.notificationPreferences)
    });
  } catch (err) {
    console.error('Get Notification Preferences Error:', err.message);
    return res.status(500).json({
      message: 'Failed to retrieve notification preferences.'
    });
  }
};

/**
 * PATCH /api/notifications/preferences
 * Partially updates allowed boolean notification preferences strictly for the authenticated user.
 */
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const validation = validatePreferenceUpdates(req.body);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    if (req.dbOffline) {
      return res.status(503).json({
        message: 'Database connection is currently offline or unreachable.'
      });
    }

    const updatedUser = await resolveUserQuery(
      User.findByIdAndUpdate(
        userId,
        { $set: validation.setFields },
        { returnDocument: 'after', runValidators: true }
      )
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    return res.status(200).json({
      message: 'Notification preferences updated successfully.',
      preferences: normalizeNotificationPreferences(updatedUser.notificationPreferences)
    });
  } catch (err) {
    console.error('Update Notification Preferences Error:', err.message);
    return res.status(500).json({
      message: 'Failed to update notification preferences.'
    });
  }
};

exports.DEFAULT_NOTIFICATION_PREFERENCES = DEFAULT_NOTIFICATION_PREFERENCES;
exports.ALLOWED_PREFERENCE_KEYS = ALLOWED_PREFERENCE_KEYS;
exports.normalizeNotificationPreferences = normalizeNotificationPreferences;
exports.validatePreferenceUpdates = validatePreferenceUpdates;

