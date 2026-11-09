/**
 * permissionValidator.js
 * CodeTrail Participant Permissions & Role-Based Access Control (RBAC) Validator
 * Author: Rishika Shah (Participant Permissions Lead)
 *
 * Provides granular permission definitions, role hierarchy validation,
 * capability mapping, and operational authorization checks across workspaces.
 */

const WORKSPACE_ROLES = ['owner', 'admin', 'editor', 'viewer'];
const ASSIGNABLE_ROLES = ['admin', 'editor', 'viewer'];

const ROLE_METADATA = {
  owner: {
    id: 'owner',
    name: 'Owner',
    level: 4,
    badgeColor: 'purple',
    description: 'Full workspace authority, member management, settings, and deletion.'
  },
  admin: {
    id: 'admin',
    name: 'Admin',
    level: 3,
    badgeColor: 'blue',
    description: 'Workspace management, settings modification, member invites, and execution management.'
  },
  editor: {
    id: 'editor',
    name: 'Editor',
    level: 2,
    badgeColor: 'emerald',
    description: 'Collaborative development access with full file editing and code execution privileges.'
  },
  viewer: {
    id: 'viewer',
    name: 'Viewer',
    level: 1,
    badgeColor: 'amber',
    description: 'Read-only access to view files, review execution history, and inspect analytics.'
  }
};

/**
 * Standardized permission capability matrix.
 */
const ROLE_PERMISSIONS = {
  owner: {
    canViewWorkspace: true,
    canEditFiles: true,
    canExecuteCode: true,
    canManageSettings: true,
    canInviteMembers: true,
    canAssignRoles: true,
    canRemoveMembers: true,
    canClearHistory: true,
    canClearExecutions: true,
    canChangeStatus: true,
    canDeleteWorkspace: true
  },
  admin: {
    canViewWorkspace: true,
    canEditFiles: true,
    canExecuteCode: true,
    canManageSettings: true,
    canInviteMembers: true,
    canAssignRoles: true, // Restricted to editor and viewer
    canRemoveMembers: true, // Restricted to editor and viewer
    canClearHistory: true,
    canClearExecutions: true,
    canChangeStatus: false,
    canDeleteWorkspace: false
  },
  editor: {
    canViewWorkspace: true,
    canEditFiles: true,
    canExecuteCode: true,
    canManageSettings: false,
    canInviteMembers: false,
    canAssignRoles: false,
    canRemoveMembers: false,
    canClearHistory: false,
    canClearExecutions: false,
    canChangeStatus: false,
    canDeleteWorkspace: false
  },
  viewer: {
    canViewWorkspace: true,
    canEditFiles: false,
    canExecuteCode: false,
    canManageSettings: false,
    canInviteMembers: false,
    canAssignRoles: false,
    canRemoveMembers: false,
    canClearHistory: false,
    canClearExecutions: false,
    canChangeStatus: false,
    canDeleteWorkspace: false
  }
};

/**
 * Human-readable labels and category tags for each permission.
 */
const PERMISSION_DEFINITIONS = [
  { key: 'canViewWorkspace', label: 'View Workspace', category: 'Read' },
  { key: 'canEditFiles', label: 'Create & Edit Files', category: 'Write' },
  { key: 'canExecuteCode', label: 'Run Code in Sandbox', category: 'Execution' },
  { key: 'canManageSettings', label: 'Modify Workspace Settings', category: 'Admin' },
  { key: 'canInviteMembers', label: 'Invite Participants', category: 'Members' },
  { key: 'canAssignRoles', label: 'Assign & Update Roles', category: 'Members' },
  { key: 'canRemoveMembers', label: 'Remove Participants', category: 'Members' },
  { key: 'canClearHistory', label: 'Clear Activity History', category: 'Audit' },
  { key: 'canClearExecutions', label: 'Clear Execution History', category: 'Audit' },
  { key: 'canChangeStatus', label: 'Archive / Restore Workspace', category: 'Owner' },
  { key: 'canDeleteWorkspace', label: 'Delete Workspace', category: 'Owner' }
];

/**
 * Returns full permissions object and active capability keys for a given role.
 * @param {string} role - 'owner' | 'admin' | 'editor' | 'viewer' | null
 * @returns {object}
 */
function getRolePermissions(role) {
  const normalized = (role || 'viewer').toLowerCase().trim();
  const caps = ROLE_PERMISSIONS[normalized] || ROLE_PERMISSIONS.viewer;
  const meta = ROLE_METADATA[normalized] || ROLE_METADATA.viewer;

  const permissionList = Object.keys(caps).filter(key => caps[key] === true);

  return {
    role: meta.id,
    roleName: meta.name,
    level: meta.level,
    badgeColor: meta.badgeColor,
    description: meta.description,
    capabilities: { ...caps },
    permissionList
  };
}

/**
 * Validates whether a role possesses a specific permission capability.
 * @param {string} role 
 * @param {string} permissionKey 
 * @returns {boolean}
 */
function hasPermission(role, permissionKey) {
  if (!role || !permissionKey) return false;
  const normalized = role.toLowerCase().trim();
  const caps = ROLE_PERMISSIONS[normalized];
  return Boolean(caps && caps[permissionKey] === true);
}

/**
 * Validates a role assignment / modification request.
 * Enforces:
 *   1. Requester must be 'owner' or 'admin'.
 *   2. Target new role must be in ['admin', 'editor', 'viewer'].
 *   3. 'owner' role cannot be assigned or transferred through this endpoint.
 *   4. Workspace owner's role can never be modified.
 *   5. Admins cannot modify other admins or the workspace owner.
 *   6. Admins cannot assign the 'admin' role (only owners can appoint admins).
 *
 * @param {object} params
 * @param {string} params.requesterRole - Role of the requesting user
 * @param {string} params.targetCurrentRole - Current role of the target participant
 * @param {string} params.targetNewRole - Desired new role
 * @param {boolean} params.isOwnerTarget - Whether the target is the workspace owner
 * @returns {{ allowed: boolean, reason: string | null, statusCode: number }}
 */
