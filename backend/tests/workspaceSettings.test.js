/**
 * workspaceSettings.test.js
 * CodeTrail Workspace Settings & Notifications Unit Test Suite
 * Author: Anistina Dsouza (Lead - Execution & QA / Workspace Settings Lead)
 *
 * Comprehensive automated test suite covering:
 *   - Section 1: Title & Description Input Boundaries & Sanitization
 *   - Section 2: Language & Brand Accent Whitelist Validation
 *   - Section 3: Workspace Preferences Configuration (autoSaveInterval, tabSize, notifications)
 *   - Section 4: Role-Based Access Control (RBAC) Permission Matrix Enforcement
 *   - Section 5: Deep Merging & Partial Preference State Preservation
 *   - Section 6: Controller Request Flow Simulation (200, 400, 403, 404 Status Contracts)
 *   - Section 7: Cryptographic Proof-of-Work Activity Log Integration
 */

const assert = require('assert');
const {
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
} = require('../utils/workspaceSettingsValidator');
const { computeActivityHash, GENESIS_HASH } = require('../utils/cryptoProof');

console.log('\n═══════════════════════════════════════════════════════════════════════════');
console.log('⚙️   CODETRAIL WORKSPACE SETTINGS & PREFERENCES TEST SUITE');
console.log('    Lead: Anistina Dsouza (Execution & QA / Workspace Settings Lead)');
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

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: Title & Description Input Boundaries & Sanitization
// ─────────────────────────────────────────────────────────────────────────────
console.log('▶ Test Section 1: Title & Description Input Boundaries & Sanitization\n');

