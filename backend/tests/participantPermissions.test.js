/**
 * participantPermissions.test.js
 * CodeTrail Participant Permissions & Role-Based Access Control (RBAC) Test Suite
 * Author: Rishika Shah (Participant Permissions Lead)
 *
 * Comprehensive automated test suite verifying all 6 assignment requirements:
 *   - Section 1: Display Participant Permissions & Permission Capability Matrix
 *   - Section 2: Assigning User Roles & Input Validation
 *   - Section 3: Updating Existing Member Roles & Dynamic Capability Sync
 *   - Section 4: Permission Validation Rules & Capability Checkers
 *   - Section 5: Unauthorized Role Modification & Privilege Escalation Guards
 *   - Section 6: Access Denial for Restricted Operations (Backend RBAC Enforcement)
 *   - Section 7: Authorized Operations Verification Across Roles
 *   - Section 8: Database Persistence & Activity History Auditing
 */

const assert = require('assert');
const mongoose = require('mongoose');
mongoose.set('bufferCommands', false);
const {
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
} = require('../utils/permissionValidator');

const {
  getWorkspaceMembers,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
  getWorkspacePermissions,
  updateWorkspace,
  deleteWorkspace,
  clearWorkspaceHistory
} = require('../controllers/workspaceController');

const {
  clearWorkspaceExecutions
} = require('../controllers/executionController');

const Workspace = require('../models/Workspace');
const User = require('../models/User');

console.log('\n═══════════════════════════════════════════════════════════════════════════');
console.log('🛡️   CODETRAIL PARTICIPANT PERMISSIONS & RBAC TEST SUITE');
console.log('    Lead: Rishika Shah (Participant Permissions & Access Control Lead)');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

let totalTests = 0;
let passedTests = 0;

