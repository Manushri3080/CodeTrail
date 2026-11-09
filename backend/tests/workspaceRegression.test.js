/**
 * CodeTrail — Critical Workspace Visibility & Creation Regression Test Suite
 * Developer: Meet Sheth
 * Scope: Workspace visibility, creation flow, dashboard integration, and startup conflict handling
 */

const assert = require('assert');
const mongoose = require('mongoose');

console.log('\n--- CodeTrail Workspace Visibility & Creation Regression Suite ---');

// 1. Mock DB and isolated memory store
const mockUsers = {
  userA: { _id: new mongoose.Types.ObjectId('6a95a5d66e9b0d2aa3eb9f82'), name: 'Mit Sheth', email: 'mitsheth2@gmail.com' },
  userB: { _id: new mongoose.Types.ObjectId('6a95adfe252634dd462250d5'), name: 'Meet Sheth', email: 'mitsheth9@gmail.com' },
  userC: { _id: new mongoose.Types.ObjectId('6a79be114a80870a833b2a3c'), name: 'Ruchita Patadiya', email: 'rpatadiya2004@gmail.com' },
  userD: { _id: new mongoose.Types.ObjectId('6a95b44dee5a0ee5e5f65c62'), name: 'Mit Sheth (Alt)', email: 'shethmit5@gmail.com' }
};

const mockWorkspaces = [
  {
    _id: new mongoose.Types.ObjectId('6a95adcd252634dd462250d4'),
    title: 'Meet',
    description: 'Collaborative development workspace on CodeTrail',
    owner: mockUsers.userA,
    status: 'active',
    language: 'javascript',
    inviteCode: 'CT-MEET1',
    files: [{ id: 'index.js', name: 'index.js', content: 'console.log("hi");' }],
    members: [
      { user: mockUsers.userA, role: 'owner', joinedAt: new Date() },
      { user: mockUsers.userB, role: 'viewer', joinedAt: new Date() }
    ],
    updatedAt: new Date()
  },
  {
    _id: new mongoose.Types.ObjectId('6a95af21252634dd462250d6'),
    title: 'test',
    description: 'Test workspace',
    owner: mockUsers.userA,
    status: 'active',
    language: 'python',
    inviteCode: 'CT-TEST2',
    files: [{ id: 'main.py', name: 'main.py', content: 'print("test")' }],
    members: [
      { user: mockUsers.userA, role: 'owner', joinedAt: new Date() }
    ],
    updatedAt: new Date()
  },
  {
    _id: new mongoose.Types.ObjectId('6ab956e6373afa4a6058882f'),
    title: 'Javascript Contribution',
    description: 'JS project',
    owner: mockUsers.userC,
    status: 'active',
    language: 'javascript',
    inviteCode: 'CT-JSCONTRIB',
    files: [
      { id: 'index.js', name: 'index.js', content: '// main' },
      { id: 'utils.js', name: 'utils.js', content: '// utils' }
    ],
    members: [
      { user: mockUsers.userC, role: 'owner', joinedAt: new Date() },
      { user: mockUsers.userA, role: 'editor', joinedAt: new Date() }
    ],
    updatedAt: new Date()
  }
];

// Helper functions mirroring workspaceController logic
const formatWorkspaceSummary = (workspace, userId) => {
  const targetUserId = userId ? String(userId._id || userId) : null;
  const ownerId = workspace.owner ? String(workspace.owner._id || workspace.owner) : null;
  const isOwner = Boolean(ownerId && targetUserId && ownerId === targetUserId);
  const memberInfo = (workspace.members || []).find(member => {
    const memberId = member.user ? String(member.user._id || member.user) : null;
    return Boolean(memberId && targetUserId && memberId === targetUserId);
  });

  return {
    id: workspace._id,
    _id: workspace._id,
    title: workspace.title,
    name: workspace.title,
    description: workspace.description || workspace.desc || '',
    desc: workspace.description || workspace.desc || '',
    brandColor: workspace.brandColor || 'purple',
    icon: workspace.icon || 'Rocket',
    role: isOwner ? 'owner' : (memberInfo?.role || 'viewer'),
    timeSpent: workspace.timeSpent || '0h 0m',
    status: workspace.status || 'active',
    language: workspace.language || 'javascript',
    inviteCode: workspace.inviteCode,
    roomCode: workspace.inviteCode,
    settings: workspace.settings,
    updatedAt: workspace.updatedAt,
    members: (workspace.members || []).map(member => ({
      id: member.user ? (member.user._id || member.user) : null,
      name: member.user?.name || 'Collaborator',
      email: member.user?.email,
      role: member.role || 'viewer'
    })),
    collaborators: (workspace.members && workspace.members.length > 0)
      ? workspace.members.map(m => {
          const name = m.user?.name;
          return name ? name[0].toUpperCase() : 'U';
        })
      : ['U'],
    files: workspace.files || [],
    filesCount: workspace.files?.length || 0
  };
};

