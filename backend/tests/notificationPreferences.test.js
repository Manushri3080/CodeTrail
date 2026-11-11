/**
 * notificationPreferences.test.js
 * CodeTrail Task 4: Notification Preferences Automated Test Suite
 * Developer: Meet Sheth
 *
 * Covers:
 *   1. Default preferences (Mongoose schema + legacy users without notificationPreferences)
 *   2. Enabling securityAlerts
 *   3. Disabling securityAlerts (+ persisted GET verification)
 *   4. Enabling weeklyProgress
 *   5. Disabling platformNews
 *   6. Partial preference updates
 *   7. Preservation of existing preferences & unrelated user fields during partial updates
 *   8. Unknown keys rejected (HTTP 400)
 *   9. String values rejected (HTTP 400)
 *  10. Numeric values rejected (HTTP 400)
 *  11. Null values rejected (HTTP 400)
 *  12. Empty update rejected (HTTP 400)
 *  13. Missing & invalid authentication rejected (HTTP 401)
 *  14. Cross-user modification prevented (HTTP 400 on body userId + strict User A/B isolation)
 *  15. Database failure, offline DB, and missing user error handling (HTTP 500 / 503 / 404)
 */

const assert = require('assert');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

mongoose.set('bufferCommands', false);

const User = require('../models/User');
const notificationPreferencesRoutes = require('../routes/notificationPreferencesRoutes');
const {
  getNotificationPreferences,
  updateNotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES
} = require('../controllers/notificationPreferencesController');

const JWT_SECRET = process.env.JWT_SECRET || 'codetrail_secret_default_key_99';

