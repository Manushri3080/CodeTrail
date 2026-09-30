const assert = require('assert');
const {
  GENESIS_HASH,
  computeActivityHash,
  verifySingleActivityHash,
  verifyActivityChain
} = require('../utils/cryptoProof');

console.log('🧪 Starting Proof-of-Work & Activity Logging Test Suite...\n');

// Test 1: Deterministic Hashing & Avalanche Effect
console.log('Test 1: SHA-256 Deterministic Hashing & Avalanche Effect');
const samplePayload = {
  workspaceId: '64d8f1e2c9a7b3d1e2f3a4b5',
  sequenceNumber: 1,
  previousHash: GENESIS_HASH,
  timestamp: new Date('2026-09-27T12:00:00.000Z'),
  userId: '64d8f1e2c9a7b3d1e2f3a4b6',
  action: 'file_create',
  fileId: 'f-main-js',
  linesAdded: 25,
  linesDeleted: 0,
  details: 'Created main.js with initial boilerplate'
};

const hash1 = computeActivityHash(samplePayload);
const hash2 = computeActivityHash({ ...samplePayload }); // same payload duplicate
assert.strictEqual(hash1, hash2, 'Identical payloads must yield identical SHA-256 hashes');
assert.strictEqual(hash1.length, 64, 'SHA-256 hex must be exactly 64 characters');

// Modify single character in details
const tamperedPayload = { ...samplePayload, details: 'Created main.js with initial Boilerplate' };
const tamperedHash = computeActivityHash(tamperedPayload);
assert.notStrictEqual(hash1, tamperedHash, 'Avalanche effect failed: single character change did not change hash');
console.log('  ✔ Hashing is deterministic and displays full avalanche effect.');

// Test 2: Single Activity Verification
console.log('\nTest 2: verifySingleActivityHash');
const validBlock = {
  ...samplePayload,
  currentHash: hash1
};
assert.strictEqual(verifySingleActivityHash(validBlock), true, 'Valid block must verify true');

const invalidBlock = {
  ...samplePayload,
  linesAdded: 999, // tampered!
  currentHash: hash1
};
assert.strictEqual(verifySingleActivityHash(invalidBlock), false, 'Tampered block must fail verification');
console.log('  ✔ Single block verification correctly detects tampering.');

// Test 3: Multi-Block Chain Construction & Verification
console.log('\nTest 3: verifyActivityChain on valid 4-block blockchain');
const chain = [];
let prev = GENESIS_HASH;

const events = [
  { action: 'file_create', details: 'Created index.js', linesAdded: 10, linesDeleted: 0 },
  { action: 'code_edit', details: 'Added sum function', linesAdded: 15, linesDeleted: 2 },
  { action: 'code_execution', details: 'Executed index.js (success, exit 0, 18ms)', linesAdded: 0, linesDeleted: 0 },
  { action: 'session_end', details: 'Session completed after 45m', linesAdded: 0, linesDeleted: 0 }
];

events.forEach((ev, idx) => {
  const seq = idx + 1;
  const time = new Date(Date.now() + idx * 60000);
  const blockData = {
    workspaceId: '64d8f1e2c9a7b3d1e2f3a4b5',
    sequenceNumber: seq,
    previousHash: prev,
    timestamp: time,
    userId: '64d8f1e2c9a7b3d1e2f3a4b6',
    action: ev.action,
    fileId: 'f-index',
    linesAdded: ev.linesAdded,
    linesDeleted: ev.linesDeleted,
    details: ev.details
  };
  const current = computeActivityHash(blockData);
  chain.push({ ...blockData, currentHash: current });
  prev = current;
});

const chainResult = verifyActivityChain(chain);
assert.strictEqual(chainResult.isValid, true, 'Valid chain must pass verification');
assert.strictEqual(chainResult.totalBlocks, 4, 'Total blocks must be 4');
assert.strictEqual(chainResult.latestHash, chain[3].currentHash, 'Latest hash must match block 4');
console.log('  ✔ Valid 4-block chain successfully verified.');

// Test 4: Tamper Detection (Content Modification)
console.log('\nTest 4: Tamper Detection - Content altered inside Block #2');
const tamperedChainContent = JSON.parse(JSON.stringify(chain));
// Tamper line count in block #2 without updating hash
tamperedChainContent[1].linesAdded = 5000;
const tamperContentResult = verifyActivityChain(tamperedChainContent);
assert.strictEqual(tamperContentResult.isValid, false, 'Tampered chain must fail');
assert.strictEqual(tamperContentResult.tamperedIndex, 1, 'Tampered block index must be 1 (Block #2)');
console.log('  ✔ Tampered content detected at Block #2:', tamperContentResult.error);

// Test 5: Tamper Detection (Broken Hash Link / Middle Block Deleted)
console.log('\nTest 5: Tamper Detection - Broken Previous Hash Link');
const brokenLinkChain = JSON.parse(JSON.stringify(chain));
brokenLinkChain[2].previousHash = 'a'.repeat(64); // corrupted link
const brokenLinkResult = verifyActivityChain(brokenLinkChain);
assert.strictEqual(brokenLinkResult.isValid, false, 'Broken link chain must fail');
assert.strictEqual(brokenLinkResult.tamperedIndex, 2, 'Broken link index must be 2 (Block #3)');
console.log('  ✔ Broken previousHash link detected at Block #3:', brokenLinkResult.error);

// Test 6: Tamper Detection (Sequence Number Gap)
console.log('\nTest 6: Tamper Detection - Sequence Number Discrepancy');
const sequenceGapChain = JSON.parse(JSON.stringify(chain));
sequenceGapChain[2].sequenceNumber = 99; // gap
const sequenceGapResult = verifyActivityChain(sequenceGapChain);
assert.strictEqual(sequenceGapResult.isValid, false, 'Sequence gap must fail');
assert.strictEqual(sequenceGapResult.tamperedIndex, 2, 'Sequence gap index must be 2 (Block #3)');
console.log('  ✔ Sequence number gap detected at Block #3:', sequenceGapResult.error);

console.log('\n=============================================');
console.log('🎉 ALL PROOF-OF-WORK CRYPTOGRAPHIC TESTS PASSED!');
console.log('=============================================\n');