function assertPass(label, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✔ [PASS] ${label} ${details ? `(${details})` : ''}`);
  } else {
    console.error(`  ❌ [FAIL] ${label} ${details ? `(${details})` : ''}`);
    assert.fail(`Test Assertion Failed: ${label}`);
  }
}

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
}

module.exports = (async () => {
  // Test User IDs
  const ownerId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const editorId = new mongoose.Types.ObjectId();
  const viewerId = new mongoose.Types.ObjectId();
  const outsiderId = new mongoose.Types.ObjectId();
  const workspaceId = new mongoose.Types.ObjectId();

  // Mock Workspace in-memory document
  const mockWorkspace = {
    _id: workspaceId,
    title: 'CodeTrail Distributed Systems Laboratory',
    description: 'Collaborative development workspace for distributed consensus engines',
    language: 'javascript',
    brandColor: 'purple',
    icon: 'Rocket',
    status: 'active',
    settings: {
      isPublic: false,
      allowAnonymousExecution: false,
      autoSaveInterval: 2500,
      tabSize: 2,
      wordWrap: true,
      notifications: {
        emailOnMemberJoin: false,
        executionFailureAlerts: true,
        sessionSummaryAlerts: true
      }
    },
    owner: {
      _id: ownerId,
      name: 'Rishika Shah (Owner)',
      email: 'rishika.owner@codetrail.dev',
      status: 'online'
    },
    members: [
      {
        user: {
          _id: adminId,
          name: 'Alex Rivera (Admin)',
          email: 'alex.admin@codetrail.dev',
          status: 'online'
        },
        role: 'admin',
        joinedAt: new Date(Date.now() - 3600000)
      },
      {
        user: {
          _id: editorId,
          name: 'David Chen (Editor)',
          email: 'david.editor@codetrail.dev',
          status: 'online'
        },
        role: 'editor',
        joinedAt: new Date(Date.now() - 7200000)
      },
      {
        user: {
          _id: viewerId,
          name: 'Sarah Lin (Viewer)',
          email: 'sarah.viewer@codetrail.dev',
          status: 'offline'
        },
        role: 'viewer',
        joinedAt: new Date(Date.now() - 10800000)
      }
    ],
    activityLogs: [],
    save: async function() { return this; }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 1: Display Participant Permissions & Permission Capability Matrix
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('▶ Test Section 1: Display Participant Permissions & Capability Matrix\n');
  {
    // 1.1 All roles are defined in metadata
    assertPass('Workspace defines 4 canonical roles', WORKSPACE_ROLES.length === 4);
    assertPass('Assignable roles exclude owner', !ASSIGNABLE_ROLES.includes('owner') && ASSIGNABLE_ROLES.length === 3);

    // 1.2 Capability mapping for owner
    const ownerPerms = getRolePermissions('owner');
    assertPass('Owner has level 4 authority', ownerPerms.level === 4);
    assertPass('Owner has full capabilities', ownerPerms.capabilities.canDeleteWorkspace === true && ownerPerms.capabilities.canAssignRoles === true);
    assertPass('Owner permission list includes file editing', ownerPerms.permissionList.includes('canEditFiles'));

    // 1.3 Capability mapping for admin
    const adminPerms = getRolePermissions('admin');
    assertPass('Admin has level 3 authority', adminPerms.level === 3);
    assertPass('Admin can manage settings and invite members', adminPerms.capabilities.canManageSettings === true && adminPerms.capabilities.canInviteMembers === true);
    assertPass('Admin cannot delete workspace', adminPerms.capabilities.canDeleteWorkspace === false);
    assertPass('Admin cannot archive workspace', adminPerms.capabilities.canChangeStatus === false);

    // 1.4 Capability mapping for editor
    const editorPerms = getRolePermissions('editor');
    assertPass('Editor has level 2 authority', editorPerms.level === 2);
    assertPass('Editor can edit files and execute code', editorPerms.capabilities.canEditFiles === true && editorPerms.capabilities.canExecuteCode === true);
    assertPass('Editor cannot manage settings', editorPerms.capabilities.canManageSettings === false);
    assertPass('Editor cannot invite or assign roles', editorPerms.capabilities.canInviteMembers === false && editorPerms.capabilities.canAssignRoles === false);

    // 1.5 Capability mapping for viewer
    const viewerPerms = getRolePermissions('viewer');
    assertPass('Viewer has level 1 authority', viewerPerms.level === 1);
    assertPass('Viewer is locked from editing files', viewerPerms.capabilities.canEditFiles === false);
    assertPass('Viewer cannot run code', viewerPerms.capabilities.canExecuteCode === false);
    assertPass('Viewer can view workspace', viewerPerms.capabilities.canViewWorkspace === true);

    // 1.6 All role definitions returned cleanly
    const allDefs = getAllRoleDefinitions();
    assertPass('getAllRoleDefinitions returns all 4 roles', Object.keys(allDefs.roles).length === 4);
    assertPass('getAllRoleDefinitions returns human-readable definitions', Array.isArray(allDefs.permissionDefinitions) && allDefs.permissionDefinitions.length >= 10);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 2: Assigning User Roles & Input Validation
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Test Section 2: Assigning User Roles & Input Validation\n');
  {
    // 2.1 Owner assigning admin role
    const ownerToAdmin = canAssignRole({
      requesterRole: 'owner',
      targetCurrentRole: 'editor',
      targetNewRole: 'admin',
      isOwnerTarget: false
    });
    assertPass('Owner can promote editor to admin', ownerToAdmin.allowed === true && ownerToAdmin.statusCode === 200);

    // 2.2 Owner assigning editor role
    const ownerToEditor = canAssignRole({
      requesterRole: 'owner',
      targetCurrentRole: 'viewer',
      targetNewRole: 'editor',
      isOwnerTarget: false
    });
    assertPass('Owner can promote viewer to editor', ownerToEditor.allowed === true);

    // 2.3 Owner assigning viewer role (demotion)
    const ownerToViewer = canAssignRole({
      requesterRole: 'owner',
      targetCurrentRole: 'admin',
      targetNewRole: 'viewer',
      isOwnerTarget: false
    });
    assertPass('Owner can demote admin to viewer', ownerToViewer.allowed === true);

    // 2.4 Admin assigning viewer to editor
    const adminToEditor = canAssignRole({
      requesterRole: 'admin',
      targetCurrentRole: 'viewer',
      targetNewRole: 'editor',
      isOwnerTarget: false
    });
    assertPass('Admin can promote viewer to editor', adminToEditor.allowed === true);

    // 2.5 Admin assigning editor to viewer
    const adminToViewer = canAssignRole({
      requesterRole: 'admin',
      targetCurrentRole: 'editor',
      targetNewRole: 'viewer',
      isOwnerTarget: false
    });
    assertPass('Admin can demote editor to viewer', adminToViewer.allowed === true);

    // 2.6 Rejecting attempts to assign invalid role strings
    const invalidRole = canAssignRole({
      requesterRole: 'owner',
      targetCurrentRole: 'editor',
      targetNewRole: 'superadmin',
      isOwnerTarget: false
    });
    assertPass('Invalid role string "superadmin" rejected with HTTP 400', invalidRole.allowed === false && invalidRole.statusCode === 400);

    // 2.7 Rejecting attempts to assign 'owner' role
    const assignOwner = canAssignRole({
      requesterRole: 'owner',
      targetCurrentRole: 'editor',
      targetNewRole: 'owner',
      isOwnerTarget: false
    });
    assertPass('Assigning "owner" role rejected with HTTP 400', assignOwner.allowed === false && assignOwner.statusCode === 400);

    // 2.8 Protecting the workspace owner from being demoted or modified
    const demoteOwner = canAssignRole({
      requesterRole: 'owner',
      targetCurrentRole: 'owner',
      targetNewRole: 'admin',
      isOwnerTarget: true
    });
    assertPass('Modifying the workspace owner rejected with HTTP 403', demoteOwner.allowed === false && demoteOwner.statusCode === 403);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 3: Updating Existing Member Roles & Dynamic Capability Sync
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Test Section 3: Updating Existing Member Roles & Dynamic Capability Sync\n');
  {
    // 3.1 Initial capabilities of target member (Editor)
    let editorCaps = getRolePermissions('editor').capabilities;
    assertPass('Initial editor role has canEditFiles=true', editorCaps.canEditFiles === true);
    assertPass('Initial editor role has canManageSettings=false', editorCaps.canManageSettings === false);

    // 3.2 Dynamic role promotion to Admin
    let promotedCaps = getRolePermissions('admin').capabilities;
    assertPass('Promoted role gains canManageSettings=true', promotedCaps.canManageSettings === true);
    assertPass('Promoted role gains canInviteMembers=true', promotedCaps.canInviteMembers === true);
    assertPass('Promoted role retains canEditFiles=true', promotedCaps.canEditFiles === true);

    // 3.3 Dynamic role demotion to Viewer
    let demotedCaps = getRolePermissions('viewer').capabilities;
    assertPass('Demoted viewer role loses canEditFiles (false)', demotedCaps.canEditFiles === false);
    assertPass('Demoted viewer role loses canExecuteCode (false)', demotedCaps.canExecuteCode === false);
    assertPass('Demoted viewer role retains canViewWorkspace (true)', demotedCaps.canViewWorkspace === true);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 4: Permission Validation Rules & Capability Checkers
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Test Section 4: Permission Validation Rules & Capability Checkers\n');
  {
    // 4.1 hasPermission checks across roles
    assertPass('hasPermission(owner, canDeleteWorkspace) === true', hasPermission('owner', 'canDeleteWorkspace') === true);
    assertPass('hasPermission(admin, canDeleteWorkspace) === false', hasPermission('admin', 'canDeleteWorkspace') === false);
    assertPass('hasPermission(editor, canDeleteWorkspace) === false', hasPermission('editor', 'canDeleteWorkspace') === false);
    assertPass('hasPermission(viewer, canDeleteWorkspace) === false', hasPermission('viewer', 'canDeleteWorkspace') === false);

    // 4.2 File editing permission
    assertPass('hasPermission(owner, canEditFiles) === true', hasPermission('owner', 'canEditFiles') === true);
    assertPass('hasPermission(admin, canEditFiles) === true', hasPermission('admin', 'canEditFiles') === true);
    assertPass('hasPermission(editor, canEditFiles) === true', hasPermission('editor', 'canEditFiles') === true);
    assertPass('hasPermission(viewer, canEditFiles) === false', hasPermission('viewer', 'canEditFiles') === false);

    // 4.3 Settings management permission
    assertPass('hasPermission(owner, canManageSettings) === true', hasPermission('owner', 'canManageSettings') === true);
    assertPass('hasPermission(admin, canManageSettings) === true', hasPermission('admin', 'canManageSettings') === true);
    assertPass('hasPermission(editor, canManageSettings) === false', hasPermission('editor', 'canManageSettings') === false);
    assertPass('hasPermission(viewer, canManageSettings) === false', hasPermission('viewer', 'canManageSettings') === false);

    // 4.4 Fallback for null / undefined roles
    assertPass('hasPermission(null, canEditFiles) === false', hasPermission(null, 'canEditFiles') === false);
    assertPass('hasPermission(undefined, canEditFiles) === false', hasPermission(undefined, 'canEditFiles') === false);
    assertPass('hasPermission("unknown_role", canEditFiles) === false', hasPermission('unknown_role', 'canEditFiles') === false);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 5: Unauthorized Role Modification & Privilege Escalation Guards
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Test Section 5: Unauthorized Role Modification & Privilege Escalation Guards\n');
  {
    // 5.1 Editor attempting to modify another participant's role
    const editorAttempt = canAssignRole({
      requesterRole: 'editor',
      targetCurrentRole: 'viewer',
      targetNewRole: 'editor',
      isOwnerTarget: false
    });
    assertPass('Editor attempting role modification rejected with HTTP 403', editorAttempt.allowed === false && editorAttempt.statusCode === 403);

    // 5.2 Viewer attempting to modify another participant's role
    const viewerAttempt = canAssignRole({
      requesterRole: 'viewer',
      targetCurrentRole: 'editor',
      targetNewRole: 'admin',
      isOwnerTarget: false
    });
    assertPass('Viewer attempting role modification rejected with HTTP 403', viewerAttempt.allowed === false && viewerAttempt.statusCode === 403);

    // 5.3 Admin attempting privilege escalation: appointing another Admin
    const adminEscalation = canAssignRole({
      requesterRole: 'admin',
      targetCurrentRole: 'editor',
      targetNewRole: 'admin',
      isOwnerTarget: false
    });
    assertPass('Admin appointing another admin rejected with HTTP 403 (Owner only)', adminEscalation.allowed === false && adminEscalation.statusCode === 403);

    // 5.4 Admin attempting to demote or alter another Admin
    const adminOnAdmin = canAssignRole({
      requesterRole: 'admin',
      targetCurrentRole: 'admin',
      targetNewRole: 'editor',
      isOwnerTarget: false
    });
    assertPass('Admin modifying another admin rejected with HTTP 403', adminOnAdmin.allowed === false && adminOnAdmin.statusCode === 403);

    // 5.5 Admin attempting to alter the workspace Owner
    const adminOnOwner = canAssignRole({
      requesterRole: 'admin',
      targetCurrentRole: 'owner',
      targetNewRole: 'viewer',
      isOwnerTarget: true
    });
    assertPass('Admin altering workspace owner rejected with HTTP 403', adminOnOwner.allowed === false && adminOnOwner.statusCode === 403);

    // 5.6 Non-member / null requester
    const nonMember = canAssignRole({
      requesterRole: null,
      targetCurrentRole: 'editor',
      targetNewRole: 'admin',
      isOwnerTarget: false
    });
    assertPass('Non-member role modification rejected with HTTP 403', nonMember.allowed === false && nonMember.statusCode === 403);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 6: Access Denial for Restricted Operations (Backend RBAC Enforcement)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Test Section 6: Access Denial for Restricted Operations (Backend RBAC)\n');
  {
    // Stubs for controller testing
    const origFindById = Workspace.findById;
    Workspace.findById = function() {
      return {
        ...mockWorkspace,
        populate: function() { return this; }
      };
    };

    try {
      // 6.1 Viewer attempting to modify workspace files (HTTP 403)
      const reqViewerFiles = {
        params: { id: String(workspaceId) },
        body: { files: [{ id: 'hack.js', name: 'hack.js', content: 'malicious' }] },
        user: { _id: viewerId, name: 'Sarah Lin' }
      };
      const resViewerFiles = createMockRes();
      await updateWorkspace(reqViewerFiles, resViewerFiles);
      assertPass('Viewer locked from modifying workspace files (HTTP 403)', resViewerFiles.statusCode === 403);

      // 6.2 Editor attempting to change workspace settings/title (HTTP 403)
      const reqEditorSettings = {
        params: { id: String(workspaceId) },
        body: { title: 'Compromised Workspace Title' },
        user: { _id: editorId, name: 'David Chen' }
      };
      const resEditorSettings = createMockRes();
      await updateWorkspace(reqEditorSettings, resEditorSettings);
      assertPass('Editor locked from changing workspace settings (HTTP 403)', resEditorSettings.statusCode === 403);

      // 6.3 Admin attempting to delete workspace (HTTP 403 - Owner only)
      const reqAdminDelete = {
        params: { id: String(workspaceId) },
        user: { _id: adminId, name: 'Alex Rivera' }
      };
      const resAdminDelete = createMockRes();
      await deleteWorkspace(reqAdminDelete, resAdminDelete);
      assertPass('Admin locked from deleting workspace (HTTP 403 - Owner only)', resAdminDelete.statusCode === 403);

      // 6.4 Admin attempting to archive workspace status (HTTP 403 - Owner only)
      const reqAdminArchive = {
        params: { id: String(workspaceId) },
        body: { status: 'archived' },
        user: { _id: adminId, name: 'Alex Rivera' }
      };
      const resAdminArchive = createMockRes();
      await updateWorkspace(reqAdminArchive, resAdminArchive);
      assertPass('Admin locked from archiving workspace (HTTP 403 - Owner only)', resAdminArchive.statusCode === 403);

      // 6.5 Editor attempting to clear workspace history (HTTP 403)
      const reqEditorHistory = {
        params: { id: String(workspaceId) },
        user: { _id: editorId, name: 'David Chen' }
      };
      const resEditorHistory = createMockRes();
      await clearWorkspaceHistory(reqEditorHistory, resEditorHistory);
      assertPass('Editor locked from clearing workspace history (HTTP 403)', resEditorHistory.statusCode === 403);

      // 6.6 Viewer attempting to clear workspace executions (HTTP 403)
      const reqViewerExec = {
        params: { id: String(workspaceId) },
        user: { _id: viewerId, name: 'Sarah Lin' }
      };
      const resViewerExec = createMockRes();
      await clearWorkspaceExecutions(reqViewerExec, resViewerExec);
      assertPass('Viewer locked from clearing execution history (HTTP 403)', resViewerExec.statusCode === 403);

      // 6.7 Editor attempting to invite a new member (HTTP 403)
      const inviteByEditor = canInviteMember({ requesterRole: 'editor', inviteRole: 'viewer' });
      assertPass('Editor locked from inviting new members (HTTP 403)', inviteByEditor.allowed === false && inviteByEditor.statusCode === 403);

      // 6.8 Viewer attempting to invite a new member (HTTP 403)
      const inviteByViewer = canInviteMember({ requesterRole: 'viewer', inviteRole: 'viewer' });
      assertPass('Viewer locked from inviting new members (HTTP 403)', inviteByViewer.allowed === false && inviteByViewer.statusCode === 403);

      // 6.9 Editor attempting to remove a member (HTTP 403)
      const removeByEditor = canRemoveMember({ requesterRole: 'editor', targetRole: 'viewer' });
      assertPass('Editor locked from removing participants (HTTP 403)', removeByEditor.allowed === false && removeByEditor.statusCode === 403);
    } finally {
      Workspace.findById = origFindById;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 7: Authorized Operations Verification Across Roles
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Test Section 7: Authorized Operations Verification Across Roles\n');
  {
    const origFindById = Workspace.findById;
    Workspace.findById = function() {
      return {
        ...mockWorkspace,
        populate: function() { return this; }
      };
    };

    try {
      // 7.1 Owner can invite admin
      const ownerInviteAdmin = canInviteMember({ requesterRole: 'owner', inviteRole: 'admin' });
      assertPass('Owner can invite participant with admin role (HTTP 200)', ownerInviteAdmin.allowed === true);

      // 7.2 Admin can invite editor
      const adminInviteEditor = canInviteMember({ requesterRole: 'admin', inviteRole: 'editor' });
      assertPass('Admin can invite participant with editor role (HTTP 200)', adminInviteEditor.allowed === true);

      // 7.3 Admin can invite viewer
      const adminInviteViewer = canInviteMember({ requesterRole: 'admin', inviteRole: 'viewer' });
      assertPass('Admin can invite participant with viewer role (HTTP 200)', adminInviteViewer.allowed === true);

      // 7.4 Owner can remove admin
      const ownerRemoveAdmin = canRemoveMember({ requesterRole: 'owner', targetRole: 'admin', isOwnerTarget: false });
      assertPass('Owner can remove admin participant (HTTP 200)', ownerRemoveAdmin.allowed === true);

      // 7.5 Admin can remove viewer
      const adminRemoveViewer = canRemoveMember({ requesterRole: 'admin', targetRole: 'viewer', isOwnerTarget: false });
      assertPass('Admin can remove viewer participant (HTTP 200)', adminRemoveViewer.allowed === true);

      // 7.6 Editor can modify files
      const reqEditorFileEdit = {
        params: { id: String(workspaceId) },
        body: { files: [{ id: 'main.js', name: 'main.js', content: 'console.log("valid code");' }] },
        user: { _id: editorId, name: 'David Chen' }
      };
      const resEditorFileEdit = createMockRes();
      await updateWorkspace(reqEditorFileEdit, resEditorFileEdit);
      assertPass('Editor successfully updates workspace files (HTTP 200)', resEditorFileEdit.statusCode === 200);

      // 7.7 Admin can modify workspace preferences and settings
      const reqAdminSettings = {
        params: { id: String(workspaceId) },
        body: { title: 'Updated Distributed Systems Lab', settings: { autoSaveInterval: 3000 } },
        user: { _id: adminId, name: 'Alex Rivera' }
      };
      const resAdminSettings = createMockRes();
      await updateWorkspace(reqAdminSettings, resAdminSettings);
      assertPass('Admin successfully updates workspace settings (HTTP 200)', resAdminSettings.statusCode === 200);
    } finally {
      Workspace.findById = origFindById;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 8: Database Persistence & Activity History Auditing
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Test Section 8: Database Persistence & Activity History Auditing\n');
  {
    const origFindById = Workspace.findById;
    const origUserFindById = User.findById;

    let savedLogs = [];
    const testDoc = {
      ...mockWorkspace,
      members: [
        { user: editorId, role: 'editor', joinedAt: new Date() },
        { user: viewerId, role: 'viewer', joinedAt: new Date() }
      ],
      activityLogs: [],
      save: async function() {
        savedLogs = [...this.activityLogs];
        return this;
      }
    };

    Workspace.findById = function() {
      return {
        ...testDoc,
        populate: function() { return this; }
      };
    };

    User.findById = async function(id) {
      if (String(id) === String(editorId)) return { _id: editorId, name: 'David Chen' };
      return { _id: id, name: 'Collaborator' };
    };

    try {
      // 8.1 Role update records Member Role Updated activity log entry
      const reqRoleUpdate = {
        params: { id: String(workspaceId), memberId: String(editorId) },
        body: { role: 'admin' },
        user: { _id: ownerId, name: 'Rishika Shah' }
      };
      const resRoleUpdate = createMockRes();
      await updateWorkspaceMemberRole(reqRoleUpdate, resRoleUpdate);

      assertPass('Member role update returns HTTP 200', resRoleUpdate.statusCode === 200);
      assertPass('Response includes updated role and capabilities', resRoleUpdate.body?.member?.role === 'admin' && resRoleUpdate.body?.member?.permissions?.canManageSettings === true);
      assertPass('Activity log contains "Member Role Updated" event', savedLogs.some(log => log.title === 'Member Role Updated' && log.type === 'member'));

      // 8.2 Get Workspace Members returns populated permissions
      const reqGetMembers = {
        params: { id: String(workspaceId) },
        user: { _id: ownerId, name: 'Rishika Shah' }
      };
      const resGetMembers = createMockRes();
      await getWorkspaceMembers(reqGetMembers, resGetMembers);

      assertPass('getWorkspaceMembers returns HTTP 200', resGetMembers.statusCode === 200);
      assertPass('Owner is present in members list with isOwner=true', resGetMembers.body?.members?.some(m => m.isOwner === true && m.role === 'owner'));
      assertPass('All participants contain permissions capability object', resGetMembers.body?.members?.every(m => typeof m.permissions === 'object' && Array.isArray(m.permissionList)));
      assertPass('Response contains currentUserRole and roleDefinitions', resGetMembers.body?.currentUserRole === 'owner' && Boolean(resGetMembers.body?.roleDefinitions?.roles));

      // 8.3 Get Workspace Permissions endpoint returns capability matrix
      const reqGetPerms = {
        params: { id: String(workspaceId) },
        user: { _id: editorId, name: 'David Chen' }
      };
      const resGetPerms = createMockRes();
      await getWorkspacePermissions(reqGetPerms, resGetPerms);

      assertPass('getWorkspacePermissions returns HTTP 200', resGetPerms.statusCode === 200);
      assertPass('getWorkspacePermissions reflects updated admin role and capabilities', resGetPerms.body?.userRole === 'admin' && resGetPerms.body?.permissions?.canManageSettings === true);

      // 8.4 Viewer permissions query
      const reqViewerPerms = {
        params: { id: String(workspaceId) },
        user: { _id: viewerId, name: 'Sarah Lin' }
      };
      const resViewerPerms = createMockRes();
      await getWorkspacePermissions(reqViewerPerms, resViewerPerms);
      assertPass('getWorkspacePermissions reflects viewer role with read-only capabilities', resViewerPerms.body?.userRole === 'viewer' && resViewerPerms.body?.permissions?.canEditFiles === false);
    } finally {
      Workspace.findById = origFindById;
      User.findById = origUserFindById;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log(`🎉   ALL CODETRAIL PARTICIPANT PERMISSIONS TESTS COMPLETED: ${passedTests}/${totalTests} PASSED!`);
  console.log('     Section 1 (Display Permissions & Matrix):     ✔');
  console.log('     Section 2 (Role Assignment & Validation):     ✔');
  console.log('     Section 3 (Role Updates & Dynamic Sync):      ✔');
  console.log('     Section 4 (Permission Validation Rules):      ✔');
  console.log('     Section 5 (Unauthorized Role Guards):         ✔');
  console.log('     Section 6 (Access Denial for Operations):     ✔');
  console.log('     Section 7 (Authorized Operations):            ✔');
  console.log('     Section 8 (Persistence & Activity Logs):      ✔');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  return { totalTests, passedTests };
})();
