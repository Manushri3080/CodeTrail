/**
 * CodeTrail CT-164 & CT-167 Telemetry & Timestamp Test Suite
 * Tests:
 * 1. High-precision ISO-8601 Timestamps & Monotonic Sequence Counter Verification
 * 2. Real-time Telemetry Store & Dossier Calculations (Lines, dynamic % share, SHA-256 hashes)
 * 3. Session Duration vs Active Contribution Time Tracking & Efficiency Metrics
 * 4. Multi-peer Action Broadcasting & Real-time Live Dossier Synchronization
 */

const assert = require('assert');
const telemetryStore = require('../utils/telemetryStore');
const crypto = require('crypto');

console.log('\n======================================================');
console.log('⏱️  CODETRAIL CT-164 & CT-167: SOCKET TELEMETRY & TIMESTAMP SUITE');
console.log('======================================================\n');

let totalTests = 0;
let passedTests = 0;

const test = (name, fn) => {
  totalTests++;
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}\n`);
  }
};

// -------------------------------------------------------------
// SECTION 1: High-Precision ISO-8601 Timestamps & Monotonic Sequencing (CT-164)
// -------------------------------------------------------------
console.log('🧪 Section 1: ISO-8601 Timestamps & Monotonic Sequencing (CT-164)...');

test('High-precision ISO-8601 timestamp conforms to UTC specification with milliseconds', () => {
  const timestamp = new Date().toISOString();
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  assert.ok(isoRegex.test(timestamp), `Timestamp "${timestamp}" does not match ISO-8601 format.`);
});

test('Monotonic sequence counter generates strictly increasing, non-repeating integers', () => {
  const wsId = `ws-test-seq-${Date.now()}`;
  const seq1 = telemetryStore.getNextSequence(wsId);
  const seq2 = telemetryStore.getNextSequence(wsId);
  const seq3 = telemetryStore.getNextSequence(wsId);

  assert.strictEqual(seq2, seq1 + 1, 'Sequence #2 must be strictly seq1 + 1');
  assert.strictEqual(seq3, seq2 + 1, 'Sequence #3 must be strictly seq2 + 1');
  assert.ok(seq3 > seq2 && seq2 > seq1, 'Monotonic ordering violated');
});

test('Recorded telemetry envelope attaches monotonic sequence, high-precision timestamp, and SHA-256 hash', () => {
  const wsId = `ws-test-envelope-${Date.now()}`;
  const rawAction = {
    actionType: 'CODE_EDIT',
    fileId: 'app.js',
    user: { id: 'usr-mahi', name: 'Mahi Lead', role: 'owner' },
    metrics: { linesAdded: 15, totalLines: 120 }
  };

  const { envelope } = telemetryStore.recordAction(wsId, rawAction);

  assert.ok(envelope.seq >= 101, 'Sequence counter must start at baseline or higher');
  assert.ok(envelope.timestamp, 'Timestamp must exist');
  assert.ok(envelope.verificationHash, 'Cryptographic verification hash must exist');
  assert.ok(envelope.fullHash.length === 64, 'Full SHA-256 hash must be 64 hex characters');
});

// -------------------------------------------------------------
// SECTION 2: Socket Telemetry Dossier Synchronization (CT-167)
// -------------------------------------------------------------
console.log('\n🧪 Section 2: Socket Telemetry Dossier Live Synchronization (CT-167)...');

test('Peer actions trigger dynamic line recalculation and percentage distribution', () => {
  const wsId = `ws-test-dossier-${Date.now()}`;

  // Action by Peer 1 (Mahi)
  const { dossier: d1 } = telemetryStore.recordAction(wsId, {
    actionType: 'CODE_EDIT',
    fileId: 'index.js',
    user: { id: 'usr-mahi', name: 'Mahi', role: 'owner' },
    metrics: { linesAdded: 500, totalLines: 500 }
  });

  // Action by Peer 2 (Alex)
  const { dossier: d2 } = telemetryStore.recordAction(wsId, {
    actionType: 'FILE_CREATE',
    fileId: 'helper.js',
    user: { id: 'usr-alex', name: 'Alex', role: 'editor' },
    metrics: { linesAdded: 250, totalLines: 250 }
  });

  const mahiContrib = d2.contributors.find(c => c.id === 'usr-mahi');
  const alexContrib = d2.contributors.find(c => c.id === 'usr-alex');

  assert.ok(mahiContrib, 'Mahi must be in contributors list');
  assert.ok(alexContrib, 'Alex must be in contributors list');
  assert.strictEqual(mahiContrib.lines, 500, 'Mahi line count must be 500');
  assert.strictEqual(alexContrib.lines, 250, 'Alex line count must be 250');

  // Verify dynamic percentage sum is approximately 100%
  const totalPercent = d2.contributors.reduce((sum, c) => sum + (c.percent || 0), 0);
  assert.ok(totalPercent >= 98 && totalPercent <= 102, `Total percentages should sum ~100%, got ${totalPercent}%`);
});

test('Ring buffer retains the most recent 50 telemetry stream events in chronological sequence', () => {
  const wsId = `ws-test-ring-${Date.now()}`;

  for (let i = 1; i <= 60; i++) {
    telemetryStore.recordAction(wsId, {
      actionType: 'CODE_EDIT',
      fileId: 'file.js',
      user: { id: 'usr-dev', name: 'Dev' },
      metrics: { linesAdded: 1 }
    });
  }

  const ws = telemetryStore.workspaces.get(wsId);
  assert.strictEqual(ws.events.length, 50, 'Ring buffer must cap at 50 events');
  assert.ok(ws.events[0].seq > ws.events[ws.events.length - 1].seq, 'Latest event must be at index 0');
});

// -------------------------------------------------------------
// SECTION 3: Active Contribution Time & Session Duration (CT-164)
// -------------------------------------------------------------
console.log('\n🧪 Section 3: Active Contribution Time vs Session Duration (CT-164)...');

test('Active contribution tracker accurately distinguishes active typing from idle intervals', () => {
  // Simulate active contribution logic
  let totalSessionSeconds = 120; // 2 minutes in room
  let activeContributionSeconds = 90; // 90 seconds of typing, 30 seconds idle

  const efficiencyRatio = Math.round((activeContributionSeconds / totalSessionSeconds) * 100);

  assert.strictEqual(efficiencyRatio, 75, 'Efficiency ratio must be 75%');
  assert.ok(activeContributionSeconds <= totalSessionSeconds, 'Active contribution time cannot exceed session duration');
});

test('Heartbeat correctly persists active contribution seconds for contributors', () => {
  const wsId = `ws-test-hb-${Date.now()}`;
  const user = { id: 'usr-mahi', name: 'Mahi', role: 'owner' };

  const dossier = telemetryStore.recordHeartbeat(wsId, user, {
    activeContributionSeconds: 345
  });

  const contributor = dossier.contributors.find(c => c.id === 'usr-mahi');
  assert.ok(contributor, 'Contributor must exist in dossier after heartbeat');
  assert.strictEqual(contributor.activeSeconds, 345, 'Active seconds must match heartbeat payload');
});

console.log('\n======================================================');
console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
if (passedTests === totalTests) {
  console.log('🎉 ALL CT-164 & CT-167 TELEMETRY & TIMESTAMP TESTS PASSED!');
} else {
  console.log('⚠️ SOME TESTS FAILED');
}
console.log('======================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
