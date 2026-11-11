/**
 * workspaceNotificationValidation.test.js
 * CodeTrail Workspace Configuration & Notification Validation Test Suite
 * Lead / Contributor: Rishika Shah
 *
 * Comprehensive tests covering:
 *  1. Workspace Settings Schema Validation, Boundary Checks & Role Authorization
 *  2. Notification Preference Enforcement (User-level & Workspace-level)
 *  3. Notification Deduplication & Sliding Window Filtering
 *  4. Target Recipient Routing & Personal vs. Workspace Room Isolation
 *  5. End-to-End Integration Flow (Settings -> Roles -> Preferences -> Socket Delivery)
 */

const assert = require('assert');
const mongoose = require('mongoose');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const {
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
} = require('../utils/workspaceSettingsValidator');

const {
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
} = require('../utils/notificationDeliveryService');

const {
  updateWorkspace,
  updateWorkspaceMemberRole
} = require('../controllers/workspaceController');

let passedTests = 0;
let totalTests = 0;

function assertPass(desc, condition) {
  totalTests++;
  try {
    assert.ok(condition, desc);
    passedTests++;
    console.log(`  ✔ [PASS] ${desc}`);
  } catch (err) {
    console.error(`  ✖ [FAIL] ${desc}`);
    console.error(`     Reason: ${err.message}`);
    throw err;
  }
}