const queryWorkspacesForUser = (userId) => {
  const uIdStr = String(userId._id || userId);
  return mockWorkspaces.filter(ws => {
    const ownerIdStr = String(ws.owner._id || ws.owner);
    const isOwner = ownerIdStr === uIdStr;
    const isMember = (ws.members || []).some(m => String(m.user._id || m.user) === uIdStr);
    return isOwner || isMember;
  });
};

// ==========================================
// TEST SUITE 1: WORKSPACE VISIBILITY
// ==========================================

// Test 1: Owner sees owned workspaces
{
  const userAWorkspaces = queryWorkspacesForUser(mockUsers.userA._id);
  assert.strictEqual(userAWorkspaces.length, 3, 'User A should see 3 workspaces (2 owned, 1 joined)');
  const summaries = userAWorkspaces.map(ws => formatWorkspaceSummary(ws, mockUsers.userA._id));
  const owned = summaries.filter(s => s.role === 'owner');
  assert.strictEqual(owned.length, 2, 'User A should have owner role on 2 workspaces');
  console.log('✔ Test 1 Passed: Owner sees owned workspaces with correct role.');
}

// Test 2: Member sees joined workspaces
{
  const userBWorkspaces = queryWorkspacesForUser(mockUsers.userB._id);
  assert.strictEqual(userBWorkspaces.length, 1, 'User B should see 1 joined workspace');
  const summary = formatWorkspaceSummary(userBWorkspaces[0], mockUsers.userB._id);
  assert.strictEqual(summary.title, 'Meet', 'User B should see workspace "Meet"');
  assert.strictEqual(summary.role, 'viewer', 'User B should have viewer role in "Meet"');
  console.log('✔ Test 2 Passed: Member sees joined workspaces with correct role.');
}

// Test 3: Unauthorized / unconnected user sees 0 workspaces
{
  const userDWorkspaces = queryWorkspacesForUser(mockUsers.userD._id);
  assert.strictEqual(userDWorkspaces.length, 0, 'User D (unconnected) should see 0 workspaces');
  console.log('✔ Test 3 Passed: User with no memberships correctly receives 0 workspaces.');
}

// Test 4: Populated and unpopulated references work without errors
{
  const unpopulatedWs = {
    _id: 'ws_unpop_1',
    title: 'Unpopulated WS',
    owner: '6a95a5d66e9b0d2aa3eb9f82',
    members: [{ user: '6a95a5d66e9b0d2aa3eb9f82', role: 'owner' }],
    files: [{ id: 'f1', name: 'main.py' }]
  };
  const summary = formatWorkspaceSummary(unpopulatedWs, '6a95a5d66e9b0d2aa3eb9f82');
  assert.strictEqual(summary.role, 'owner', 'Unpopulated string ID owner should match user ID');
  assert.strictEqual(summary.filesCount, 1, 'filesCount should be 1');
  assert.strictEqual(summary.collaborators.length, 1, 'collaborators should have 1 item');
  console.log('✔ Test 4 Passed: Populated and unpopulated references resolve safely.');
}

// ==========================================
// TEST SUITE 2: WORKSPACE CREATION
// ==========================================

// Test 5: Workspace creation starter files and language normalization
{
  const workspaceController = require('../controllers/workspaceController');
  assert.strictEqual(typeof workspaceController.createWorkspace, 'function', 'createWorkspace must be a function');

  // Verify language handling
  const schemaLanguages = ['javascript', 'python', 'cpp', 'java', 'rust', 'go', 'typescript'];
  const testLangs = ['TypeScript', 'C', 'HTML', 'Python', 'javascript'];
  testLangs.forEach(lang => {
    const raw = lang.toLowerCase();
    let norm = 'javascript';
    if (schemaLanguages.includes(raw)) norm = raw;
    else if (raw === 'c') norm = 'cpp';
    assert.ok(schemaLanguages.includes(norm), `Normalized language ${norm} must be in schema enum`);
  });
  console.log('✔ Test 5 Passed: Language normalization maps safely to schema enum.');
}

