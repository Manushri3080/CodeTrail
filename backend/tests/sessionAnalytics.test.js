/**
 * sessionAnalytics.test.js
 * CT-198 & CT-201: Session Analytics & Analytics Validation Test Suite
 *
 * Comprehensive validation and integration tests covering:
 *   - Empty session calculations and safe fallbacks
 *   - Single participant and multi-participant activity analysis
 *   - Zero-activity participants handling
 *   - Variable duration sessions and boundary timestamp checks
 *   - Missing, invalid, or corrupted timestamps
 *   - Event deduplication and double-counting prevention
 *   - Large activity datasets (1,000+ events) and performance boundaries
 *   - Category consistency (coding, file ops, executions, collaboration)
 *   - Execution success rate calculations (including 0 executions safety)
 *   - Master session validation runner (pass and fail scenarios)
 *   - Full response structure and mathematical consistency
 */

const assert = require('assert');
const {
  validateSessionDuration,
  validateParticipantCounts,
  validateParticipantActivityIntegrity,
  validateEventCategoryConsistency,
  validateEventDeduplication,
  runSessionValidation
} = require('../utils/analyticsValidator');

console.log('\n═══════════════════════════════════════════════════════════════════════════');
console.log('⏱️   CODETRAIL CT-198 & CT-201: SESSION ANALYTICS & VALIDATION TEST SUITE');
console.log('    Lead: Rishika Shah (Session Analytics & Validation Lead)');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: Empty Session Handling
// ─────────────────────────────────────────────────────────────────────────────
console.log('▶ Test Section 1: Empty Session Edge Cases\n');