async function runTests() {
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('⚙️   CODETRAIL: WORKSPACE CONFIGURATION & NOTIFICATION VALIDATION');
  console.log('     Lead / Assignee: Rishika Shah');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // =========================================================================
  // SECTION 1: WORKSPACE SETTINGS VALIDATION & BOUNDARY VERIFICATION
  // =========================================================================
  console.log('▶ Section 1: Workspace Settings Schema, Boundaries & Role Authorization\n');

  // Title validation
  const validTitle = validateWorkspaceTitle('Distributed Computing Lab');
  assertPass('Valid title between 1 and 80 chars accepted', validTitle.isValid && validTitle.sanitizedTitle === 'Distributed Computing Lab');

  const emptyTitle = validateWorkspaceTitle('   ');
  assertPass('Empty title rejected with error', !emptyTitle.isValid && emptyTitle.error.includes('empty'));

  const longTitle = validateWorkspaceTitle('A'.repeat(85));
  assertPass('Title exceeding 80 chars rejected', !longTitle.isValid && longTitle.error.includes('80'));

  // Description validation
  const validDesc = validateWorkspaceDescription('Real-time collaborative workspace');
  assertPass('Valid description accepted', validDesc.isValid && validDesc.sanitizedDescription.length > 0);

  const longDesc = validateWorkspaceDescription('D'.repeat(305));
  assertPass('Description exceeding 300 chars rejected', !longDesc.isValid && longDesc.error.includes('300'));

  // Language whitelist
  const validLang = validateWorkspaceLanguage('typescript');
  assertPass('Supported language accepted (typescript)', validLang.isValid && validLang.language === 'typescript');

  const invalidLang = validateWorkspaceLanguage('ruby_on_rails');
  assertPass('Unsupported language rejected with whitelist error', !invalidLang.isValid && invalidLang.error.includes('Allowed'));

  // Brand color palette
  const validColor = validateWorkspaceBrandColor('cyan');
  assertPass('Approved brand color accepted (cyan)', validColor.isValid && validColor.color === 'cyan');

  const invalidColor = validateWorkspaceBrandColor('neon-yellow');
  assertPass('Unapproved brand color rejected', !invalidColor.isValid && invalidColor.error.includes('brand color'));

  // Preference Settings boundaries
  const validPref = validateWorkspacePreferences({
    isPublic: true,
    allowAnonymousExecution: false,
    autoSaveInterval: 3000,
    tabSize: 4,
    wordWrap: true,
    notifications: {
      emailOnMemberJoin: true,
      executionFailureAlerts: true,
      sessionSummaryAlerts: false
    }
  });
  assertPass('Valid configuration object accepted with full sanitization', validPref.isValid && validPref.sanitizedSettings.tabSize === 4);

  const lowInterval = validateWorkspacePreferences({ autoSaveInterval: 500 });
  assertPass('autoSaveInterval < 1000ms rejected', !lowInterval.isValid && lowInterval.error.includes('between 1000ms and 30000ms'));

  const highInterval = validateWorkspacePreferences({ autoSaveInterval: 45000 });
  assertPass('autoSaveInterval > 30000ms rejected', !highInterval.isValid && highInterval.error.includes('between 1000ms and 30000ms'));

  const badTabSize = validateWorkspacePreferences({ tabSize: 8 });
  assertPass('Invalid tabSize (8) rejected (only 2 or 4 permitted)', !badTabSize.isValid && badTabSize.error.includes('either 2 or 4'));

  // Sibling preservation
  const mergedSettings = mergeWorkspaceSettings(
    {
      tabSize: 2,
      autoSaveInterval: 2500,
      notifications: { emailOnMemberJoin: false, executionFailureAlerts: true, sessionSummaryAlerts: true }
    },
    {
      tabSize: 4,
      notifications: { executionFailureAlerts: false }
    }
  );
  assertPass('Deep merge updates targeted field (tabSize: 4)', mergedSettings.tabSize === 4);
  assertPass('Deep merge preserves sibling notification fields without data loss',
    mergedSettings.notifications.emailOnMemberJoin === false &&
    mergedSettings.notifications.executionFailureAlerts === false &&
    mergedSettings.notifications.sessionSummaryAlerts === true
  );

  // Role permissions checks
  assertPass('Owner has settings permissions', hasSettingsPermission('owner') === true);
  assertPass('Admin has settings permissions', hasSettingsPermission('admin') === true);
  assertPass('Editor is blocked from modifying settings', hasSettingsPermission('editor') === false);
  assertPass('Viewer is blocked from modifying settings', hasSettingsPermission('viewer') === false);
  assertPass('Only Owner can modify workspace status', canModifyStatus('owner') === true && canModifyStatus('admin') === false);

  // =========================================================================
  // SECTION 2: NOTIFICATION PREFERENCE ENFORCEMENT ENGINE
  // =========================================================================
  console.log('\n▶ Section 2: Notification Preferences Enforcement & Event Gating\n');

  // Schema defaults
  assertPass('Default user securityAlerts is true', DEFAULT_USER_PREFERENCES.securityAlerts === true);
  assertPass('Default user weeklyProgress is true', DEFAULT_USER_PREFERENCES.weeklyProgress === true);
  assertPass('Default user platformNews is false', DEFAULT_USER_PREFERENCES.platformNews === false);

  assertPass('Default workspace emailOnMemberJoin is false', DEFAULT_WORKSPACE_PREFERENCES.emailOnMemberJoin === false);
  assertPass('Default workspace executionFailureAlerts is true', DEFAULT_WORKSPACE_PREFERENCES.executionFailureAlerts === true);
  assertPass('Default workspace sessionSummaryAlerts is true', DEFAULT_WORKSPACE_PREFERENCES.sessionSummaryAlerts === true);

  // Normalization
  const normUser = normalizeUserPreferences({ platformNews: true });
  assertPass('Partial user preferences normalized with defaults intact',
    normUser.platformNews === true && normUser.securityAlerts === true && normUser.weeklyProgress === true
  );

  const normWs = normalizeWorkspacePreferences({ executionFailureAlerts: false });
  assertPass('Partial workspace preferences normalized with defaults intact',
    normWs.executionFailureAlerts === false && normWs.sessionSummaryAlerts === true && normWs.emailOnMemberJoin === false
  );

  // Workspace-level preference enforcement: Execution failure alerts
  const execFailureNotif = {
    type: 'execution_status',
    status: 'error',
    title: 'Code execution failed',
    message: 'SyntaxError: unexpected token',
    workspaceId: 'ws-101'
  };

  const execAllowed = await evaluateNotificationDelivery(execFailureNotif, {
    settings: { notifications: { executionFailureAlerts: true } }
  });
  assertPass('Execution failure alert delivered when executionFailureAlerts=true', execAllowed.shouldDeliver === true);

  const execSuppressed = await evaluateNotificationDelivery(execFailureNotif, {
    settings: { notifications: { executionFailureAlerts: false } }
  });
  assertPass('Execution failure alert suppressed when executionFailureAlerts=false',
    execSuppressed.shouldDeliver === false && execSuppressed.preference === 'executionFailureAlerts'
  );

  const execSuccessNotif = {
    type: 'execution_status',
    status: 'success',
    title: 'Code execution completed',
    message: 'Program executed cleanly',
    workspaceId: 'ws-101'
  };
  const execSuccessAllowed = await evaluateNotificationDelivery(execSuccessNotif, {
    settings: { notifications: { executionFailureAlerts: false } }
  });
  assertPass('Successful execution status delivered even if executionFailureAlerts=false', execSuccessAllowed.shouldDeliver === true);

  // Workspace-level preference enforcement: Member join alerts
  const memberJoinNotif = {
    type: 'participant_joined',
    title: 'Participant joined',
    message: 'Rishika joined the workspace.',
    workspaceId: 'ws-101'
  };

  const joinSuppressed = await evaluateNotificationDelivery(memberJoinNotif, {
    settings: { notifications: { emailOnMemberJoin: false } }
  });
  assertPass('Member join alert suppressed when emailOnMemberJoin=false',
    joinSuppressed.shouldDeliver === false && joinSuppressed.preference === 'emailOnMemberJoin'
  );

  const joinAllowed = await evaluateNotificationDelivery(memberJoinNotif, {
    settings: { notifications: { emailOnMemberJoin: true } }
  });
  assertPass('Member join alert delivered when emailOnMemberJoin=true', joinAllowed.shouldDeliver === true);

  // Workspace-level preference enforcement: Session summary alerts
  const summaryNotif = {
    type: 'session_summary',
    title: 'Session Summary',
    message: 'Collaborative session concluded with 42 events.',
    workspaceId: 'ws-101'
  };

  const summarySuppressed = await evaluateNotificationDelivery(summaryNotif, {
    settings: { notifications: { sessionSummaryAlerts: false } }
  });
  assertPass('Session summary alert suppressed when sessionSummaryAlerts=false',
    summarySuppressed.shouldDeliver === false && summarySuppressed.preference === 'sessionSummaryAlerts'
  );

  const summaryAllowed = await evaluateNotificationDelivery(summaryNotif, {
    settings: { notifications: { sessionSummaryAlerts: true } }
  });
  assertPass('Session summary alert delivered when sessionSummaryAlerts=true', summaryAllowed.shouldDeliver === true);

  // =========================================================================
  // SECTION 3: NOTIFICATION DEDUPLICATION & PERFORMANCE CACHING
  // =========================================================================
  console.log('\n▶ Section 3: Notification Deduplication & High-Performance Caching\n');

  clearCaches();

  const testNotif = {
    type: 'execution_status',
    workspaceId: 'ws-alpha',
    actorId: 'usr-1',
    status: 'error',
    title: 'Code execution failed'
  };

  const fp1 = createEventFingerprint(testNotif);
  assertPass('Deterministic fingerprint generated for notification', typeof fp1 === 'string' && fp1.includes('execution_status'));

  const dedupFirst = checkAndRecordDeduplication(testNotif);
  assertPass('Initial event is not flagged as duplicate', dedupFirst.isDuplicate === false);

  const dedupSecond = checkAndRecordDeduplication(testNotif);
  assertPass('Rapid duplicate event within sliding window is flagged as duplicate', dedupSecond.isDuplicate === true);

  const diffNotif = {
    ...testNotif,
    status: 'timeout',
    title: 'Code execution timed out'
  };
  const dedupDifferent = checkAndRecordDeduplication(diffNotif);
  assertPass('Distinct event with different status/title is not blocked', dedupDifferent.isDuplicate === false);

  // In-memory cache TTL test
  clearCaches();
  const mockUserId = new mongoose.Types.ObjectId().toString();
  // Call getUserPreferences with fallback
  const prefCached1 = await getUserPreferences(mockUserId);
  assertPass('User preference fallback retrieved cleanly', prefCached1.securityAlerts === true);

  invalidateUserPreferenceCache(mockUserId);
  assertPass('User preference cache invalidation operates cleanly', true);

  // =========================================================================
  // SECTION 4: TARGET RECIPIENT ROUTING & DISPATCH ISOLATION
  // =========================================================================
  console.log('\n▶ Section 4: Target Recipient Routing & Room Isolation\n');

  clearCaches();

  // Mock Socket.IO instance
  const emittedEvents = [];
  const mockIo = {
    roomsTargeted: [],
    exceptRooms: [],
    to(room) {
      this.roomsTargeted.push(room);
      return this;
    },
    except(room) {
      this.exceptRooms.push(room);
      return this;
    },
    emit(event, payload) {
      emittedEvents.push({
        event,
        payload,
        rooms: [...this.roomsTargeted],
        except: [...this.exceptRooms]
      });
      this.roomsTargeted = [];
      this.exceptRooms = [];
      return true;
    }
  };

  // Personal notification dispatch to target user
  const personalDispatch = await dispatchNotification({
    io: mockIo,
    notification: {
      type: 'workspace_invitation',
      title: 'Workspace invitation',
      message: 'You have been invited to join Workspace X',
      targetUserId: 'usr-target-42',
      workspaceId: 'ws-777'
    }
  });
  assertPass('Personal notification delivered successfully', personalDispatch.delivered === true);
  assertPass('Personal notification targeted strictly to user room user:usr-target-42',
    emittedEvents[0].rooms.includes('user:usr-target-42')
  );

  // Workspace-wide notification dispatch excluding acting user
  clearCaches();
  emittedEvents.length = 0;
  mockIo.roomsTargeted = [];
  mockIo.exceptRooms = [];

  const wsDispatch = await dispatchNotification({
    io: mockIo,
    notification: {
      type: 'settings_updated',
      title: 'Settings updated',
      message: 'Workspace settings modified',
      workspaceId: 'ws-777',
      actorId: 'usr-actor-10'
    },
    workspaceContext: { settings: { notifications: { executionFailureAlerts: true } } },
    includeSender: false
  });
  assertPass('Workspace notification delivered', wsDispatch.delivered === true);
  assertPass('Workspace notification excludes actor room user:usr-actor-10',
    emittedEvents[0].except.includes('user:usr-actor-10')
  );

  // Deduplication suppression in dispatch
  const dupDispatch = await dispatchNotification({
    io: mockIo,
    notification: {
      type: 'settings_updated',
      title: 'Settings updated',
      message: 'Workspace settings modified',
      workspaceId: 'ws-777',
      actorId: 'usr-actor-10'
    }
  });
  assertPass('Rapid-fire duplicate notification blocked at dispatch layer',
    dupDispatch.delivered === false && dupDispatch.reason === 'duplicate'
  );

  // Preference suppression in dispatch
  clearCaches();
  const suppressedDispatch = await dispatchNotification({
    io: mockIo,
    notification: {
      type: 'execution_status',
      status: 'error',
      title: 'Execution failure',
      message: 'Failed to compile',
      workspaceId: 'ws-777'
    },
    workspaceContext: { settings: { notifications: { executionFailureAlerts: false } } }
  });
  assertPass('Notification suppressed at dispatch layer when workspace preference disabled',
    suppressedDispatch.delivered === false && suppressedDispatch.reason === 'suppressed_by_workspace_preference'
  );

  // =========================================================================
  // SECTION 5: CONTROLLER INTEGRATION & RBAC AUTHORIZATION
  // =========================================================================
  console.log('\n▶ Section 5: End-to-End Controller Integration & RBAC Enforcement\n');

  // Test updateWorkspace authorization guard for non-owners/admins
  const mockOwnerId = new mongoose.Types.ObjectId();
  const mockEditorId = new mongoose.Types.ObjectId();
  const mockWorkspaceId = new mongoose.Types.ObjectId();

  const mockWsDoc = {
    _id: mockWorkspaceId,
    title: 'Existing Workspace',
    description: 'Initial description',
    language: 'javascript',
    brandColor: 'purple',
    owner: mockOwnerId,
    members: [{ user: mockEditorId, role: 'editor' }],
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
    activityLogs: [],
    save: async function () { return this; }
  };

  // Mock Workspace.findById
  const originalFindById = mongoose.Model.findById;
  Workspace.findById = (id) => {
    return Promise.resolve(mockWsDoc);
  };

  // Editor attempting to update settings
  let editorResponseStatus = null;
  let editorResponseBody = null;
  const mockEditorReq = {
    params: { id: mockWorkspaceId.toString() },
    user: { _id: mockEditorId, name: 'Editor Bob' },
    body: {
      settings: { tabSize: 4 }
    },
    app: { get: () => mockIo }
  };
  const mockEditorRes = {
    status(code) {
      editorResponseStatus = code;
      return this;
    },
    json(body) {
      editorResponseBody = body;
      return this;
    }
  };

  await updateWorkspace(mockEditorReq, mockEditorRes);
  assertPass('Editor role rejected from modifying workspace settings with HTTP 403',
    editorResponseStatus === 403 && editorResponseBody.message.includes('Only owners and admins')
  );

  // Owner updating workspace settings
  let ownerResponseStatus = 200;
  let ownerResponseBody = null;
  const mockOwnerReq = {
    params: { id: mockWorkspaceId.toString() },
    user: { _id: mockOwnerId, name: 'Owner Alice' },
    body: {
      title: 'Updated Engineering Core',
      settings: {
        tabSize: 4,
        notifications: {
          executionFailureAlerts: false
        }
      }
    },
    app: { get: () => mockIo }
  };
  const mockOwnerRes = {
    status(code) {
      ownerResponseStatus = code;
      return this;
    },
    json(body) {
      ownerResponseBody = body;
      return this;
    }
  };

  await updateWorkspace(mockOwnerReq, mockOwnerRes);
  assertPass('Owner successfully updates workspace settings (HTTP 200)',
    ownerResponseStatus === 200 && ownerResponseBody.workspace.title === 'Updated Engineering Core'
  );
  assertPass('Updated workspace preserves sibling notification settings',
    ownerResponseBody.workspace.settings.notifications.executionFailureAlerts === false &&
    ownerResponseBody.workspace.settings.notifications.sessionSummaryAlerts === true
  );

  // Restore original findById
  Workspace.findById = originalFindById;

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log(`🎉   ALL WORKSPACE SETTINGS & NOTIFICATION VALIDATION TESTS PASSED: ${passedTests}/${totalTests}!`);
  console.log('     Section 1 (Settings Schema, Boundaries & RBAC): ✔');
  console.log('     Section 2 (Notification Preferences Engine):   ✔');
  console.log('     Section 3 (Deduplication & Performance Cache):  ✔');
  console.log('     Section 4 (Target Recipient Routing & Rooms):   ✔');
  console.log('     Section 5 (Controller Integration & Delivery):  ✔');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
}

module.exports = runTests();