{
  // 1.1 Valid title
  const valid = validateWorkspaceTitle('Distributed Consensus Engine');
  assertPass('Valid title accepted within bounds', valid.isValid && valid.sanitizedTitle === 'Distributed Consensus Engine');

  // 1.2 Title whitespace trimming
  const padded = validateWorkspaceTitle('   Real-Time Collaboration Workspace   ');
  assertPass('Padded title trimmed cleanly', padded.isValid && padded.sanitizedTitle === 'Real-Time Collaboration Workspace');

  // 1.3 Empty / whitespace-only title rejected
  const empty = validateWorkspaceTitle('     ');
  assertPass('Whitespace-only title strictly rejected', !empty.isValid && empty.error.includes('empty'));

  // 1.4 Null or undefined title rejected
  const nil = validateWorkspaceTitle(null);
  assertPass('Null title rejected', !nil.isValid && nil.error.includes('required'));

  // 1.5 Title exceeding 80 characters rejected
  const longTitle = 'A'.repeat(81);
  const tooLong = validateWorkspaceTitle(longTitle);
  assertPass('Title exceeding 80 chars rejected', !tooLong.isValid && tooLong.error.includes('80 characters'));

  // 1.6 Exactly 80 characters accepted
  const boundary80 = 'B'.repeat(80);
  const valid80 = validateWorkspaceTitle(boundary80);
  assertPass('Title of exactly 80 chars accepted', valid80.isValid && valid80.sanitizedTitle.length === 80);

  // 1.7 Description within 300 characters accepted
  const validDesc = validateWorkspaceDescription('High-performance sandbox workspace for multi-language execution.');
  assertPass('Valid description accepted', validDesc.isValid && validDesc.sanitizedDescription.length > 0);

  // 1.8 Description exceeding 300 characters rejected
  const longDesc = 'D'.repeat(301);
  const tooLongDesc = validateWorkspaceDescription(longDesc);
  assertPass('Description exceeding 300 chars rejected', !tooLongDesc.isValid && tooLongDesc.error.includes('300 characters'));

  // 1.9 Optional description handles undefined safely
  const optDesc = validateWorkspaceDescription(undefined);
  assertPass('Undefined description defaults safely', optDesc.isValid && optDesc.sanitizedDescription === '');
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: Programming Language & Brand Accent Whitelist Validation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 2: Language Runtime & Theme Accent Whitelist Validation\n');

{
  // 2.1 Verify 7 supported languages
  const supported = ['javascript', 'python', 'cpp', 'java', 'rust', 'go', 'typescript'];
  supported.forEach(lang => {
    const res = validateWorkspaceLanguage(lang);
    assertPass(`Supported language "${lang}" accepted`, res.isValid && res.language === lang);
  });

  // 2.2 Case insensitivity
  const upper = validateWorkspaceLanguage('PYTHON');
  assertPass('Language is case-normalized to lowercase', upper.isValid && upper.language === 'python');

  // 2.3 Unsupported language rejected
  const unsupported = validateWorkspaceLanguage('ruby');
  assertPass('Unsupported runtime "ruby" rejected', !unsupported.isValid && unsupported.error.includes('ruby'));

  // 2.4 Verify 6 brand colors
  const colors = ['purple', 'cyan', 'emerald', 'rose', 'amber', 'blue'];
  colors.forEach(col => {
    const res = validateWorkspaceBrandColor(col);
    assertPass(`Brand color "${col}" accepted`, res.isValid && res.color === col);
  });

  // 2.5 Invalid brand color rejected
  const invalidColor = validateWorkspaceBrandColor('neon-yellow');
  assertPass('Unapproved brand color rejected', !invalidColor.isValid && invalidColor.error.includes('neon-yellow'));

  // 2.6 Status transitions (active, archived)
  const activeStatus = validateWorkspaceStatus('active');
  const archivedStatus = validateWorkspaceStatus('archived');
  const invalidStatus = validateWorkspaceStatus('deleted');
  assertPass('Active status accepted', activeStatus.isValid && activeStatus.status === 'active');
  assertPass('Archived status accepted', archivedStatus.isValid && archivedStatus.status === 'archived');
  assertPass('Invalid status rejected', !invalidStatus.isValid && invalidStatus.error.includes('deleted'));
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: Workspace Preferences Configuration
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 3: Workspace Preferences Configuration (Auto-Save, Policies, Alerts)\n');

{
  // 3.1 Valid full preferences configuration
  const pref = validateWorkspacePreferences({
    isPublic: true,
    allowAnonymousExecution: true,
    autoSaveInterval: 2500,
    tabSize: 4,
    wordWrap: false,
    notifications: {
      emailOnMemberJoin: true,
      executionFailureAlerts: true,
      sessionSummaryAlerts: false
    }
  });

  assertPass('Complete preferences payload sanitized successfully', pref.isValid);
  assertPass('isPublic converted to boolean', pref.sanitizedSettings.isPublic === true);
  assertPass('allowAnonymousExecution parsed correctly', pref.sanitizedSettings.allowAnonymousExecution === true);
  assertPass('autoSaveInterval equals 2500ms', pref.sanitizedSettings.autoSaveInterval === 2500);
  assertPass('tabSize equals 4', pref.sanitizedSettings.tabSize === 4);
  assertPass('wordWrap equals false', pref.sanitizedSettings.wordWrap === false);
  assertPass('Notification alerts object structured properly', pref.sanitizedSettings.notifications.emailOnMemberJoin === true && pref.sanitizedSettings.notifications.sessionSummaryAlerts === false);

  // 3.2 Auto-save interval boundary checks (min 1000ms, max 30000ms)
  const tooLowInterval = validateWorkspacePreferences({ autoSaveInterval: 500 });
  assertPass('autoSaveInterval < 1000ms rejected', !tooLowInterval.isValid && tooLowInterval.error.includes('1000ms'));

  const tooHighInterval = validateWorkspacePreferences({ autoSaveInterval: 45000 });
  assertPass('autoSaveInterval > 30000ms rejected', !tooHighInterval.isValid && tooHighInterval.error.includes('30000ms'));

  const validMinInterval = validateWorkspacePreferences({ autoSaveInterval: 1000 });
  assertPass('autoSaveInterval min boundary (1000ms) accepted', validMinInterval.isValid && validMinInterval.sanitizedSettings.autoSaveInterval === 1000);

  const validMaxInterval = validateWorkspacePreferences({ autoSaveInterval: 30000 });
  assertPass('autoSaveInterval max boundary (30000ms) accepted', validMaxInterval.isValid && validMaxInterval.sanitizedSettings.autoSaveInterval === 30000);

  // 3.3 Tab size boundary checks (must be 2 or 4)
  const invalidTabSize = validateWorkspacePreferences({ tabSize: 8 });
  assertPass('tabSize not in [2, 4] rejected', !invalidTabSize.isValid && invalidTabSize.error.includes('tabSize'));

  // 3.4 Non-object preferences rejected
  const stringPref = validateWorkspacePreferences('invalid-preferences');
  assertPass('Non-object preferences rejected', !stringPref.isValid && stringPref.error.includes('valid configuration object'));
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 4: Role-Based Access Control (RBAC) Permission Matrix Enforcement
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 4: Role-Based Access Control (RBAC) Permission Enforcement\n');

{
  // 4.1 Settings modification privileges (Owner & Admin only)
  assertPass('Owner has settings modification permission', hasSettingsPermission('owner') === true);
  assertPass('Admin has settings modification permission', hasSettingsPermission('admin') === true);
  assertPass('Editor is blocked from settings modification', hasSettingsPermission('editor') === false);
  assertPass('Viewer is blocked from settings modification', hasSettingsPermission('viewer') === false);
  assertPass('Guest / non-member is blocked from settings modification', hasSettingsPermission(null) === false);

  // 4.2 Status change & archival privileges (Owner only)
  assertPass('Owner can change status / archive workspace', canModifyStatus('owner') === true);
  assertPass('Admin is blocked from changing workspace status', canModifyStatus('admin') === false);
  assertPass('Editor is blocked from changing workspace status', canModifyStatus('editor') === false);
  assertPass('Viewer is blocked from changing workspace status', canModifyStatus('viewer') === false);

  // 4.3 File editing privileges (Owner, Admin, Editor)
  assertPass('Owner can modify files', canModifyFiles('owner') === true);
  assertPass('Admin can modify files', canModifyFiles('admin') === true);
  assertPass('Editor can modify files', canModifyFiles('editor') === true);
  assertPass('Viewer is locked from modifying files', canModifyFiles('viewer') === false);
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 5: Deep Merging & Partial State Preservation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 5: Deep Merging & Partial State Preservation\n');

{
  const existingSettings = {
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
  };

  // 5.1 Partial update only changing autoSaveInterval
  const updated1 = mergeWorkspaceSettings(existingSettings, { autoSaveInterval: 5000 });
  assertPass('Partial update changes target field', updated1.autoSaveInterval === 5000);
  assertPass('Unchanged fields are preserved', updated1.isPublic === false && updated1.tabSize === 2);
  assertPass('Nested notifications preserved completely', updated1.notifications.executionFailureAlerts === true);

  // 5.2 Partial update modifying only one notification alert toggle
  const updated2 = mergeWorkspaceSettings(existingSettings, {
    notifications: { emailOnMemberJoin: true }
  });
  assertPass('Target notification updated', updated2.notifications.emailOnMemberJoin === true);
  assertPass('Sibling notifications preserved without data loss', updated2.notifications.executionFailureAlerts === true && updated2.notifications.sessionSummaryAlerts === true);
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 6: Controller Request Flow Simulation (Response Contracts)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 6: Controller Request Simulation (200, 400, 403, 404 Status Contracts)\n');

{
  const mockWorkspace = {
    _id: '64d8f1e2c9a7b3d1e2f3a4b5',
    title: 'CodeTrail Engine',
    description: 'Initial description',
    language: 'javascript',
    brandColor: 'purple',
    status: 'active',
    owner: 'user_owner_01',
    members: [
      { user: 'user_owner_01', role: 'owner' },
      { user: 'user_admin_02', role: 'admin' },
      { user: 'user_editor_03', role: 'editor' },
      { user: 'user_viewer_04', role: 'viewer' }
    ],
    settings: {
      isPublic: false,
      autoSaveInterval: 2500
    }
  };

  function simulateUpdateController({ userId, body, workspace = mockWorkspace }) {
    const { title, description, language, brandColor, icon, status, settings, files } = body;

    const member = workspace.members.find(m => m.user === userId);
    const role = member ? member.role : null;

    if (!role) {
      return { status: 403, message: 'You are not a member of this workspace.' };
    }

    const changingMetadata = title !== undefined || description !== undefined || language !== undefined || brandColor !== undefined || icon !== undefined || settings !== undefined;
    if (changingMetadata && !hasSettingsPermission(role)) {
      return { status: 403, message: 'Only owners and admins can change workspace settings.' };
    }
    if (files !== undefined && !canModifyFiles(role)) {
      return { status: 403, message: 'Viewers cannot modify workspace files.' };
    }
    if (status !== undefined && !canModifyStatus(role)) {
      return { status: 403, message: 'Only the workspace owner can change workspace status.' };
    }

    if (title !== undefined) {
      const tRes = validateWorkspaceTitle(title);
      if (!tRes.isValid) return { status: 400, message: tRes.error };
    }
    if (description !== undefined) {
      const dRes = validateWorkspaceDescription(description);
      if (!dRes.isValid) return { status: 400, message: dRes.error };
    }
    if (language !== undefined) {
      const lRes = validateWorkspaceLanguage(language);
      if (!lRes.isValid) return { status: 400, message: lRes.error };
    }
    if (brandColor !== undefined) {
      const cRes = validateWorkspaceBrandColor(brandColor);
      if (!cRes.isValid) return { status: 400, message: cRes.error };
    }
    if (settings !== undefined) {
      const sRes = validateWorkspacePreferences(settings);
      if (!sRes.isValid) return { status: 400, message: sRes.error };
    }

    return { status: 200, message: 'Workspace updated successfully' };
  }

  // 6.1 Owner updates title & preferences -> 200 OK
  const ownerReq = simulateUpdateController({
    userId: 'user_owner_01',
    body: { title: 'Updated Workspace Name', settings: { autoSaveInterval: 5000 } }
  });
  assertPass('Owner settings update returns 200 OK', ownerReq.status === 200);

  // 6.2 Admin updates language & theme -> 200 OK
  const adminReq = simulateUpdateController({
    userId: 'user_admin_02',
    body: { language: 'python', brandColor: 'cyan' }
  });
  assertPass('Admin metadata update returns 200 OK', adminReq.status === 200);

  // 6.3 Editor attempts to modify settings -> 403 Forbidden
  const editorReq = simulateUpdateController({
    userId: 'user_editor_03',
    body: { title: 'Unauthorized Modification' }
  });
  assertPass('Editor modification returns 403 Forbidden', editorReq.status === 403 && editorReq.message.includes('Only owners and admins'));

  // 6.4 Viewer attempts to modify settings -> 403 Forbidden
  const viewerReq = simulateUpdateController({
    userId: 'user_viewer_04',
    body: { settings: { isPublic: true } }
  });
  assertPass('Viewer modification returns 403 Forbidden', viewerReq.status === 403);

  // 6.5 Admin attempts to archive workspace -> 403 Forbidden (Owner only)
  const adminArchiveReq = simulateUpdateController({
    userId: 'user_admin_02',
    body: { status: 'archived' }
  });
  assertPass('Admin archiving workspace returns 403 Forbidden (Owner-only)', adminArchiveReq.status === 403 && adminArchiveReq.message.includes('Only the workspace owner'));

  // 6.6 Non-member attempts to update -> 403 Forbidden
  const strangerReq = simulateUpdateController({
    userId: 'user_stranger_99',
    body: { title: 'Intruder Change' }
  });
  assertPass('Non-member returns 403 Forbidden', strangerReq.status === 403 && strangerReq.message.includes('not a member'));

  // 6.7 Invalid input payload returns 400 Bad Request
  const badInputReq = simulateUpdateController({
    userId: 'user_owner_01',
    body: { title: '' }
  });
  assertPass('Empty title returns 400 Bad Request', badInputReq.status === 400);
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 7: Cryptographic Proof-of-Work Activity Log Integration
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 7: Cryptographic Proof-of-Work Settings Update Auditing\n');

{
  const mockWsId = '64d8f1e2c9a7b3d1e2f3a4b5';
  const timestamp = new Date();
  const sequenceNumber = 12;
  const previousHash = '6cff9d543210abcd6cff9d543210abcd6cff9d543210abcd6cff9d543210abcd';

  const hash = computeActivityHash({
    workspaceId: mockWsId,
    sequenceNumber,
    previousHash,
    timestamp,
    userId: 'user_owner_01',
    action: 'settings_update',
    fileId: null,
    linesAdded: 0,
    linesDeleted: 0,
    details: 'Updated workspace title to "Telemetry Hub" and autoSaveInterval to 5000ms.'
  });

  assertPass('SHA-256 hash generated for settings_update action', typeof hash === 'string' && hash.length === 64);

  // Tamper detection on settings activity payload
  const tamperedHash = computeActivityHash({
    workspaceId: mockWsId,
    sequenceNumber,
    previousHash,
    timestamp,
    userId: 'user_owner_01',
    action: 'settings_update',
    fileId: null,
    linesAdded: 0,
    linesDeleted: 0,
    details: 'TAMPERED: Altered settings record'
  });

  assertPass('Tampered settings audit payload changes cryptographic hash', hash !== tamperedHash);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════════════════════');
console.log(`🎉   ALL CODETRAIL WORKSPACE SETTINGS TESTS COMPLETED: ${passedTests}/${totalTests} PASSED!`);
console.log('     Section 1 (Title & Description Boundaries): ✔');
console.log('     Section 2 (Language & Brand Whitelists):    ✔');
console.log('     Section 3 (Workspace Preferences):         ✔');
console.log('     Section 4 (RBAC Permission Matrix):        ✔');
console.log('     Section 5 (Deep Merging & State Pres.):    ✔');
console.log('     Section 6 (Controller Request Simulation): ✔');
console.log('     Section 7 (Cryptographic PoW Auditing):    ✔');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

