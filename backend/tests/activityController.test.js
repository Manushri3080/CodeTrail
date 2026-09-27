const assert = require('assert');
const {
  GENESIS_HASH,
  computeActivityHash,
  verifyActivityChain
} = require('../utils/cryptoProof');

console.log('🧪 Running Comprehensive Controller & API Flow Tests...\n');

// Mock data structures
const mockWorkspaceId = '64d8f1e2c9a7b3d1e2f3a4b5';
const mockUserOwner = {
  _id: '64d8f1e2c9a7b3d1e2f3a4b6',
  name: 'Manushri Thakkar',
  email: 'manushri@codetrail.dev',
  role: 'owner'
};
const mockUserCollaborator = {
  _id: '64d8f1e2c9a7b3d1e2f3a4b7',
  name: 'Ruchita Patadiya',
  email: 'ruchita@codetrail.dev',
  role: 'editor'
};

// Test 1: Simulating full multi-user collaborative session with PoW chain
console.log('Test 1: Multi-user activity chain construction & verification');
const activities = [];
let prevHash = GENESIS_HASH;

function addSimulatedActivity(user, action, fileId, fileName, details, linesAdded, linesDeleted) {
  const seq = activities.length + 1;
  const timestamp = new Date(Date.now() + seq * 5000);
  const hash = computeActivityHash({
    workspaceId: mockWorkspaceId,
    sequenceNumber: seq,
    previousHash: prevHash,
    timestamp,
    userId: user._id,
    action,
    fileId,
    linesAdded,
    linesDeleted,
    details
  });

  const block = {
    _id: `act-${seq}`,
    workspaceId: mockWorkspaceId,
    userId: user._id,
    userName: user.name,
    userEmail: user.email,
    userRole: user.role,
    action,
    fileId,
    fileName,
    details,
    linesAdded,
    linesDeleted,
    totalLinesChanged: linesAdded + linesDeleted,
    sequenceNumber: seq,
    previousHash: prevHash,
    currentHash: hash,
    timestamp,
    isVerified: true
  };

  activities.push(block);
  prevHash = hash;
  return block;
}

// 1. Manushri initializes workspace
addSimulatedActivity(mockUserOwner, 'settings_update', null, null, 'Workspace initialized', 0, 0);

// 2. Manushri creates index.js
addSimulatedActivity(mockUserOwner, 'file_create', 'f-1', 'index.js', 'Created index.js', 45, 0);

// 3. Ruchita edits index.js
addSimulatedActivity(mockUserCollaborator, 'code_edit', 'f-1', 'index.js', 'Implemented binary search helper', 30, 5);

// 4. Ruchita executes code
addSimulatedActivity(mockUserCollaborator, 'code_execution', 'f-1', 'index.js', 'Executed index.js (success, exit 0, 24ms)', 0, 0);

// 5. Manushri creates server.js
addSimulatedActivity(mockUserOwner, 'file_create', 'f-2', 'server.js', 'Created Express server scaffold', 60, 2);

assert.strictEqual(activities.length, 5, 'Should have 5 blocks');
const verifyResult = verifyActivityChain(activities);
assert.strictEqual(verifyResult.isValid, true, 'Multi-user chain must be 100% valid');
assert.strictEqual(verifyResult.totalBlocks, 5, 'Total blocks must be 5');
console.log('  ✔ Multi-user collaborative chain verified successfully (5 blocks).');

// Test 2: Aggregated Contribution Telemetry Calculation
console.log('\nTest 2: Contribution share & lines calculation');
const userStats = {};
let totalWorkspaceLines = 0;

activities.forEach(act => {
  const uid = act.userId;
  if (!userStats[uid]) {
    userStats[uid] = { linesAdded: 0, linesDeleted: 0, totalLinesChanged: 0, events: 0, latestHash: '' };
  }
  userStats[uid].linesAdded += act.linesAdded;
  userStats[uid].linesDeleted += act.linesDeleted;
  userStats[uid].totalLinesChanged += act.totalLinesChanged;
  userStats[uid].events += 1;
  userStats[uid].latestHash = act.currentHash;
  totalWorkspaceLines += act.totalLinesChanged;
});

// Manushri: 45 + 0 + 60 + 2 = 107 lines
// Ruchita: 30 + 5 = 35 lines
// Total: 142 lines
assert.strictEqual(userStats[mockUserOwner._id].totalLinesChanged, 107);
assert.strictEqual(userStats[mockUserCollaborator._id].totalLinesChanged, 35);
assert.strictEqual(totalWorkspaceLines, 142);

const manushriPercent = Math.round((userStats[mockUserOwner._id].totalLinesChanged / totalWorkspaceLines) * 100);
const ruchitaPercent = Math.round((userStats[mockUserCollaborator._id].totalLinesChanged / totalWorkspaceLines) * 100);

assert.strictEqual(manushriPercent + ruchitaPercent, 100, 'Percentages must add up to 100%');
console.log(`  ✔ Manushri: ${userStats[mockUserOwner._id].totalLinesChanged} lines (${manushriPercent}%), Ruchita: ${userStats[mockUserCollaborator._id].totalLinesChanged} lines (${ruchitaPercent}%)`);

// Test 3: Tampering Simulation
console.log('\nTest 3: Tampering Simulation in Collaborative Session');
const forgedActivities = JSON.parse(JSON.stringify(activities));
// An attacker tries to secretly bump Ruchita's lines added to 999
forgedActivities[2].linesAdded = 999;
const forgedResult = verifyActivityChain(forgedActivities);
assert.strictEqual(forgedResult.isValid, false, 'Forged chain must be caught');
assert.strictEqual(forgedResult.tamperedIndex, 2, 'Tampered block index must be 2');
console.log('  ✔ Forgery detected immediately at block #3:', forgedResult.error);

console.log('\n=============================================');
console.log('🎉 ALL ACTIVITY CONTROLLER FLOW TESTS PASSED!');
console.log('=============================================\n');