module.exports = (async () => {
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('🔔   CODETRAIL TASK 4: NOTIFICATION PREFERENCES TEST SUITE');
  console.log('     Developer: Meet Sheth');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  let totalTests = 0;
  let passedTests = 0;

  function assertPass(label, condition, details = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✔ [PASS] ${label}${details ? ` (${details})` : ''}`);
    } else {
      console.error(`  ❌ [FAIL] ${label}${details ? ` (${details})` : ''}`);
      assert.fail(`Test Assertion Failed: ${label}`);
    }
  }

  // Helper: issue signed JWT token matching backend/middleware/auth.js
  const signTokenForUser = (userId) => jwt.sign({ id: String(userId) }, JWT_SECRET, { expiresIn: '1h' });

  // Helper: mock Express res object for direct controller checks
  const createMockRes = () => ({
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
  });

  // Helper: invoke real Express router (route matching + authMiddleware + controller) in-process
  const dispatchRoute = (method, path, { token = null, body = undefined } = {}) => new Promise((resolve, reject) => {
    const headers = {};
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }

    const req = {
      method,
      url: path.replace(/^\/api\/notifications/, ''),
      originalUrl: path,
      headers,
      header(name) {
        return this.headers[name.toLowerCase()];
      },
      body: body !== undefined ? body : {}
    };

    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        resolve({ status: this.statusCode, body: data });
        return this;
      }
    };

    notificationPreferencesRoutes(req, res, (err) => {
      if (err) return reject(err);
      resolve({ status: 404, body: { message: 'Route not matched' } });
    });
  });

  // 1. Mongoose Schema Default Verification (non-DB model instantiation)
  console.log('▶ Section 1: Schema Defaults & Legacy User Fallback\n');
  {
    const schemaUser = new User({
      name: 'Schema Default User',
      email: 'schema.default@codetrail.dev'
    });
    assertPass(
      'Mongoose User schema applies default securityAlerts=true',
      schemaUser.notificationPreferences?.securityAlerts === true
    );
    assertPass(
      'Mongoose User schema applies default weeklyProgress=true',
      schemaUser.notificationPreferences?.weeklyProgress === true
    );
    assertPass(
      'Mongoose User schema applies default platformNews=false',
      schemaUser.notificationPreferences?.platformNews === false
    );
  }

  // In-memory store simulating MongoDB Users collection safely without touching Atlas/local DB
  const userAId = new mongoose.Types.ObjectId();
  const userBId = new mongoose.Types.ObjectId();

  const mockStore = new Map();
  const resetStore = () => {
    mockStore.clear();
    // Legacy user A with NO notificationPreferences stored yet
    mockStore.set(String(userAId), {
      _id: userAId,
      name: 'Meet Sheth',
      email: 'meet@codetrail.dev',
      role: 'CodeTrail Learner',
      bio: 'Original user bio'
    });
    // User B with initialized preferences
    mockStore.set(String(userBId), {
      _id: userBId,
      name: 'Collaborator User',
      email: 'collab@codetrail.dev',
      role: 'CodeTrail Learner',
      notificationPreferences: {
        securityAlerts: true,
        weeklyProgress: true,
        platformNews: false
      }
    });
  };
  resetStore();

  let forceUpdateDbError = false;
  let updateCallCount = 0;

  const origFindById = User.findById;
  const origFindByIdAndUpdate = User.findByIdAndUpdate;

  // Stub User Mongoose queries cleanly with .select() support
  User.findById = (id) => ({
    select(fields) {
      const record = mockStore.get(String(id));
      if (!record) return Promise.resolve(null);
      const clone = JSON.parse(JSON.stringify(record));
      clone._id = record._id;
      if (fields === '-password') {
        delete clone.password;
      }
      return Promise.resolve(clone);
    }
  });

  User.findByIdAndUpdate = (id, update) => ({
    select() {
      updateCallCount++;
      if (forceUpdateDbError) {
        return Promise.reject(new Error('Simulated MongoDB write failure'));
      }
      const record = mockStore.get(String(id));
      if (!record) return Promise.resolve(null);
      if (update && update.$set) {
        if (!record.notificationPreferences) {
          record.notificationPreferences = {};
        }
        for (const [pathKey, val] of Object.entries(update.$set)) {
          if (pathKey.startsWith('notificationPreferences.')) {
            const prop = pathKey.split('.')[1];
            record.notificationPreferences[prop] = val;
          }
        }
      }
      const clone = JSON.parse(JSON.stringify(record));
      clone._id = record._id;
      return Promise.resolve(clone);
    }
  });

  const tokenA = signTokenForUser(userAId);
  const tokenB = signTokenForUser(userBId);

  try {
    // Test 1: Default preferences on legacy User A (missing notificationPreferences in DB)
    const getDefaultRes = await dispatchRoute('GET', '/api/notifications/preferences', { token: tokenA });
    assertPass(
      '1. GET returns HTTP 200 with defaults for user without saved preferences',
      getDefaultRes.status === 200 &&
      getDefaultRes.body?.preferences?.securityAlerts === DEFAULT_NOTIFICATION_PREFERENCES.securityAlerts &&
      getDefaultRes.body?.preferences?.weeklyProgress === DEFAULT_NOTIFICATION_PREFERENCES.weeklyProgress &&
      getDefaultRes.body?.preferences?.platformNews === DEFAULT_NOTIFICATION_PREFERENCES.platformNews
    );

    console.log('\n▶ Section 2: Toggling, Saving, Retrieving & Partial Updates\n');

    // Test 3: Disabling securityAlerts
    const disableSecRes = await dispatchRoute('PATCH', '/api/notifications/preferences', {
      token: tokenA,
      body: { securityAlerts: false }
    });
    assertPass(
      '3. Disabling securityAlerts returns HTTP 200 with securityAlerts=false',
      disableSecRes.status === 200 && disableSecRes.body?.preferences?.securityAlerts === false
    );

    // Retrieve saved preferences to confirm persistence
    const verifyDisableSec = await dispatchRoute('GET', '/api/notifications/preferences', { token: tokenA });
    assertPass(
      '3b. Subsequent GET retrieves persisted securityAlerts=false',
      verifyDisableSec.status === 200 &&
      verifyDisableSec.body?.preferences?.securityAlerts === false &&
      verifyDisableSec.body?.preferences?.weeklyProgress === true &&
      verifyDisableSec.body?.preferences?.platformNews === false
    );

    // Test 2: Enabling securityAlerts
    const enableSecRes = await dispatchRoute('PATCH', '/api/notifications/preferences', {
      token: tokenA,
      body: { securityAlerts: true }
    });
    assertPass(
      '2. Enabling securityAlerts returns HTTP 200 with securityAlerts=true',
      enableSecRes.status === 200 && enableSecRes.body?.preferences?.securityAlerts === true
    );

    // Test 4: Enabling weeklyProgress (after disabling it first)
    await dispatchRoute('PATCH', '/api/notifications/preferences', {
      token: tokenA,
      body: { weeklyProgress: false }
    });
    const enableWeeklyRes = await dispatchRoute('PATCH', '/api/notifications/preferences', {
      token: tokenA,
      body: { weeklyProgress: true }
    });
    assertPass(
      '4. Enabling weeklyProgress returns HTTP 200 with weeklyProgress=true',
      enableWeeklyRes.status === 200 && enableWeeklyRes.body?.preferences?.weeklyProgress === true
    );

    // Test 5: Disabling platformNews (after enabling it first)
    await dispatchRoute('PATCH', '/api/notifications/preferences', {
      token: tokenA,
      body: { platformNews: true }
    });
    const disableNewsRes = await dispatchRoute('PATCH', '/api/notifications/preferences', {
      token: tokenA,
      body: { platformNews: false }
    });
    assertPass(
      '5. Disabling platformNews returns HTTP 200 with platformNews=false',
      disableNewsRes.status === 200 && disableNewsRes.body?.preferences?.platformNews === false
    );

    // Test 6 & 7: Partial update preserves existing preferences and unrelated user fields
    await dispatchRoute('PATCH', '/api/notifications/preferences', {
      token: tokenA,
      body: { securityAlerts: false, weeklyProgress: false }
    });
    const partialNewsRes = await dispatchRoute('PATCH', '/api/notifications/preferences', {
      token: tokenA,
      body: { platformNews: true }
    });
    const persistedUserA = mockStore.get(String(userAId));
    assertPass(
      '6. Partial update updates only platformNews=true cleanly',
      partialNewsRes.status === 200 && partialNewsRes.body?.preferences?.platformNews === true
    );
    assertPass(
      '7. Existing preferences (securityAlerts=false, weeklyProgress=false) and user metadata preserved on partial update',
      partialNewsRes.body?.preferences?.securityAlerts === false &&
      partialNewsRes.body?.preferences?.weeklyProgress === false &&
      persistedUserA.name === 'Meet Sheth' &&
      persistedUserA.bio === 'Original user bio' &&
      persistedUserA.role === 'CodeTrail Learner'
    );

    console.log('\n▶ Section 3: Input Validation & Mass-Assignment Protection\n');

    const countBeforeInvalid = updateCallCount;

    // Test 8: Unknown keys rejected
    const unknownKeyRes = await dispatchRoute('PATCH', '/api/notifications/preferences', {
      token: tokenA,
      body: { unknownKey: true }
    });
    assertPass('8a. Unknown preference key rejected with HTTP 400', unknownKeyRes.status === 400);

    const mixedUnknownRes = await dispatchRoute('PATCH', '/api/notifications/preferences', {
      token: tokenA,
      body: { securityAlerts: true, role: 'admin' }
    });
    assertPass('8b. Mass-assignment field ("role") rejected with HTTP 400', mixedUnknownRes.status === 400);

    // Test 9: String values rejected
    const stringTrueRes = await dispatchRoute('PATCH', '/api/notifications/preferences', {
      token: tokenA,
      body: { securityAlerts: 'true' }
    });
    const stringFalseRes = await dispatchRoute('PATCH', '/api/notifications/preferences', {
      token: tokenA,
      body: { weeklyProgress: 'false' }
    });
    assertPass(
      '9. String boolean values ("true" / "false") rejected with HTTP 400',
      stringTrueRes.status === 400 && stringFalseRes.status === 400
    );

    // Test 10: Numeric values rejected
    const numOneRes = await dispatchRoute('PATCH', '/api/notifications/preferences', {
      token: tokenA,
      body: { securityAlerts: 1 }
    });
    const numZeroRes = await dispatchRoute('PATCH', '/api/notifications/preferences', {
      token: tokenA,
      body: { weeklyProgress: 0 }
    });
    assertPass(
      '10. Numeric values (1 / 0) rejected with HTTP 400',
      numOneRes.status === 400 && numZeroRes.status === 400
    );

    // Test 11: Null values rejected
    const nullValRes = await dispatchRoute('PATCH', '/api/notifications/preferences', {
      token: tokenA,
      body: { platformNews: null }
    });
    assertPass('11. Null preference value rejected with HTTP 400', nullValRes.status === 400);

    // Test 12: Empty update rejected
    const emptyBodyRes = await dispatchRoute('PATCH', '/api/notifications/preferences', {
      token: tokenA,
      body: {}
    });
    assertPass('12. Empty update object {} rejected with HTTP 400', emptyBodyRes.status === 400);

    assertPass(
      'No database updates executed for rejected validation payloads',
      updateCallCount === countBeforeInvalid
    );

    console.log('\n▶ Section 4: Authentication, Authorization & Error Handling\n');

    // Test 13: Missing & invalid authentication rejected
    const unauthGetRes = await dispatchRoute('GET', '/api/notifications/preferences');
    const unauthPatchRes = await dispatchRoute('PATCH', '/api/notifications/preferences', {
      body: { securityAlerts: false }
    });
    const badTokenRes = await dispatchRoute('GET', '/api/notifications/preferences', {
      token: 'invalid.jwt.token'
    });
    const mockNoUserRes = createMockRes();
    await getNotificationPreferences({}, mockNoUserRes);
    assertPass(
      '13. Missing/invalid authentication rejected with HTTP 401',
      unauthGetRes.status === 401 &&
      unauthPatchRes.status === 401 &&
      badTokenRes.status === 401 &&
      mockNoUserRes.statusCode === 401
    );

    // Test 14: Cross-user modification prevented
    const userABefore = JSON.parse(JSON.stringify(mockStore.get(String(userAId)).notificationPreferences));
    const spoofBodyRes = await dispatchRoute('PATCH', '/api/notifications/preferences', {
      token: tokenB,
      body: { userId: String(userAId), securityAlerts: false }
    });
    const validUserBRes = await dispatchRoute('PATCH', '/api/notifications/preferences', {
      token: tokenB,
      body: { weeklyProgress: false, platformNews: true }
    });
    const verifyUserAAfter = await dispatchRoute('GET', '/api/notifications/preferences', { token: tokenA });
    assertPass(
      '14. Cross-user modification prevented (body userId rejected 400; User B update never mutates User A)',
      spoofBodyRes.status === 400 &&
      validUserBRes.status === 200 &&
      validUserBRes.body?.preferences?.weeklyProgress === false &&
      verifyUserAAfter.body?.preferences?.securityAlerts === userABefore.securityAlerts &&
      verifyUserAAfter.body?.preferences?.weeklyProgress === userABefore.weeklyProgress &&
      verifyUserAAfter.body?.preferences?.platformNews === userABefore.platformNews
    );

    // Test 15: Database failure handling (PATCH via Express router + GET/offline/404 via controller)
    forceUpdateDbError = true;
    const dbErrPatchRes = await dispatchRoute('PATCH', '/api/notifications/preferences', {
      token: tokenA,
      body: { securityAlerts: true }
    });
    forceUpdateDbError = false;
    assertPass(
      '15a. PATCH handles database write failure safely with HTTP 500',
      dbErrPatchRes.status === 500 && Boolean(dbErrPatchRes.body?.message)
    );

    // Direct controller DB failure on GET
    User.findById = () => Promise.reject(new Error('Simulated MongoDB read failure'));
    const mockGetErrRes = createMockRes();
    await getNotificationPreferences({ user: { _id: userAId } }, mockGetErrRes);
    assertPass(
      '15b. GET handles database read failure safely with HTTP 500',
      mockGetErrRes.statusCode === 500 && Boolean(mockGetErrRes.body?.message)
    );

    // Offline DB flag + nonexistent user 404
    const mockOfflineRes = createMockRes();
    await updateNotificationPreferences({ user: { _id: userAId }, dbOffline: true, body: { securityAlerts: true } }, mockOfflineRes);
    User.findById = () => Promise.resolve(null);
    const mockNotFoundRes = createMockRes();
    await getNotificationPreferences({ user: { _id: new mongoose.Types.ObjectId() } }, mockNotFoundRes);
    assertPass(
      '15c. Handles offline DB (HTTP 503) and nonexistent user (HTTP 404)',
      mockOfflineRes.statusCode === 503 && mockNotFoundRes.statusCode === 404
    );
  } finally {
    User.findById = origFindById;
    User.findByIdAndUpdate = origFindByIdAndUpdate;
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log(`🎉   NOTIFICATION PREFERENCES TESTS COMPLETED: ${passedTests}/${totalTests} PASSED!`);
  console.log('     Section 1 (Schema & Legacy Defaults):        ✔');
  console.log('     Section 2 (Toggles, Persistence & Partial):  ✔');
  console.log('     Section 3 (Validation & Mass-Assignment):    ✔');
  console.log('     Section 4 (Auth, Cross-User & DB Errors):    ✔');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  return { totalTests, passedTests };
})();