function canAssignRole({ requesterRole, targetCurrentRole, targetNewRole, isOwnerTarget = false }) {
  const reqRole = (requesterRole || '').toLowerCase().trim();
  const newRole = (targetNewRole || '').toLowerCase().trim();
  const currRole = (targetCurrentRole || '').toLowerCase().trim();

  // 1. Requester must be authorized
  if (!['owner', 'admin'].includes(reqRole)) {
    return {
      allowed: false,
      reason: 'Only workspace owners and admins are authorized to modify participant roles.',
      statusCode: 403
    };
  }

  // 2. Validate target new role format
  if (!newRole || !ASSIGNABLE_ROLES.includes(newRole)) {
    if (newRole === 'owner') {
      return {
        allowed: false,
        reason: 'The workspace owner role cannot be reassigned or transferred.',
        statusCode: 400
      };
    }
    return {
      allowed: false,
      reason: `Invalid role specified. Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}.`,
      statusCode: 400
    };
  }

  // 3. Workspace owner role protection
  if (isOwnerTarget || currRole === 'owner') {
    return {
      allowed: false,
      reason: 'The workspace owner role cannot be altered or demoted.',
      statusCode: 403
    };
  }

  // 4. Admin requester hierarchy restrictions
  if (reqRole === 'admin') {
    if (currRole === 'admin') {
      return {
        allowed: false,
        reason: 'Workspace admins cannot modify the role of another admin.',
        statusCode: 403
      };
    }
    if (newRole === 'admin') {
      return {
        allowed: false,
        reason: 'Only the workspace owner can assign or promote participants to the admin role.',
        statusCode: 403
      };
    }
  }

  return {
    allowed: true,
    reason: null,
    statusCode: 200
  };
}

/**
 * Validates member invite privileges.
 * Enforces:
 *   1. Requester must be 'owner' or 'admin'.
 *   2. Cannot invite with 'owner' role.
 *   3. Admins cannot invite with 'admin' role (only owners can appoint admins).
 *
 * @param {object} params
 * @param {string} params.requesterRole
 * @param {string} params.inviteRole
 * @returns {{ allowed: boolean, reason: string | null, statusCode: number }}
 */
function canInviteMember({ requesterRole, inviteRole = 'editor' }) {
  const reqRole = (requesterRole || '').toLowerCase().trim();
  const role = (inviteRole || 'editor').toLowerCase().trim();

  if (!['owner', 'admin'].includes(reqRole)) {
    return {
      allowed: false,
      reason: 'Only workspace owners and admins can invite new participants.',
      statusCode: 403
    };
  }

  if (role === 'owner') {
    return {
      allowed: false,
      reason: 'Cannot invite a participant as workspace owner.',
      statusCode: 400
    };
  }

  if (!ASSIGNABLE_ROLES.includes(role)) {
    return {
      allowed: false,
      reason: `Invalid role specified for invite. Must be one of: ${ASSIGNABLE_ROLES.join(', ')}.`,
      statusCode: 400
    };
  }

  if (reqRole === 'admin' && role === 'admin') {
    return {
      allowed: false,
      reason: 'Only the workspace owner can invite or appoint participants with the admin role.',
      statusCode: 403
    };
  }

  return {
    allowed: true,
    reason: null,
    statusCode: 200
  };
}

/**
 * Validates participant removal authorization.
 * Enforces:
 *   1. Requester must be 'owner' or 'admin'.
 *   2. The workspace owner cannot be removed by anyone (including self).
 *   3. Admins cannot remove other admins or the owner.
 *
 * @param {object} params
 * @param {string} params.requesterRole
 * @param {string} params.targetRole
 * @param {boolean} params.isOwnerTarget
 * @returns {{ allowed: boolean, reason: string | null, statusCode: number }}
 */
function canRemoveMember({ requesterRole, targetRole, isOwnerTarget = false }) {
  const reqRole = (requesterRole || '').toLowerCase().trim();
  const tRole = (targetRole || '').toLowerCase().trim();

  if (!['owner', 'admin'].includes(reqRole)) {
    return {
      allowed: false,
      reason: 'Only workspace owners and admins can remove participants.',
      statusCode: 403
    };
  }

  if (isOwnerTarget || tRole === 'owner') {
    return {
      allowed: false,
      reason: 'The workspace owner cannot be removed.',
      statusCode: 400
    };
  }

  if (reqRole === 'admin' && tRole === 'admin') {
    return {
      allowed: false,
      reason: 'Workspace admins cannot remove another admin. Contact the workspace owner.',
      statusCode: 403
    };
  }

  return {
    allowed: true,
    reason: null,
    statusCode: 200
  };
}

/**
 * Returns full role definitions and permission metadata for API consumers and UI rendering.
 * @returns {object}
 */
function getAllRoleDefinitions() {
  const roles = {};
  WORKSPACE_ROLES.forEach(r => {
    roles[r] = {
      ...ROLE_METADATA[r],
      ...getRolePermissions(r)
    };
  });

  return {
    roles,
    permissionDefinitions: PERMISSION_DEFINITIONS,
    assignableRoles: ASSIGNABLE_ROLES
  };
}

module.exports = {
  WORKSPACE_ROLES,
  ASSIGNABLE_ROLES,
  ROLE_METADATA,
  ROLE_PERMISSIONS,
  PERMISSION_DEFINITIONS,
  getRolePermissions,
  hasPermission,
  canAssignRole,
  canInviteMember,
  canRemoveMember,
  getAllRoleDefinitions
};
