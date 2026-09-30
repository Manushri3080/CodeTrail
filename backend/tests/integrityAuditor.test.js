/**
 * CodeTrail CT-166 Activity Log Validation & Integrity Auditor Test Suite
 * Lead: Monar (Log Validation & Quality Lead)
 * 
 * Test Scenarios:
 * 1. Historical SHA-256 Signature Recalculation & Chain Verification
 * 2. Payload Content Alteration Detection (Avalanche effect verification)
 * 3. Numerical Metric Forgery Detection (linesAdded/linesDeleted manipulation)
 * 4. Broken Hash Pointer & Severed Link Detection
 * 5. Monotonic Sequence Gaps & Disorder Detection
 * 6. Retroactive Timestamp Anomaly Detection
 * 7. Forensic Audit Report & Fingerprint Generation
 * 8. Multi-Scenario Tamper Simulation Engine Validation
 * 9. Chain Recovery & 100% Cryptographically Verified Restoration
 */

const assert = require('assert');
const crypto = require('crypto');
const {
  GENESIS_HASH,
  computeActivityHash,
  verifySingleActivityHash,
  verifyActivityChain,
  auditActivityChainIntegrity,
  simulateTamper
} = require('../utils/cryptoProof');

console.log('\n======================================================');
console.log('🛡️  CODETRAIL CT-166: CHAIN INTEGRITY AUDITOR & VALIDATION SUITE');
console.log('    Lead: Monar (Log Validation & Quality Lead)');
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

const mockWorkspaceId = '64d8f1e2c9a7b3d1e2f3a4b5';
const mockUsers = {
  monar: { id: 'usr-monar', name: 'Monar Lead', role: 'admin' },
  manushri: { id: 'usr-manushri', name: 'Manushri Thakkar', role: 'owner' },
  ruchita: { id: 'usr-ruchita', name: 'Ruchita Patadiya', role: 'editor' }
};

// Helper to construct a valid verifiable blockchain of activities
function buildSampleChain(count = 5) {
  const chain = [];
  let prevHash = GENESIS_HASH;
  const baseTime = Date.now() - 3600000;

  const rawActions = [
    { user: mockUsers.manushri, action: 'file_create', fileId: 'f-1', fileName: 'index.js', details: 'Initialized index.js scaffold', linesAdded: 50, linesDeleted: 0 },
    { user: mockUsers.monar, action: 'code_edit', fileId: 'f-1', fileName: 'index.js', details: 'Added SHA-256 verification module', linesAdded: 80, linesDeleted: 5 },
    { user: mockUsers.ruchita, action: 'file_create', fileId: 'f-2', fileName: 'server.js', details: 'Scaffolded Express server', linesAdded: 45, linesDeleted: 0 },
    { user: mockUsers.monar, action: 'code_execution', fileId: 'f-1', fileName: 'index.js', details: 'Executed unit tests (exit code 0, 14ms)', linesAdded: 0, linesDeleted: 0 },
    { user: mockUsers.manushri, action: 'role_change', fileId: null, fileName: null, details: 'Granted admin permissions to Monar', linesAdded: 0, linesDeleted: 0 }
  ];

  for (let i = 0; i < count; i++) {
    const seq = i + 1;
    const act = rawActions[i % rawActions.length];
    const timestamp = new Date(baseTime + i * 60000);

    const hash = computeActivityHash({
      workspaceId: mockWorkspaceId,
      sequenceNumber: seq,
      previousHash: prevHash,
      timestamp,
      userId: act.user.id,
      action: act.action,
      fileId: act.fileId,
      linesAdded: act.linesAdded,
      linesDeleted: act.linesDeleted,
      details: act.details
    });

    chain.push({
      _id: `act-block-${seq}`,
      workspaceId: mockWorkspaceId,
      userId: act.user.id,
      userName: act.user.name,
      userRole: act.user.role,
      action: act.action,
      fileId: act.fileId,
      fileName: act.fileName,
      details: act.details,
      linesAdded: act.linesAdded,
      linesDeleted: act.linesDeleted,
      totalLinesChanged: act.linesAdded + act.linesDeleted,
      sequenceNumber: seq,
      previousHash: prevHash,
      currentHash: hash,
      timestamp,
      isVerified: true
    });

    prevHash = hash;
  }

  return chain;
}

