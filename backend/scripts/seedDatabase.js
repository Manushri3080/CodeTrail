/**
 * seedDatabase.js
 * CodeTrail Formal Database Population Script
 *
 * Populates MongoDB with meaningful, production-grade records across all 5 core models:
 *   1. User (8 realistic team members + demo viewer with hashed passwords and profile bios)
 *   2. Workspace (3 multi-language collaborative workspaces with multi-file project trees)
 *   3. WorkspaceSession (Online & offline presence records with focus files and durations)
 *   4. Execution (Real execution logs: success, compile_error, runtime error, stdin benchmarks)
 *   5. ActivityLog (Immutable cryptographic SHA-256 Proof-of-Work activity chains from genesis)
 *
 * Usage:
 *   node backend/scripts/seedDatabase.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { computeActivityHash, GENESIS_HASH, auditActivityChainIntegrity } = require('../utils/cryptoProof');

const User = require('../models/User');
const Workspace = require('../models/Workspace');
const WorkspaceSession = require('../models/WorkspaceSession');
const Execution = require('../models/Execution');
const ActivityLog = require('../models/ActivityLog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/codetrail';

async function seedDatabase() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🌱   CODETRAIL DATABASE POPULATION & SEEDING HARNESS');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  try {
    console.log(`Connecting to MongoDB at: ${MONGO_URI.replace(/\/\/.*@/, '//<credentials>@')}...`);
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('✔ Connected to database successfully.\n');

    // Clean existing seed collections
    console.log('🧹 Purging prior collections for clean baseline state...');
    await Promise.all([
      User.deleteMany({ email: { $regex: /@codetrail\.dev$/ } }),
      Workspace.deleteMany({ title: { $regex: /^\[Demo\]/ } }),
      WorkspaceSession.deleteMany({}),
      Execution.deleteMany({ filename: { $regex: /demo|main|index/i } }),
      ActivityLog.deleteMany({})
    ]);
    console.log('✔ Prior test records cleared.\n');

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. SEED USERS (8 Team Contributors + 1 Guest Observer)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('👥 1. Seeding User Profiles with Bcrypt Salted Credentials...');
    const defaultPasswordHash = await bcrypt.hash('CodeTrail@2026', 10);

    const userSeedData = [
      {
        name: 'Manushri Thakkar',
        email: 'manushri@codetrail.dev',
        password: defaultPasswordHash,
        username: 'manushri',
        role: 'CodeTrail Learner',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Manushri',
        bio: 'Project Manager & Cryptographic Ledger Lead. Focused on SHA-256 chain immutability and DevOps.'
      },
      {
        name: 'Maryam Shaikh',
        email: 'maryam@codetrail.dev',
        password: defaultPasswordHash,
        username: 'maryam',
        role: 'CodeTrail Learner',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Maryam',
        bio: 'UI Architect & Full-Stack Developer. Designing Monaco editor layouts and workspace session management.'
      },
      {
        name: 'Ruchita Patadiya',
        email: 'ruchita@codetrail.dev',
        password: defaultPasswordHash,
        username: 'ruchita',
        role: 'CodeTrail Learner',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Ruchita',
        bio: 'Frontend Developer & Telemetry Lead. Building multi-file navigation and contribution telemetry views.'
      },
      {
        name: 'Mahi Kansara',
        email: 'mahi@codetrail.dev',
        password: defaultPasswordHash,
        username: 'mahi',
        role: 'CodeTrail Learner',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Mahi',
        bio: 'Real-Time WebSockets Lead. Engineering dual-room Socket.IO events and high-precision telemetry.'
      },
      {
        name: 'Anistina Dsouza',
        email: 'anistina@codetrail.dev',
        password: defaultPasswordHash,
        username: 'anistina',
        role: 'CodeTrail Learner',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Anistina',
        bio: 'Execution Engine & QA Lead. Overseeing Piston v2 containerization and formal contribution reporting.'
      },
      {
        name: 'Dudhat Monar',
        email: 'monar@codetrail.dev',
        password: defaultPasswordHash,
        username: 'monar',
        role: 'CodeTrail Learner',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Monar',
        bio: 'Forensic Audit & Tamper Validation Lead. Guarding cryptographic hash pointer integrity.'
      },
      {
        name: 'Rishika Shah',
        email: 'rishika@codetrail.dev',
        password: defaultPasswordHash,
        username: 'rishika',
        role: 'CodeTrail Learner',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Rishika',
        bio: 'Session Analytics & Validation Lead. Mathematical analysis of peer distribution and activity streaks.'
      },
      {
        name: 'Meet Sheth',
        email: 'meet@codetrail.dev',
        password: defaultPasswordHash,
        username: 'meet',
        role: 'CodeTrail Learner',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Meet',
        bio: 'Backend Architect & Export Lead. Designing PDF export schemas and system architecture.'
      },
      {
        name: 'Guest Reviewer',
        email: 'observer@codetrail.dev',
        password: defaultPasswordHash,
        username: 'observer',
        role: 'CodeTrail Learner',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Observer',
        bio: 'Read-only external academic evaluator inspecting real-time editor presence.'
      }
    ];

    const users = await User.insertMany(userSeedData);
    console.log(`✔ Inserted ${users.length} authenticated users.\n`);

    const userMap = {};
    users.forEach(u => { userMap[u.username] = u; });

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. SEED WORKSPACES (Multi-Language Projects with Realistic Multi-File Trees)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('📁 2. Seeding Multi-Language Workspaces & Project Hierarchies...');

    const workspace1 = await Workspace.create({
      title: '[Demo] CodeTrail Cloud Core Services',
      description: 'Distributed microservices architecture managing cryptographic consensus and WebSockets.',
      owner: userMap['manushri']._id,
      language: 'javascript',
      inviteCode: 'ct-core1',
      brandColor: '#6366F1',
      status: 'active',
      settings: {
        isPublic: true,
        allowAnonymousExecution: false,
        autoSaveInterval: 2500
      },
      members: [
        { user: userMap['manushri']._id, role: 'owner', joinedAt: new Date(Date.now() - 86400000 * 7) },
        { user: userMap['maryam']._id, role: 'admin', joinedAt: new Date(Date.now() - 86400000 * 6) },
        { user: userMap['ruchita']._id, role: 'editor', joinedAt: new Date(Date.now() - 86400000 * 5) },
        { user: userMap['mahi']._id, role: 'editor', joinedAt: new Date(Date.now() - 86400000 * 5) },
        { user: userMap['observer']._id, role: 'viewer', joinedAt: new Date(Date.now() - 86400000 * 1) }
      ],
      files: [
        {
          id: 'index.js',
          name: 'index.js',
          path: 'index.js',
          language: 'javascript',
          version: 8,
          content: `// CodeTrail Cloud Core Entry Point\nconst express = require('express');\nconst app = express();\n\napp.get('/health', (req, res) => {\n  res.json({ status: 'healthy', uptime: process.uptime() });\n});\n\nconst PORT = process.env.PORT || 8080;\nconsole.log('CodeTrail Core Microservice initialized on port', PORT);\n`
        },
        {
          id: 'crypto.js',
          name: 'crypto.js',
          path: 'src/crypto.js',
          language: 'javascript',
          version: 12,
          content: `const crypto = require('crypto');\n\nfunction computeHash(payload, prevHash) {\n  return crypto.createHash('sha256').update(JSON.stringify(payload) + prevHash).digest('hex');\n}\n\nmodule.exports = { computeHash };\n`
        },
        {
          id: 'README.md',
          name: 'README.md',
          path: 'README.md',
          language: 'markdown',
          version: 2,
          content: `# CodeTrail Core Microservice\n\nCollaborative runtime engine featuring SHA-256 telemetry tracking.\n`
        }
      ]
    });

    const workspace2 = await Workspace.create({
      title: '[Demo] Python Distributed Graph Engine',
      description: 'Asynchronous topological sort and Dijkstra pathfinding engine with interactive CLI input.',
      owner: userMap['anistina']._id,
      language: 'python',
      inviteCode: 'ct-pygraph',
      brandColor: '#10B981',
      status: 'active',
      settings: {
        isPublic: true,
        allowAnonymousExecution: true,
        autoSaveInterval: 2500
      },
      members: [
        { user: userMap['anistina']._id, role: 'owner', joinedAt: new Date(Date.now() - 86400000 * 4) },
        { user: userMap['monar']._id, role: 'editor', joinedAt: new Date(Date.now() - 86400000 * 3) },
        { user: userMap['rishika']._id, role: 'editor', joinedAt: new Date(Date.now() - 86400000 * 3) }
      ],
      files: [
        {
          id: 'main.py',
          name: 'main.py',
          path: 'main.py',
          language: 'python',
          version: 5,
          content: `import sys\nfrom collections import deque\n\ndef bfs(graph, start):\n    visited = set()\n    queue = deque([start])\n    while queue:\n        vertex = queue.popleft()\n        if vertex not in visited:\n            visited.add(vertex)\n            queue.extend(graph.get(vertex, []) - visited)\n    return visited\n\nprint("Graph traversal initialized.")\n`
        }
      ]
    });

    const workspace3 = await Workspace.create({
      title: '[Demo] C++ High-Throughput Memory Allocator',
      description: 'Lock-free memory arena allocator with sub-millisecond execution benchmarks.',
      owner: userMap['meet']._id,
      language: 'cpp',
      inviteCode: 'ct-cppalloc',
      brandColor: '#EC4899',
      status: 'active',
      settings: {
        isPublic: false,
        allowAnonymousExecution: false,
        autoSaveInterval: 2500
      },
      members: [
        { user: userMap['meet']._id, role: 'owner', joinedAt: new Date(Date.now() - 86400000 * 2) },
        { user: userMap['manushri']._id, role: 'admin', joinedAt: new Date(Date.now() - 86400000 * 2) }
      ],
      files: [
        {
          id: 'main.cpp',
          name: 'main.cpp',
          path: 'main.cpp',
          language: 'cpp',
          version: 4,
          content: `#include <iostream>\n#include <vector>\n\nint main() {\n    std::cout << "Arena Allocator initialized." << std::endl;\n    std::vector<int> buffer = {1, 2, 3, 4, 5};\n    int sum = 0;\n    for(int n : buffer) sum += n;\n    std::cout << "Checksum: " << sum << std::endl;\n    return 0;\n}\n`
        }
      ]
    });

    console.log(`✔ Inserted 3 collaborative workspaces (JS, Python, C++).\n`);

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. SEED WORKSPACE SESSIONS (Active Presence & Historic Activity)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('⚡ 3. Seeding Real-Time Presence & Multiplayer Sessions...');

    const sessions = await WorkspaceSession.insertMany([
      {
        workspaceId: String(workspace1._id),
        userId: String(userMap['manushri']._id),
        socketId: 'sock_live_manushri_01',
        status: 'online',
        activeFile: 'index.js',
        typingStatus: true,
        lastActive: new Date(),
        enteredAt: new Date(Date.now() - 3600000),
        duration: 3600
      },
      {
        workspaceId: String(workspace1._id),
        userId: String(userMap['maryam']._id),
        socketId: 'sock_live_maryam_02',
        status: 'online',
        activeFile: 'src/crypto.js',
        typingStatus: false,
        lastActive: new Date(),
        enteredAt: new Date(Date.now() - 2400000),
        duration: 2400
      },
      {
        workspaceId: String(workspace1._id),
        userId: String(userMap['observer']._id),
        socketId: 'sock_live_observer_03',
        status: 'online',
        activeFile: 'README.md',
        typingStatus: false,
        lastActive: new Date(),
        enteredAt: new Date(Date.now() - 900000),
        duration: 900
      },
      {
        workspaceId: String(workspace1._id),
        userId: String(userMap['ruchita']._id),
        socketId: null,
        status: 'offline',
        activeFile: 'index.js',
        typingStatus: false,
        lastActive: new Date(Date.now() - 1800000),
        enteredAt: new Date(Date.now() - 7200000),
        duration: 5400
      }
    ]);
    console.log(`✔ Inserted ${sessions.length} workspace session state records.\n`);

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. SEED CODE EXECUTIONS (Success, Stdin, Compile Error, Runtime Error)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('⚙️ 4. Seeding Multi-Language Execution Records & Diagnostics...');

    const executions = await Execution.insertMany([
      {
        workspace: workspace1._id,
        user: userMap['manushri']._id,
        userName: 'Manushri Thakkar',
        filename: 'index.js',
        language: 'javascript',
        code: 'console.log("Hello from CodeTrail Sandbox v2!");\nconsole.log("Benchmark: 10,000 iterations processed.");',
        stdin: '',
        stdout: 'Hello from CodeTrail Sandbox v2!\nBenchmark: 10,000 iterations processed.\n',
        stderr: '',
        status: 'success',
        exitCode: 0,
        executionTimeMs: 42,
        timestamp: new Date(Date.now() - 5400000)
      },
      {
        workspace: workspace1._id,
        user: userMap['maryam']._id,
        userName: 'Maryam Shaikh',
        filename: 'src/crypto.js',
        language: 'javascript',
        code: 'const { computeHash } = require("./crypto");\nconsole.log("SHA-256 test:", computeHash({ key: "val" }, "0".repeat(64)));',
        stdin: '',
        stdout: 'SHA-256 test: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\n',
        stderr: '',
        status: 'success',
        exitCode: 0,
        executionTimeMs: 38,
        timestamp: new Date(Date.now() - 3600000)
      },
      {
        workspace: workspace2._id,
        user: userMap['anistina']._id,
        userName: 'Anistina Dsouza',
        filename: 'main.py',
        language: 'python',
        code: 'num = int(input())\nprint(f"Computed factor: {num * 2.5}")',
        stdin: '42\n',
        stdout: 'Computed factor: 105.0\n',
        stderr: '',
        status: 'success',
        exitCode: 0,
        executionTimeMs: 65,
        timestamp: new Date(Date.now() - 1800000)
      },
      {
        workspace: workspace3._id,
        user: userMap['meet']._id,
        userName: 'Meet Sheth',
        filename: 'main.cpp',
        language: 'cpp',
        code: '#include <iostream>\nint main() { std::cout << MissingSemicolon return 0; }',
        stdin: '',
        stdout: '',
        stderr: 'main.cpp:2:28: error: \'MissingSemicolon\' was not declared in this scope\n    2 | int main() { std::cout << MissingSemicolon return 0; }\n      |                            ^~~~~~~~~~~~~~~~',
        compileOutput: 'Compilation terminated with exit code 1',
        status: 'compile_error',
        exitCode: 1,
        executionTimeMs: 120,
        timestamp: new Date(Date.now() - 900000)
      }
    ]);
    console.log(`✔ Inserted ${executions.length} code execution audit records.\n`);

    // ─────────────────────────────────────────────────────────────────────────────
    // 5. SEED CRYPTOGRAPHIC ACTIVITY LEDGER (Proof-of-Work SHA-256 Hash Chains)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('⛓️ 5. Seeding Cryptographic Activity Logs & SHA-256 Proof-of-Work Blocks...');

    const activityPlan = [
      {
        user: userMap['manushri'],
        role: 'owner',
        action: 'file_create',
        fileId: 'index.js',
        fileName: 'index.js',
        details: 'Initialized root application server entry point',
        add: 45,
        del: 0
      },
      {
        user: userMap['maryam'],
        role: 'admin',
        action: 'file_create',
        fileId: 'src/crypto.js',
        fileName: 'crypto.js',
        details: 'Implemented canonical JSON serializer and SHA-256 hashing utility',
        add: 78,
        del: 2
      },
      {
        user: userMap['ruchita'],
        role: 'editor',
        action: 'code_edit',
        fileId: 'index.js',
        fileName: 'index.js',
        details: 'Added request body limits and security CORS headers',
        add: 22,
        del: 4
      },
      {
        user: userMap['mahi'],
        role: 'editor',
        action: 'code_edit',
        fileId: 'src/crypto.js',
        fileName: 'crypto.js',
        details: 'Optimized hash pointer chain linkage with canonical sort',
        add: 34,
        del: 6
      },
      {
        user: userMap['manushri'],
        role: 'owner',
        action: 'code_execution',
        fileId: 'index.js',
        fileName: 'index.js',
        details: 'Executed microservice health benchmark (42ms, exitCode 0)',
        add: 0,
        del: 0,
        executionId: executions[0]._id,
        executionStatus: 'success'
      },
      {
        user: userMap['maryam'],
        role: 'admin',
        action: 'code_execution',
        fileId: 'src/crypto.js',
        fileName: 'crypto.js',
        details: 'Validated SHA-256 test vector generation (38ms, exitCode 0)',
        add: 0,
        del: 0,
        executionId: executions[1]._id,
        executionStatus: 'success'
      },
      {
        user: userMap['observer'],
        role: 'viewer',
        action: 'member_join',
        fileId: null,
        fileName: null,
        details: 'Joined workspace room in read-only observer capacity',
        add: 0,
        del: 0
      }
    ];

    let currentHash = GENESIS_HASH;
    const baseTimestamp = Date.now() - 7200000;
    const seededActivityDocs = [];

    for (let i = 0; i < activityPlan.length; i++) {
      const plan = activityPlan[i];
      const sequenceNumber = i + 1;
      const timestamp = new Date(baseTimestamp + i * 900000);

      const blockPayload = {
        workspaceId: workspace1._id,
        sequenceNumber,
        previousHash: currentHash,
        timestamp,
        userId: plan.user._id,
        action: plan.action,
        fileId: plan.fileId,
        linesAdded: plan.add,
        linesDeleted: plan.del,
        details: plan.details
      };

      currentHash = computeActivityHash(blockPayload);

      const logDoc = await ActivityLog.create({
        workspaceId: workspace1._id,
        userId: plan.user._id,
        userName: plan.user.name,
        userEmail: plan.user.email,
        userRole: plan.role,
        action: plan.action,
        fileId: plan.fileId,
        fileName: plan.fileName,
        details: plan.details,
        linesAdded: plan.add,
        linesDeleted: plan.del,
        totalLinesChanged: plan.add + plan.del,
        executionId: plan.executionId || null,
        executionStatus: plan.executionStatus || null,
        sequenceNumber,
        previousHash: blockPayload.previousHash,
        currentHash,
        timestamp
      });

      seededActivityDocs.push(logDoc);
    }

    console.log(`✔ Inserted ${seededActivityDocs.length} cryptographically chained ActivityLog blocks.`);

    // ─────────────────────────────────────────────────────────────────────────────
    // 6. CHAIN INTEGRITY AUDIT VERIFICATION
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n🔍 Verifying Cryptographic Chain Integrity...');
    const audit = auditActivityChainIntegrity(seededActivityDocs);
    console.log(`Status: ${audit.status}`);
    console.log(`Integrity Score: ${audit.integrityScore}% (${audit.verifiedBlocks}/${audit.totalBlocks} blocks valid)`);
    console.log(`Chain Fingerprint: ${audit.chainFingerprint}`);

    if (audit.status === '100% Cryptographically Verified') {
      console.log('✔ CRYPTOGRAPHIC PROOF-OF-WORK AUDIT CONFIRMED 100% VALID!\n');
    } else {
      console.error('❌ Chain audit encountered an inconsistency:', audit.errors);
    }

    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('🎉   DATABASE SEEDING COMPLETE: ALL MEANINGFUL RECORDS PERSISTED');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Database Seeding Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection cleanly closed.');
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;

