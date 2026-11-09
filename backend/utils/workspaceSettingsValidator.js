/**
 * workspaceSettingsValidator.js
 * CodeTrail Workspace Settings & Preferences Validator
 * Lead: Anistina Dsouza (Execution & QA / Workspace Settings Lead)
 *
 * Provides schema validation, boundary verification, and role-based access checks
 * for workspace configuration, details, and runtime preferences.
 */

const ALLOWED_LANGUAGES = ['javascript', 'python', 'cpp', 'java', 'rust', 'go', 'typescript'];
const ALLOWED_BRAND_COLORS = ['purple', 'cyan', 'emerald', 'rose', 'amber', 'blue'];
const ALLOWED_STATUSES = ['active', 'archived'];

/**
 * Validates workspace title format and length constraints.
 * @param {string} title 
 * @returns {{ isValid: boolean, error: string|null, sanitizedTitle: string }}
 */
function validateWorkspaceTitle(title) {
  if (title === undefined || title === null) {
    return { isValid: false, error: 'Workspace title is required.', sanitizedTitle: '' };
  }
  if (typeof title !== 'string') {
    return { isValid: false, error: 'Workspace title must be a string.', sanitizedTitle: '' };
  }
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Workspace title cannot be empty.', sanitizedTitle: '' };
  }
  if (trimmed.length > 80) {
    return { isValid: false, error: 'Workspace title cannot exceed 80 characters.', sanitizedTitle: trimmed.substring(0, 80) };
  }
  return { isValid: true, error: null, sanitizedTitle: trimmed };
}

/**
 * Validates workspace description length and constraints.
 * @param {string} description 
 * @returns {{ isValid: boolean, error: string|null, sanitizedDescription: string }}
 */
function validateWorkspaceDescription(description) {
  if (description === undefined || description === null) {
    return { isValid: true, error: null, sanitizedDescription: '' };
  }
  if (typeof description !== 'string') {
    return { isValid: false, error: 'Workspace description must be a string.', sanitizedDescription: '' };
  }
  const trimmed = description.trim();
  if (trimmed.length > 300) {
    return { isValid: false, error: 'Description cannot exceed 300 characters.', sanitizedDescription: trimmed.substring(0, 300) };
  }
  return { isValid: true, error: null, sanitizedDescription: trimmed };
}

/**
 * Validates programming language runtime against whitelist.
 * @param {string} language 
 * @returns {{ isValid: boolean, error: string|null }}
 */
function validateWorkspaceLanguage(language) {
  if (!language || typeof language !== 'string') {
    return { isValid: false, error: 'Primary language runtime is required.' };
  }
  const normalized = language.trim().toLowerCase();
  if (!ALLOWED_LANGUAGES.includes(normalized)) {
    return { 
      isValid: false, 
      error: `Invalid programming language runtime: "${language}". Allowed: ${ALLOWED_LANGUAGES.join(', ')}` 
    };
  }
  return { isValid: true, error: null, language: normalized };
}

/**
 * Validates theme accent color against approved brand palette.
 * @param {string} color 
 * @returns {{ isValid: boolean, error: string|null }}
 */
function validateWorkspaceBrandColor(color) {
  if (!color || typeof color !== 'string') {
    return { isValid: false, error: 'Brand accent color is required.' };
  }
  const normalized = color.trim().toLowerCase();
  if (!ALLOWED_BRAND_COLORS.includes(normalized)) {
    return { 
      isValid: false, 
      error: `Invalid brand color: "${color}". Allowed: ${ALLOWED_BRAND_COLORS.join(', ')}` 
    };
  }
  return { isValid: true, error: null, color: normalized };
}

/**
 * Validates workspace status against whitelist.
 * @param {string} status 
 * @returns {{ isValid: boolean, error: string|null }}
 */
function validateWorkspaceStatus(status) {
  if (!status || typeof status !== 'string') {
    return { isValid: false, error: 'Workspace status is required.' };
  }
  const normalized = status.trim().toLowerCase();
  if (!ALLOWED_STATUSES.includes(normalized)) {
    return { 
      isValid: false, 
      error: `Invalid workspace status: "${status}". Allowed: ${ALLOWED_STATUSES.join(', ')}` 
    };
  }
  return { isValid: true, error: null, status: normalized };
}

/**
 * Validates workspace preference configuration object.
 * @param {object} settings 
 * @returns {{ isValid: boolean, error: string|null, sanitizedSettings: object }}
 */
