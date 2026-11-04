/**
 * runtimeFixes.test.js
 * Comprehensive unit and workflow test suite verifying the fixes for:
 *   - Issue 1: Update Workspace Member Role Error (safe member matching & 404 handling)
 *   - Issue 2: ActivityLog Invalid userRole Enum ('CodeTrail Learner' -> canonical 'editor')
 *   - Issue 3: Get Workspace Executions Error (safe auth check, 401 & 403 responses)
 *   - Issue 4: Workspace Member Removal Error (safe member matching, 404 handling, owner protection)
 *
 * Part E1 Workflow Testing
 */

const assert = require('assert');
const mongoose = require('mongoose');

// Disable command buffering so stubbed tests don't hang
mongoose.set('bufferCommands', false);

const Workspace = require('../models/Workspace');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const Execution = require('../models/Execution');
const { updateWorkspaceMemberRole, removeWorkspaceMember } = require('../controllers/workspaceController');
const { getWorkspaceExecutions, clearWorkspaceExecutions } = require('../controllers/executionController');

module.exports = (async () => {
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('🔧   CODETRAIL BACKEND RUNTIME BUG FIXES & WORKFLOW TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Helper to create mock response object
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

  const ownerId = new mongoose.Types.ObjectId();
  const member1Id = new mongoose.Types.ObjectId();
  const member2Id = new mongoose.Types.ObjectId();
  const outsiderId = new mongoose.Types.ObjectId();
  const workspaceId = new mongoose.Types.ObjectId();

  // Create mock workspace instance
  const mockWorkspace = {
    _id: workspaceId,
    title: 'CodeTrail Runtime Test Workspace',
    owner: ownerId,
    members: [
      { user: member1Id, role: 'editor', joinedAt: new Date() },
      { user: member2Id, role: 'viewer', joinedAt: new Date() }
    ],
    activityLogs: [],
    save: async function () { return this; }
  };

  // Stubs for isolated unit testing
  const origWorkspaceFindById = Workspace.findById;
  const origUserFindById = User.findById;
  const origExecutionFind = Execution.find;

  Workspace.findById = function (id) {
    if (String(id) === String(workspaceId)) {
      return {
        ...mockWorkspace,
        members: [
          { user: member1Id, role: 'editor', joinedAt: new Date() },
          { user: member2Id, role: 'viewer', joinedAt: new Date() }
        ],
        save: async function () { return this; }
      };
    }
    return null;
  };

  User.findById = function (id) {
    return Promise.resolve({
      _id: id,
      name: 'Test Contributor',
      email: 'contributor@codetrail.dev',
      role: 'CodeTrail Learner'
    });
  };

  Execution.find = function (query) {
    return {
      sort() {
        return {
          limit() {
            return {
              lean() {
                return Promise.resolve([
                  { _id: 'exec_01', workspace: query.workspace, language: 'javascript', status: 'success' }
                ]);
              }
            };
          }
        };
      }
    };
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Workflow 1: Role Update Scenarios (Issue 1)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('▶ Test Section 1: Member Role Update Workflows (Issue 1)\n');

  // 1. Owner updates a workspace member's role
  {
    const req = {
      params: { id: String(workspaceId), memberId: String(member1Id) },
      body: { role: 'admin' },
      user: { _id: ownerId, name: 'Owner User' }
    };
    const res = createMockRes();

    await updateWorkspaceMemberRole(req, res);
    assert.strictEqual(res.statusCode, 200, 'Owner updating member should return 200');
    assert.ok(res.body?.message?.includes('successfully'), 'Should confirm role updated');
    console.log('  ✔ [PASS] 1. Owner successfully updates a workspace member role to admin');
  }

  // 2. Owner attempts to update a nonexistent member
  {
    const nonExistentId = new mongoose.Types.ObjectId();
    const req = {
      params: { id: String(workspaceId), memberId: String(nonExistentId) },
      body: { role: 'admin' },
      user: { _id: ownerId, name: 'Owner User' }
    };
    const res = createMockRes();

    await updateWorkspaceMemberRole(req, res);
    assert.strictEqual(res.statusCode, 404, 'Nonexistent member must return 404');
    assert.strictEqual(res.body?.message, 'Member not found in workspace.');
    console.log('  ✔ [PASS] 2. Owner updating nonexistent member correctly returns HTTP 404');
  }

  // 3. Unauthorized user attempts a role update
  {
    const req = {
      params: { id: String(workspaceId), memberId: String(member1Id) },
      body: { role: 'admin' },
      user: { _id: outsiderId, name: 'Outsider User' }
    };
    const res = createMockRes();

    await updateWorkspaceMemberRole(req, res);
    assert.strictEqual(res.statusCode, 403, 'Unauthorized user must receive 403');
    console.log('  ✔ [PASS] 3. Unauthorized user attempting role update is rejected with HTTP 403');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Workflow 2: Member Removal Scenarios (Issue 4)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Test Section 2: Member Removal Workflows (Issue 4)\n');

  // 4. Owner removes a valid workspace member
  {
    const req = {
      params: { id: String(workspaceId), memberId: String(member1Id) },
      user: { _id: ownerId, name: 'Owner User' }
    };
    const res = createMockRes();

    await removeWorkspaceMember(req, res);
    assert.strictEqual(res.statusCode, 200, 'Owner removing member should return 200');
    console.log('  ✔ [PASS] 4. Owner successfully removes a valid workspace member');
  }

  // 5. Owner attempts to remove a nonexistent member
  {
    const nonExistentId = new mongoose.Types.ObjectId();
    const req = {
      params: { id: String(workspaceId), memberId: String(nonExistentId) },
      user: { _id: ownerId, name: 'Owner User' }
    };
    const res = createMockRes();

    await removeWorkspaceMember(req, res);
    assert.strictEqual(res.statusCode, 404, 'Nonexistent member removal must return 404');
    assert.strictEqual(res.body?.message, 'Member not found in workspace.');
    console.log('  ✔ [PASS] 5. Removing nonexistent member returns HTTP 404 with meaningful error');
  }

  // 6. Owner cannot remove themselves
  {
    const req = {
      params: { id: String(workspaceId), memberId: String(ownerId) },
      user: { _id: ownerId, name: 'Owner User' }
    };
    const res = createMockRes();

    await removeWorkspaceMember(req, res);
    assert.strictEqual(res.statusCode, 400, 'Owner removing themselves must return 400');
    assert.strictEqual(res.body?.message, 'The workspace owner cannot be removed.');
    console.log('  ✔ [PASS] 6. Workspace owner cannot be removed (HTTP 400 protected)');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Workflow 3: Workspace Executions & Auth (Issue 3)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Test Section 3: Workspace Execution History & Auth Handling (Issue 3)\n');

  // 7. Authenticated user retrieves workspace executions
  {
    const req = {
      params: { id: String(workspaceId) },
      user: { _id: ownerId, name: 'Owner User' }
    };
    const res = createMockRes();

    await getWorkspaceExecutions(req, res);
    assert.strictEqual(res.statusCode, 200, 'Authorized member gets 200');
    assert.ok(Array.isArray(res.body?.executions), 'Returns executions array');
    console.log('  ✔ [PASS] 7. Authenticated user retrieves execution history successfully (HTTP 200)');
  }

  // 8. Missing authentication handled correctly (req.user is undefined)
  {
    const req = {
      params: { id: String(workspaceId) }
      // req.user is intentionally undefined (e.g. unauthenticated request via optionalAuth)
    };
    const res = createMockRes();

    await getWorkspaceExecutions(req, res);
    assert.strictEqual(res.statusCode, 401, 'Missing authentication must return 401');
    assert.strictEqual(res.body?.message, 'Authentication required to view workspace executions.');
    console.log('  ✔ [PASS] 8. Missing authentication cleanly returns HTTP 401 instead of crashing with undefined._id');
  }

  // 9. Unauthorized workspace execution access rejected
  {
    const req = {
      params: { id: String(workspaceId) },
      user: { _id: outsiderId, name: 'Outsider User' }
    };
    const res = createMockRes();

    await getWorkspaceExecutions(req, res);
    assert.strictEqual(res.statusCode, 403, 'Unauthorized access must return 403');
    console.log('  ✔ [PASS] 9. Unauthorized workspace execution access correctly rejected with HTTP 403');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Workflow 4: ActivityLog userRole Canonical Normalization (Issue 2)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Test Section 4: ActivityLog userRole Canonical Normalization (Issue 2)\n');

  // 10. ActivityLog creation with 'CodeTrail Learner' display title normalizes to 'editor'
  {
    const logDoc = new ActivityLog({
      workspaceId: workspaceId,
      userId: member1Id,
      userRole: 'CodeTrail Learner', // The problematic display title
      action: 'code_edit',
      details: 'Proof-of-work test edit with learner role'
    });

    let validationError;
    try {
      await logDoc.validate(['userRole']);
    } catch (err) {
      validationError = err;
    }
    assert.strictEqual(validationError, undefined, 'Mongoose validation must pass without enum error');
    assert.strictEqual(logDoc.userRole, 'editor', 'Display role "CodeTrail Learner" must resolve to canonical "editor"');
    console.log('  ✔ [PASS] 10. "CodeTrail Learner" display role automatically resolves to canonical "editor"');
  }

  // 11. Legitimate canonical roles are preserved
  {
    const ownerLog = new ActivityLog({ workspaceId, userRole: 'owner', action: 'code_edit', details: 'Owner edit' });
    const adminLog = new ActivityLog({ workspaceId, userRole: 'admin', action: 'code_edit', details: 'Admin edit' });
    const viewerLog = new ActivityLog({ workspaceId, userRole: 'viewer', action: 'general', details: 'Viewer event' });

    assert.strictEqual(ownerLog.userRole, 'owner', 'Owner role must be preserved');
    assert.strictEqual(adminLog.userRole, 'admin', 'Admin role must be preserved');
    assert.strictEqual(viewerLog.userRole, 'viewer', 'Viewer role must be preserved');
    console.log('  ✔ [PASS] 11. Legitimate canonical roles (owner, admin, viewer) preserved without disruption');
  }

  // Restore stubs
  Workspace.findById = origWorkspaceFindById;
  User.findById = origUserFindById;
  Execution.find = origExecutionFind;

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('🎉   ALL BACKEND RUNTIME FIX & WORKFLOW TESTS PASSED WITH 100% SUCCESS!');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
})();