// -------------------------------------------------------------
// SECTION 1: Historical SHA-256 Signature Recalculation & Chain Verification
// -------------------------------------------------------------
console.log('🧪 Section 1: Historical Hash Recalculation & Integrity Verification (CT-166)...');

test('Valid 5-block chain achieves "100% Cryptographically Verified" status', () => {
  const chain = buildSampleChain(5);
  const audit = auditActivityChainIntegrity(chain, { includeLedger: true });

  assert.strictEqual(audit.isValid, true, 'Chain must be completely valid');
  assert.strictEqual(audit.status, '100% Cryptographically Verified', 'Status string must match requirement');
  assert.strictEqual(audit.statusColor, 'emerald', 'Status color must be emerald');
  assert.strictEqual(audit.totalBlocks, 5, 'Total blocks must be 5');
  assert.strictEqual(audit.verifiedBlocksCount, 5, 'Verified blocks must be 5');
  assert.strictEqual(audit.tamperedBlocksCount, 0, 'Tampered blocks must be 0');
  assert.strictEqual(audit.integrityRatio, 100, 'Integrity ratio must be 100%');
  assert.strictEqual(audit.tamperDiagnostics, null, 'Tamper diagnostics should be null for clean chain');
  assert.strictEqual(audit.blocksLedger.length, 5, 'Blocks ledger must contain all 5 entries');
  assert.ok(audit.chainFingerprint && audit.chainFingerprint.length === 64, 'Chain fingerprint must be valid SHA-256');
});

test('Genesis block #1 strictly references 64 zeroes GENESIS_HASH', () => {
  const chain = buildSampleChain(1);
  assert.strictEqual(chain[0].previousHash, GENESIS_HASH, 'Genesis previousHash must equal GENESIS_HASH');
  assert.strictEqual(chain[0].sequenceNumber, 1, 'Genesis block sequence must be 1');
  const audit = auditActivityChainIntegrity(chain);
  assert.strictEqual(audit.isValid, true);
});

// -------------------------------------------------------------
// SECTION 2: Tamper Detection Scenarios & Visual Indicators
// -------------------------------------------------------------
console.log('\n🧪 Section 2: Tamper Detection Scenarios & Diagnostic Reporting (CT-166)...');

test('Scenario A: Payload modification triggers "Tamper Warning" with PAYLOAD_ALTERED', () => {
  const chain = buildSampleChain(5);
  // Modify details in block #2
  chain[1].details = 'Modified details without re-signing';

  const audit = auditActivityChainIntegrity(chain);

  assert.strictEqual(audit.isValid, false, 'Audit must fail when payload is altered');
  assert.strictEqual(audit.status, 'Tamper Warning', 'Status must switch to Tamper Warning');
  assert.strictEqual(audit.statusColor, 'rose', 'Status color must be rose');
  assert.ok(audit.tamperDiagnostics, 'Tamper diagnostics must be provided');
  assert.strictEqual(audit.tamperDiagnostics.blockSequence, 2, 'Tamper must be detected at block #2');
  assert.strictEqual(audit.tamperDiagnostics.tamperType, 'PAYLOAD_ALTERED', 'Tamper type must be PAYLOAD_ALTERED');
  assert.strictEqual(audit.verifiedBlocksCount, 1, 'Only block #1 is verified before tamper');
  assert.strictEqual(audit.tamperedBlocksCount, 4, 'Remaining 4 blocks are compromised');
});

test('Scenario B: Lines added/deleted metric forgery is detected immediately', () => {
  const chain = buildSampleChain(5);
  // Tamper line metric in block #3
  chain[2].linesAdded = 9999;

  const audit = auditActivityChainIntegrity(chain);

  assert.strictEqual(audit.isValid, false);
  assert.strictEqual(audit.status, 'Tamper Warning');
  assert.strictEqual(audit.tamperDiagnostics.blockSequence, 3);
  assert.strictEqual(audit.tamperDiagnostics.tamperType, 'PAYLOAD_ALTERED');
});