function validateWorkspacePreferences(settings) {
  if (settings === undefined || settings === null) {
    return { isValid: true, error: null, sanitizedSettings: {} };
  }
  if (typeof settings !== 'object' || Array.isArray(settings)) {
    return { isValid: false, error: 'Settings must be a valid configuration object.', sanitizedSettings: {} };
  }

  const sanitized = {};

  if (settings.isPublic !== undefined) {
    sanitized.isPublic = Boolean(settings.isPublic);
  }

  if (settings.allowAnonymousExecution !== undefined) {
    sanitized.allowAnonymousExecution = Boolean(settings.allowAnonymousExecution);
  }

  if (settings.autoSaveInterval !== undefined) {
    const interval = Number(settings.autoSaveInterval);
    if (isNaN(interval) || interval < 1000 || interval > 30000) {
      return { 
        isValid: false, 
        error: 'autoSaveInterval must be a number between 1000ms and 30000ms.', 
        sanitizedSettings: {} 
      };
    }
    sanitized.autoSaveInterval = Math.round(interval);
  }

  if (settings.tabSize !== undefined) {
    const tabSize = Number(settings.tabSize);
    if (![2, 4].includes(tabSize)) {
      return { 
        isValid: false, 
        error: 'tabSize must be either 2 or 4.', 
        sanitizedSettings: {} 
      };
    }
    sanitized.tabSize = tabSize;
  }

  if (settings.wordWrap !== undefined) {
    sanitized.wordWrap = Boolean(settings.wordWrap);
  }

  if (settings.notifications !== undefined) {
    if (typeof settings.notifications !== 'object' || settings.notifications === null || Array.isArray(settings.notifications)) {
      return { 
        isValid: false, 
        error: 'notifications must be an object containing alert toggles.', 
        sanitizedSettings: {} 
      };
    }
    sanitized.notifications = {};
    if (settings.notifications.emailOnMemberJoin !== undefined) {
      sanitized.notifications.emailOnMemberJoin = Boolean(settings.notifications.emailOnMemberJoin);
    }
    if (settings.notifications.executionFailureAlerts !== undefined) {
      sanitized.notifications.executionFailureAlerts = Boolean(settings.notifications.executionFailureAlerts);
    }
    if (settings.notifications.sessionSummaryAlerts !== undefined) {
      sanitized.notifications.sessionSummaryAlerts = Boolean(settings.notifications.sessionSummaryAlerts);
    }
  }

  return { isValid: true, error: null, sanitizedSettings: sanitized };
}

/**
 * Checks whether user role has permission to modify workspace settings/metadata.
 * @param {string} role - 'owner' | 'admin' | 'editor' | 'viewer' | null
 * @returns {boolean}
 */
function hasSettingsPermission(role) {
  return ['owner', 'admin'].includes(role);
}

/**
 * Checks whether user role has permission to archive or delete a workspace.
 * @param {string} role - 'owner' | 'admin' | 'editor' | 'viewer' | null
 * @returns {boolean}
 */
function canModifyStatus(role) {
  return role === 'owner';
}

/**
 * Checks whether user role has permission to modify workspace files.
 * @param {string} role - 'owner' | 'admin' | 'editor' | 'viewer' | null
 * @returns {boolean}
 */
function canModifyFiles(role) {
  return ['owner', 'admin', 'editor'].includes(role);
}

/**
 * Deep merges existing workspace preferences with partial updates.
 * @param {object} existing 
 * @param {object} incoming 
 * @returns {object}
 */
function mergeWorkspaceSettings(existing = {}, incoming = {}) {
  const merged = { ...existing, ...incoming };
  if (existing.notifications || incoming.notifications) {
    merged.notifications = {
      ...(existing.notifications || {}),
      ...(incoming.notifications || {})
    };
  }
  return merged;
}

module.exports = {
  ALLOWED_LANGUAGES,
  ALLOWED_BRAND_COLORS,
  ALLOWED_STATUSES,
  validateWorkspaceTitle,
  validateWorkspaceDescription,
  validateWorkspaceLanguage,
  validateWorkspaceBrandColor,
  validateWorkspaceStatus,
  validateWorkspacePreferences,
  hasSettingsPermission,
  canModifyStatus,
  canModifyFiles,
  mergeWorkspaceSettings
};