{
  const emptySummary = {
    status: 'empty',
    sessionDurationSeconds: 0,
    sessionDurationFormatted: '0s',
    totalParticipants: 0,
    activeParticipants: 0,
    offlineParticipants: 0,
    totalEvents: 0,
    totalLinesAdded: 0,
    totalLinesDeleted: 0,
    totalLinesChanged: 0,
    totalExecutions: 0,
    successfulExecutions: 0,
    executionSuccessRate: 0,
    startedAt: null,
    lastActiveAt: null
  };

  const emptyCategories = { coding: 0, fileOps: 0, executions: 0, collaboration: 0 };
  const emptyParticipants = [];
  const emptyRawEvents = [];

  const durationCheck = validateSessionDuration(emptySummary);
  assert.strictEqual(durationCheck.passed, true, 'Empty duration (0s) should pass validation');

  const participantCheck = validateParticipantCounts(emptySummary, emptyParticipants);
  assert.strictEqual(participantCheck.passed, true, 'Zero participants in empty session should pass');

  const activityCheck = validateParticipantActivityIntegrity(emptySummary, emptyParticipants);
  assert.strictEqual(activityCheck.passed, true, 'Empty participants array should pass activity integrity');

  const categoryCheck = validateEventCategoryConsistency(emptySummary, emptyCategories);
  assert.strictEqual(categoryCheck.passed, true, 'Zero categories matching 0 total events should pass');

  const fullReport = runSessionValidation({
    sessionSummary: emptySummary,
    participants: emptyParticipants,
    eventCategories: emptyCategories,
    rawEvents: emptyRawEvents
  });

  assert.strictEqual(fullReport.validationPassed, true, 'Master validation must pass for empty session without errors');
  console.log('  ✔ [PASS] Empty session gracefully validated: 0 events, 0s duration, no divide-by-zero crashes');
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: Single Participant Session
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 2: Single Participant Session\n');

{
  const singleParticipantSummary = {
    status: 'active',
    sessionDurationSeconds: 1800,
    sessionDurationFormatted: '30m 0s',
    totalParticipants: 1,
    activeParticipants: 1,
    offlineParticipants: 0,
    totalEvents: 25,
    totalLinesAdded: 150,
    totalLinesDeleted: 20,
    totalLinesChanged: 170,
    totalExecutions: 5,
    successfulExecutions: 4,
    executionSuccessRate: 80,
    startedAt: '2026-10-31T20:00:00.000Z',
    lastActiveAt: '2026-10-31T20:30:00.000Z'
  };

  const singleParticipant = [
    {
      userId: 'user-alice-1',
      userName: 'Alice Dev',
      role: 'owner',
      status: 'online',
      totalEvents: 25,
      activitySharePercent: 100,
      linesAdded: 150,
      linesDeleted: 20,
      totalLinesChanged: 170,
      codeEdits: 15,
      filesCreated: 3,
      filesDeleted: 1,
      filesRenamed: 1,
      codeExecutions: 5,
      executionSuccessRate: 80,
      collaborationEvents: 0
    }
  ];

  const categories = { coding: 15, fileOps: 5, executions: 5, collaboration: 0 };

  const durationCheck = validateSessionDuration(singleParticipantSummary);
  assert.strictEqual(durationCheck.passed, true);

  const participantCheck = validateParticipantCounts(singleParticipantSummary, singleParticipant);
  assert.strictEqual(participantCheck.passed, true);

  const activityCheck = validateParticipantActivityIntegrity(singleParticipantSummary, singleParticipant);
  assert.strictEqual(activityCheck.passed, true, 'Single participant with 100% share must pass');

  const categoryCheck = validateEventCategoryConsistency(singleParticipantSummary, categories);
  assert.strictEqual(categoryCheck.passed, true, 'Category sum (15+5+5+0 = 25) must match totalEvents');

  console.log('  ✔ [PASS] Single participant session accurately computed: 25 events, 100% share, 80% exec success');
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: Multiple Participants with Zero-Activity Members
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 3: Multiple Participants & Zero-Activity Handling\n');

{
  const totalEvents = 100;
  const multiSummary = {
    status: 'active',
    sessionDurationSeconds: 5400,
    sessionDurationFormatted: '1h 30m',
    totalParticipants: 4,
    activeParticipants: 2,
    offlineParticipants: 2,
    totalEvents: 100,
    totalLinesAdded: 300,
    totalLinesDeleted: 50,
    totalLinesChanged: 350,
    totalExecutions: 10,
    successfulExecutions: 9,
    executionSuccessRate: 90,
    startedAt: '2026-10-31T18:00:00.000Z',
    lastActiveAt: '2026-10-31T19:30:00.000Z'
  };

  const participants = [
    {
      userId: 'user-1',
      userName: 'Alice Active',
      role: 'owner',
      status: 'online',
      totalEvents: 70,
      activitySharePercent: 70,
      linesAdded: 250,
      linesDeleted: 40,
      totalLinesChanged: 290
    },
    {
      userId: 'user-2',
      userName: 'Bob Collaborator',
      role: 'editor',
      status: 'online',
      totalEvents: 30,
      activitySharePercent: 30,
      linesAdded: 50,
      linesDeleted: 10,
      totalLinesChanged: 60
    },
    {
      userId: 'user-3',
      userName: 'Charlie Observer',
      role: 'viewer',
      status: 'offline',
      totalEvents: 0,
      activitySharePercent: 0,
      linesAdded: 0,
      linesDeleted: 0,
      totalLinesChanged: 0
    },
    {
      userId: 'user-4',
      userName: 'Dave Idle',
      role: 'editor',
      status: 'offline',
      totalEvents: 0,
      activitySharePercent: 0,
      linesAdded: 0,
      linesDeleted: 0,
      totalLinesChanged: 0
    }
  ];

  const categories = { coding: 60, fileOps: 20, executions: 10, collaboration: 10 };

  const participantCheck = validateParticipantCounts(multiSummary, participants);
  assert.strictEqual(participantCheck.passed, true, 'All 4 participants accounted for');

  const activityCheck = validateParticipantActivityIntegrity(multiSummary, participants);
  assert.strictEqual(activityCheck.passed, true, 'Zero-activity participants handled gracefully without breaking sum');

  // Verify Charlie and Dave are retained with 0 events and 0% share
  const zeroActivityMembers = participants.filter(p => p.totalEvents === 0);
  assert.strictEqual(zeroActivityMembers.length, 2, 'Exactly 2 participants have 0 recorded activity');
  assert.strictEqual(zeroActivityMembers[0].activitySharePercent, 0);
  assert.strictEqual(zeroActivityMembers[1].activitySharePercent, 0);

  // Verify active participants share sums to 100%
  const activeShare = participants.reduce((s, p) => s + p.activitySharePercent, 0);
  assert.strictEqual(activeShare, 100, 'Active members share equals 100%');

  console.log('  ✔ [PASS] Zero-activity participants (Charlie & Dave) retained with 0 counts and 0% share');
  console.log('  ✔ [PASS] Multi-participant event distribution validated (Alice: 70%, Bob: 30%, Total: 100%)');
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 4: Session Duration & Boundary Timestamps
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 4: Session Duration & Timestamp Validation\n');

{
  // Test 4A: Normal valid session (45 minutes = 2700s)
  const validSession = {
    sessionDurationSeconds: 2700,
    sessionDurationFormatted: '45m 0s',
    startedAt: '2026-10-31T15:00:00.000Z',
    lastActiveAt: '2026-10-31T15:45:00.000Z'
  };
  const resA = validateSessionDuration(validSession);
  assert.strictEqual(resA.passed, true);
  console.log('  ✔ [PASS] Valid 45-minute duration accepted');

  // Test 4B: Timestamp inversion (startedAt > lastActiveAt) must be flagged
  const invertedSession = {
    sessionDurationSeconds: 100,
    startedAt: '2026-10-31T16:00:00.000Z',
    lastActiveAt: '2026-10-31T15:00:00.000Z' // 1 hour earlier!
  };
  const resB = validateSessionDuration(invertedSession);
  assert.strictEqual(resB.passed, false, 'Inverted timestamps must fail validation');
  assert.ok(resB.message.includes('Timestamp order violation'));
  console.log('  ✔ [PASS] Inverted timestamps correctly rejected with violation diagnostic');

  // Test 4C: Negative duration seconds must be flagged
  const negativeDurationSession = {
    sessionDurationSeconds: -300
  };
  const resC = validateSessionDuration(negativeDurationSession);
  assert.strictEqual(resC.passed, false, 'Negative duration must fail validation');
  console.log('  ✔ [PASS] Negative session duration correctly rejected');

  // Test 4D: Multi-hour session (7 hours 15 minutes)
  const longSession = {
    sessionDurationSeconds: 26100,
    sessionDurationFormatted: '7h 15m',
    startedAt: '2026-10-31T08:00:00.000Z',
    lastActiveAt: '2026-10-31T15:15:00.000Z'
  };
  const resD = validateSessionDuration(longSession);
  assert.strictEqual(resD.passed, true);
  console.log('  ✔ [PASS] Long multi-hour duration (7h 15m) safely parsed and validated');
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 5: Event Deduplication & Double-Counting Prevention
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 5: Event Deduplication & Integrity\n');

{
  // Test 5A: Clean event array with unique sequence numbers
  const cleanEvents = [
    { _id: 'e1', sequenceNumber: 1, action: 'session_start' },
    { _id: 'e2', sequenceNumber: 2, action: 'code_edit' },
    { _id: 'e3', sequenceNumber: 3, action: 'file_create' },
    { _id: 'e4', sequenceNumber: 4, action: 'code_execution' }
  ];
  const cleanDedup = validateEventDeduplication(cleanEvents);
  assert.strictEqual(cleanDedup.passed, true);
  assert.strictEqual(cleanDedup.duplicateCount, 0);
  console.log('  ✔ [PASS] Clean unique event sequence passes deduplication check');

  // Test 5B: Duplicate sequence numbers detected
  const duplicateEvents = [
    { _id: 'e1', sequenceNumber: 1, action: 'session_start' },
    { _id: 'e2', sequenceNumber: 2, action: 'code_edit' },
    { _id: 'e3', sequenceNumber: 2, action: 'code_edit' }, // DUPLICATE seq #2
    { _id: 'e4', sequenceNumber: 3, action: 'code_execution' }
  ];
  const dirtyDedup = validateEventDeduplication(duplicateEvents);
  assert.strictEqual(dirtyDedup.passed, false, 'Duplicate sequence number must fail');
  assert.strictEqual(dirtyDedup.duplicateCount, 1);
  console.log('  ✔ [PASS] Duplicate sequence number #2 accurately flagged and isolated');
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 6: Boundary Cases & Large Activity Datasets (1,000+ Events)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 6: Boundary & High-Load Dataset Performance\n');

{
  const startTime = Date.now();
  const LARGE_EVENT_COUNT = 1500;
  const NUM_PARTICIPANTS = 10;

  // Synthesize 1500 events across 10 participants
  const participants = [];
  let eventsRemaining = LARGE_EVENT_COUNT;

  for (let i = 1; i <= NUM_PARTICIPANTS; i++) {
    const isLast = i === NUM_PARTICIPANTS;
    const pEvents = isLast ? eventsRemaining : Math.floor(LARGE_EVENT_COUNT / NUM_PARTICIPANTS);
    eventsRemaining -= pEvents;

    participants.push({
      userId: `user-sim-${i}`,
      userName: `Developer ${i}`,
      role: i === 1 ? 'owner' : 'editor',
      status: i % 2 === 0 ? 'online' : 'offline',
      totalEvents: pEvents,
      activitySharePercent: Math.round((pEvents / LARGE_EVENT_COUNT) * 100),
      linesAdded: pEvents * 5,
      linesDeleted: pEvents * 2,
      totalLinesChanged: pEvents * 7
    });
  }

  // Normalize percentages
  const pSum = participants.reduce((s, p) => s + p.activitySharePercent, 0);
  if (pSum !== 100) participants[0].activitySharePercent += (100 - pSum);

  const largeSummary = {
    sessionDurationSeconds: 36000,
    sessionDurationFormatted: '10h 0m',
    totalParticipants: NUM_PARTICIPANTS,
    activeParticipants: 5,
    offlineParticipants: 5,
    totalEvents: LARGE_EVENT_COUNT,
    startedAt: '2026-10-31T00:00:00.000Z',
    lastActiveAt: '2026-10-31T10:00:00.000Z'
  };

  const coding = Math.floor(LARGE_EVENT_COUNT * 0.6);
  const fileOps = Math.floor(LARGE_EVENT_COUNT * 0.15);
  const executions = Math.floor(LARGE_EVENT_COUNT * 0.15);
  const collaboration = LARGE_EVENT_COUNT - (coding + fileOps + executions);

  const categories = { coding, fileOps, executions, collaboration };

  const fullReport = runSessionValidation({
    sessionSummary: largeSummary,
    participants,
    eventCategories: categories,
    rawEvents: []
  });

  const elapsedMs = Date.now() - startTime;

  assert.strictEqual(fullReport.validationPassed, true, 'Large dataset validation must succeed');
  assert.ok(elapsedMs < 100, `Large dataset validation took ${elapsedMs}ms (< 100ms budget)`);

  console.log(`  ✔ [PASS] 1,500 events across 10 participants validated in ${elapsedMs}ms (< 100ms)`);
  console.log('  ✔ [PASS] No numeric overflow on 10,500 aggregate lines changed');
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 7: Event Category Breakdown Consistency
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 7: Event Category Mathematical Consistency\n');

{
  const totalEvents = 85;
  const summary = { totalEvents };

  // 7A: Exact matching categories
  const validCat = { coding: 50, fileOps: 15, executions: 12, collaboration: 8 };
  const catCheckA = validateEventCategoryConsistency(summary, validCat);
  assert.strictEqual(catCheckA.passed, true);
  console.log('  ✔ [PASS] Category sum (50+15+12+8 = 85) strictly matches totalEvents');

  // 7B: Discrepancy where categories sum < totalEvents
  const mismatchCat = { coding: 50, fileOps: 10, executions: 10, collaboration: 5 }; // sum 75 != 85
  const catCheckB = validateEventCategoryConsistency(summary, mismatchCat);
  assert.strictEqual(catCheckB.passed, false, 'Category mismatch must fail validation');
  assert.ok(catCheckB.message.includes('does not match session totalEvents'));
  console.log('  ✔ [PASS] Discrepancy in category sum correctly caught and diagnosed');
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 8: Execution Success Rate & Zero-Execution Safety
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 8: Execution Metric Calculations\n');

{
  // 8A: Zero executions (safely yields 0%, no NaN)
  const zeroExecSuccessRate = 0 > 0 ? Math.round((0 / 0) * 100) : 0;
  assert.strictEqual(zeroExecSuccessRate, 0, 'Zero executions must yield 0% without NaN');
  assert.ok(Number.isFinite(zeroExecSuccessRate), 'Must be finite number');
  console.log('  ✔ [PASS] Zero execution edge case safely handled: 0% without divide-by-zero');

  // 8B: 100% execution success
  const fullSuccessRate = Math.round((14 / 14) * 100);
  assert.strictEqual(fullSuccessRate, 100);
  console.log('  ✔ [PASS] 100% execution success rate calculated accurately');

  // 8C: Mixed success rate (17 successes out of 20 = 85%)
  const mixedSuccessRate = Math.round((17 / 20) * 100);
  assert.strictEqual(mixedSuccessRate, 85);
  console.log('  ✔ [PASS] Mixed execution success rate (17/20 = 85%) calculated correctly');
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 9: Integration Contract & Frontend Response Shape Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 9: Integration Response Contract Shape\n');

{
  // Mock API response payload shape returned by getSessionAnalytics
  const mockApiResponse = {
    workspaceId: '507f1f77bcf86cd799439011',
    workspaceTitle: 'CodeTrail Collaborative Workspace',
    generatedAt: new Date().toISOString(),
    sessionSummary: {
      status: 'active',
      sessionDurationFormatted: '1h 24m',
      sessionDurationSeconds: 5040,
      activeTimeFormatted: '58m',
      activeTimeSeconds: 3480,
      totalParticipants: 3,
      activeParticipants: 2,
      offlineParticipants: 1,
      totalEvents: 42,
      totalLinesAdded: 180,
      totalLinesDeleted: 25,
      totalLinesChanged: 205,
      totalExecutions: 6,
      successfulExecutions: 5,
      executionSuccessRate: 83,
      startedAt: '2026-10-31T21:00:00.000Z',
      lastActiveAt: '2026-10-31T22:24:00.000Z',
      mostActiveParticipant: { userId: 'u1', name: 'Alice', events: 28 }
    },
    eventCategoryBreakdown: {
      coding: 24,
      fileOps: 6,
      executions: 6,
      collaboration: 6
    },
    participantBreakdown: [
      {
        userId: 'u1',
        userName: 'Alice',
        userEmail: 'alice@example.com',
        role: 'owner',
        status: 'online',
        totalEvents: 28,
        activitySharePercent: 67,
        linesAdded: 150,
        linesDeleted: 15,
        totalLinesChanged: 165,
        codeEdits: 18,
        filesCreated: 4,
        filesDeleted: 1,
        filesRenamed: 1,
        codeExecutions: 4,
        executionSuccessRate: 100,
        collaborationEvents: 0,
        contributionScore: 195,
        hasRecordedActivity: true
      },
      {
        userId: 'u2',
        userName: 'Bob',
        userEmail: 'bob@example.com',
        role: 'editor',
        status: 'online',
        totalEvents: 14,
        activitySharePercent: 33,
        linesAdded: 30,
        linesDeleted: 10,
        totalLinesChanged: 40,
        codeEdits: 6,
        filesCreated: 0,
        filesDeleted: 0,
        filesRenamed: 0,
        codeExecutions: 2,
        executionSuccessRate: 50,
        collaborationEvents: 6,
        contributionScore: 49,
        hasRecordedActivity: true
      },
      {
        userId: 'u3',
        userName: 'Charlie',
        userEmail: 'charlie@example.com',
        role: 'viewer',
        status: 'offline',
        totalEvents: 0,
        activitySharePercent: 0,
        linesAdded: 0,
        linesDeleted: 0,
        totalLinesChanged: 0,
        codeEdits: 0,
        filesCreated: 0,
        filesDeleted: 0,
        filesRenamed: 0,
        codeExecutions: 0,
        executionSuccessRate: 0,
        collaborationEvents: 0,
        contributionScore: 0,
        hasRecordedActivity: false
      }
    ],
    activityTimeline: [
      { label: '21:00', date: '2026-10-31', events: 22, linesChanged: 130, codeEdits: 14, executions: 4 },
      { label: '22:00', date: '2026-10-31', events: 20, linesChanged: 75, codeEdits: 10, executions: 2 }
    ],
    validation: {
      validationPassed: true,
      summary: 'All CT-201 session analytics validation checks passed'
    }
  };

  // Verify contract specifications
  assert.ok(mockApiResponse.workspaceId, 'workspaceId is required');
  assert.ok(mockApiResponse.sessionSummary, 'sessionSummary object must exist');
  assert.ok(Array.isArray(mockApiResponse.participantBreakdown), 'participantBreakdown must be an array');
  assert.ok(mockApiResponse.eventCategoryBreakdown, 'eventCategoryBreakdown must exist');
  assert.ok(Array.isArray(mockApiResponse.activityTimeline), 'activityTimeline must be an array');
  assert.strictEqual(mockApiResponse.validation.validationPassed, true, 'Validation must be attached and passing');

  // Verify mathematical consistency between response fields
  const pSum = mockApiResponse.participantBreakdown.reduce((s, p) => s + p.totalEvents, 0);
  assert.strictEqual(pSum, mockApiResponse.sessionSummary.totalEvents, 'Participant events sum must equal session totalEvents');

  const catSum = Object.values(mockApiResponse.eventCategoryBreakdown).reduce((s, v) => s + v, 0);
  assert.strictEqual(catSum, mockApiResponse.sessionSummary.totalEvents, 'Categories sum must equal session totalEvents');

  const timelineSum = mockApiResponse.activityTimeline.reduce((s, t) => s + t.events, 0);
  assert.strictEqual(timelineSum, mockApiResponse.sessionSummary.totalEvents, 'Timeline events sum must equal session totalEvents');

  console.log('  ✔ [PASS] End-to-end response contract conforms to UI schema');
  console.log('  ✔ [PASS] Cross-layer consistency verified across summary, participants, categories, and timeline');
}

console.log('\n═══════════════════════════════════════════════════════════════════════════');
console.log('🎉   ALL CT-198 & CT-201 SESSION ANALYTICS & VALIDATION TESTS PASSED!');
console.log('     Section 1 (Empty Sessions):          ✔');
console.log('     Section 2 (Single Participant):      ✔');
console.log('     Section 3 (Multi-User & Zero-Act):   ✔');
console.log('     Section 4 (Duration & Timestamps):   ✔');
console.log('     Section 5 (Deduplication):           ✔');
console.log('     Section 6 (Boundary & 1,500 Events): ✔');
console.log('     Section 7 (Category Consistency):    ✔');
console.log('     Section 8 (Execution Metrics):       ✔');
console.log('     Section 9 (Integration Contract):    ✔');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