test('Scenario C: Broken hash pointer link triggers CHAIN_LINK_BROKEN', () => {
  const chain = buildSampleChain(5);
  // Sever previousHash pointer in block #4
  chain[3].previousHash = 'e'.repeat(64);

  const audit = auditActivityChainIntegrity(chain);

  assert.strictEqual(audit.isValid, false);
  assert.strictEqual(audit.status, 'Tamper Warning');
  assert.strictEqual(audit.tamperDiagnostics.blockSequence, 4);
  assert.strictEqual(audit.tamperDiagnostics.tamperType, 'CHAIN_LINK_BROKEN');
});

test('Scenario D: Sequence gap triggers SEQUENCE_GAP detection', () => {
  const chain = buildSampleChain(5);
  // Introduce sequence jump from #2 to #5
  chain[2].sequenceNumber = 5;

  const audit = auditActivityChainIntegrity(chain);

  assert.strictEqual(audit.isValid, false);
  assert.strictEqual(audit.status, 'Tamper Warning');
  assert.strictEqual(audit.tamperDiagnostics.tamperType, 'SEQUENCE_GAP');
});

test('Scenario E: Retroactive timestamp regression triggers TIMESTAMP_ANOMALY', () => {
  const chain = buildSampleChain(5);
  // Re-hash block #3 with a backward timestamp into the past
  const pastTime = new Date(chain[0].timestamp.getTime() - 86400000); // 1 day before block 1
  chain[2].timestamp = pastTime;
  chain[2].currentHash = computeActivityHash({
    ...chain[2],
    timestamp: pastTime
  });

  const audit = auditActivityChainIntegrity(chain);

  assert.strictEqual(audit.isValid, false);
  assert.strictEqual(audit.status, 'Tamper Warning');
  assert.strictEqual(audit.tamperDiagnostics.tamperType, 'TIMESTAMP_ANOMALY');
});

// -------------------------------------------------------------
// SECTION 3: Simulation Engine & Chain Restoration
// -------------------------------------------------------------
console.log('\n🧪 Section 3: Tamper Simulation Engine & Chain Recovery (CT-166)...');

test('simulateTamper accurately corrupts all specified vectors in non-destructive memory clone', () => {
  const cleanChain = buildSampleChain(4);

  const testVectors = [
    { type: 'modify_payload_lines', expectedType: 'PAYLOAD_ALTERED' },
    { type: 'modify_payload_details', expectedType: 'PAYLOAD_ALTERED' },
    { type: 'modify_hash', expectedType: 'PAYLOAD_ALTERED' },
    { type: 'break_pointer', expectedType: 'CHAIN_LINK_BROKEN' },
    { type: 'alter_sequence', expectedType: 'SEQUENCE_GAP' }
  ];

  testVectors.forEach(({ type, expectedType }) => {
    const tampered = simulateTamper(cleanChain, type, 1);
    const audit = auditActivityChainIntegrity(tampered);

    assert.strictEqual(audit.isValid, false, `Vector ${type} must be caught as invalid`);
    assert.strictEqual(audit.status, 'Tamper Warning', `Vector ${type} must return Tamper Warning`);
    assert.strictEqual(audit.tamperDiagnostics.tamperType, expectedType, `Vector ${type} must match expected tamperType`);
  });

  // Ensure original cleanChain was not mutated
  const originalAudit = auditActivityChainIntegrity(cleanChain);
  assert.strictEqual(originalAudit.isValid, true, 'Original chain must remain intact and 100% valid');
});

test('Chain recovery restores status from "Tamper Warning" back to "100% Cryptographically Verified"', () => {
  const chain = buildSampleChain(4);
  const originalDetails = chain[2].details;

  // 1. Alter data -> Tamper Warning
  chain[2].details = 'Corrupted content';
  assert.strictEqual(auditActivityChainIntegrity(chain).status, 'Tamper Warning');

  // 2. Revert data -> 100% Cryptographically Verified
  chain[2].details = originalDetails;
  const restoredAudit = auditActivityChainIntegrity(chain);
  assert.strictEqual(restoredAudit.status, '100% Cryptographically Verified');
  assert.strictEqual(restoredAudit.isValid, true);
});

console.log('\n======================================================');
console.log(`📊 CT-166 TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
if (passedTests === totalTests) {
  console.log('🎉 ALL CT-166 INTEGRITY AUDITOR & VALIDATION TESTS PASSED WITH 100% SUCCESS!');
} else {
  console.log('⚠️ SOME TESTS FAILED');
}
console.log('======================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