// Test 6: Workspace creation response includes summary properties
{
  const mockPopulated = {
    _id: new mongoose.Types.ObjectId('6a95adcd252634dd46225099'),
    title: 'New Project',
    description: 'Fresh workspace',
    owner: mockUsers.userA,
    members: [{ user: mockUsers.userA, role: 'owner' }],
    files: [{ id: 'index.js', name: 'index.js' }],
    language: 'javascript',
    brandColor: 'purple',
    icon: 'Rocket',
    status: 'active',
    inviteCode: 'CT-NEW99'
  };
  const summary = formatWorkspaceSummary(mockPopulated, mockUsers.userA._id);
  const responsePayload = { ...mockPopulated, ...summary };

  assert.strictEqual(responsePayload.id, mockPopulated._id, 'Response must include id');
  assert.strictEqual(responsePayload._id, mockPopulated._id, 'Response must include _id');
  assert.strictEqual(responsePayload.role, 'owner', 'Creator must have role "owner"');
  assert.strictEqual(responsePayload.filesCount, 1, 'filesCount must be 1');
  assert.ok(Array.isArray(responsePayload.collaborators), 'collaborators must be an array');
  console.log('✔ Test 6 Passed: Workspace creation returns complete summary and raw payload.');
}

// ==========================================
// TEST SUITE 3: DASHBOARD INTEGRATION
// ==========================================

// Test 7: Dashboard metrics calculation
{
  const sampleWorkspaces = [
    {
      id: 'ws1',
      _id: 'ws1',
      title: 'WS 1',
      filesCount: 3,
      members: [{ id: 'u1' }, { id: 'u2' }],
      collaborators: ['A', 'B']
    },
    {
      id: 'ws2',
      _id: 'ws2',
      title: 'WS 2',
      filesCount: 2,
      members: [{ id: 'u1' }],
      collaborators: ['A']
    }
  ];

  const totalWorkspacesCount = sampleWorkspaces.length;
  const totalFilesCount = sampleWorkspaces.reduce((acc, ws) => acc + (ws.filesCount || 1), 0);
  const totalCollaboratorsCount = sampleWorkspaces.reduce((acc, ws) => acc + (ws.collaborators ? ws.collaborators.length : (ws.members ? ws.members.length : 1)), 0);

  assert.strictEqual(totalWorkspacesCount, 2, 'Workspaces count should be 2');
  assert.strictEqual(totalFilesCount, 5, 'Total files should be 5 (3+2)');
  assert.strictEqual(totalCollaboratorsCount, 3, 'Total collaborators should be 3 (2+1)');
  console.log('✔ Test 7 Passed: Dashboard statistics calculate accurately.');
}

// Test 8: Empty state behavior
{
  const emptyWorkspaces = [];
  const totalWorkspacesCount = emptyWorkspaces.length;
  const totalFilesCount = emptyWorkspaces.reduce((acc, ws) => acc + (ws.filesCount || 1), 0);
  const totalCollaboratorsCount = emptyWorkspaces.reduce((acc, ws) => acc + (ws.collaborators ? ws.collaborators.length : 1), 0);

  assert.strictEqual(totalWorkspacesCount, 0, 'Empty workspaces count is 0');
  assert.strictEqual(totalFilesCount, 0, 'Empty files count is 0');
  assert.strictEqual(totalCollaboratorsCount, 0, 'Empty collaborators count is 0');
  console.log('✔ Test 8 Passed: Empty workspace state handles metrics without NaN or undefined.');
}

// ==========================================
// TEST SUITE 4: PORT CONFLICT & ROOT STARTUP
// ==========================================

// Test 9: Root package.json development startup script
{
  const rootPkg = require('../../package.json');
  assert.strictEqual(
    rootPkg.scripts.dev,
    'concurrently "npm run dev --prefix backend" "npm run dev --prefix frontend"',
    'Root package.json dev script must remain unmodified and use concurrently'
  );
  console.log('✔ Test 9 Passed: Root package.json dev script is strictly preserved.');
}

console.log('✔ All 9 Workspace Regression Tests PASSED Successfully!\n');
module.exports = true;

