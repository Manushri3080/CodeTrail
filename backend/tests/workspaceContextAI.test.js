/**
 * workspaceContextAI.test.js
 * Test Suite: Workspace Context & AI Knowledge Engine
 * 
 * Tests:
 *   1. File retrieval & indexing.
 *   2. Code chunking with line spans & overlaps.
 *   3. Symbol and dependency extraction (imports, functions, classes, exports).
 *   4. Lexical keyword scoring & relevance ranking.
 *   5. Context token budgeting & truncation for large workspaces.
 *   6. Dynamic index cache invalidation on file modification.
 *   7. Formatted file and line-range reference injection into AI prompt.
 */

const assert = require('assert');
const workspaceContextService = require('../services/workspaceContextService');
const aiService = require('../services/aiService');

const mockFiles = [
  {
    id: 'f1',
    name: 'authController.js',
    path: 'backend/controllers/authController.js',
    language: 'javascript',
    content: `const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

function registerUser(req, res) {
  const { email, password } = req.body;
  // hash password and create user
  return res.status(201).json({ message: 'User created' });
}

function loginUser(req, res) {
  const { email, password } = req.body;
  // authenticate user
  return res.status(200).json({ token: 'jwt-token-123' });
}

module.exports = { registerUser, loginUser };`
  },
  {
    id: 'f2',
    name: 'activityController.js',
    path: 'backend/controllers/activityController.js',
    language: 'javascript',
    content: `const crypto = require('crypto');
const ActivityLog = require('../models/ActivityLog');

function recordActivity({ workspaceId, action, details, linesAdded, linesDeleted }) {
  const hash = crypto.createHash('sha256').update(details).digest('hex');
  return { sequenceNumber: 1, currentHash: hash, action };
}

function verifyActivityChain(activities) {
  return { isValid: true, verifiedBlocks: activities.length };
}

module.exports = { recordActivity, verifyActivityChain };`
  },
  {
    id: 'f3',
    name: 'main.py',
    path: 'scripts/main.py',
    language: 'python',
    content: `import sys
import os

def calculate_fibonacci(n):
    if n <= 1:
        return n
    return calculate_fibonacci(n - 1) + calculate_fibonacci(n - 2)

class DataProcessor:
    def process(self, data):
        return [x * 2 for x in data]

if __name__ == '__main__':
    print(calculate_fibonacci(10))`
  }
];

async function runTests() {
  console.log('🧪 Starting Workspace Context & AI Knowledge Test Suite...\n');

  // Test 1: Symbol Extraction
  console.log('Test 1: Symbol & Dependency Extraction');
  const jsSymbols = workspaceContextService.extractSymbols(mockFiles[0].content, 'javascript');
  assert(jsSymbols.includes('dep:jsonwebtoken'), 'Should detect jsonwebtoken import');
  assert(jsSymbols.includes('fn:registerUser'), 'Should detect registerUser function');
  assert(jsSymbols.includes('fn:loginUser'), 'Should detect loginUser function');

  const pySymbols = workspaceContextService.extractSymbols(mockFiles[2].content, 'python');
  assert(pySymbols.includes('dep:sys'), 'Should detect python sys import');
  assert(pySymbols.includes('fn:calculate_fibonacci'), 'Should detect python function');
  assert(pySymbols.includes('class:DataProcessor'), 'Should detect python class');
  console.log('  ✔ Symbols and dependencies extracted accurately for JS and Python.\n');

  // Test 2: Code Chunking with Line Numbers
  console.log('Test 2: Code Chunking and Line Range Boundaries');
  const chunks = workspaceContextService.chunkFile(mockFiles[0]);
  assert(chunks.length >= 1, 'File should produce at least one chunk');
  assert.strictEqual(chunks[0].startLine, 1, 'Chunk should begin at line 1');
  assert(chunks[0].endLine > 1, 'Chunk should span multiple lines');
  assert.strictEqual(chunks[0].fileName, 'authController.js', 'Chunk should record fileName');
  console.log('  ✔ Chunking preserves accurate line-range coordinates.\n');

  // Test 3: Workspace Retrieval & Relevance Ranking
  console.log('Test 3: Workspace Retrieval for Specific Query');
  const authRetrieval = await workspaceContextService.retrieveWorkspaceContext({
    workspaceId: 'test_ws_1',
    query: 'How does registerUser handle authentication and passwords?',
    files: mockFiles
  });

  assert(authRetrieval.chunks.length > 0, 'Should find relevant chunks');
  assert(authRetrieval.chunks[0].fileName.includes('authController'), 'Highest scoring chunk should be authController');
  assert(authRetrieval.references.some(r => r.file.includes('authController')), 'Should include file reference');
  console.log('  ✔ Query correctly matched authController.js as top relevant chunk.\n');

  // Test 4: Cross-Module Search (Activity & Chain Verification)
  console.log('Test 4: Cross-Module Symbol Query (recordActivity)');
  const activityRetrieval = await workspaceContextService.retrieveWorkspaceContext({
    workspaceId: 'test_ws_1',
    query: 'Where is recordActivity implemented to hash blocks?',
    files: mockFiles
  });

  assert(activityRetrieval.chunks.length > 0, 'Should find chunks for recordActivity');
  assert(activityRetrieval.chunks[0].fileName.includes('activityController'), 'Top chunk should be activityController.js');
  assert(activityRetrieval.formattedContext.includes('Reference 1: backend/controllers/activityController.js'), 'Formatted context should contain header reference');
  console.log('  ✔ Found and formatted activityController.js context with line spans.\n');

  // Test 5: Token Budget Truncation on Large Content
  console.log('Test 5: Large Workspace Budget Guard');
  const largeMockFiles = [];
  for (let i = 0; i < 20; i++) {
    largeMockFiles.push({
      id: `large_f_${i}`,
      name: `module_${i}.js`,
      path: `src/module_${i}.js`,
      language: 'javascript',
      content: `// Module ${i}\nfunction computeMetric_${i}() { return ${i} * 42; }\n`.repeat(50)
    });
  }

  const budgetRetrieval = await workspaceContextService.retrieveWorkspaceContext({
    workspaceId: 'test_ws_large',
    query: 'computeMetric across modules',
    files: largeMockFiles
  });

  assert(budgetRetrieval.chunks.length <= workspaceContextService.CONFIG.MAX_CHUNKS_PER_QUERY, 'Should not exceed max chunk limit');
  let totalChars = budgetRetrieval.chunks.reduce((acc, c) => acc + c.charCount, 0);
  assert(totalChars <= workspaceContextService.CONFIG.MAX_CONTEXT_CHARS + 2000, 'Context character size must adhere to budget');
  console.log(`  ✔ Budget safely restricted context to ${budgetRetrieval.chunks.length} chunks (${totalChars} chars).\n`);

  // Test 6: Cache Invalidation
  console.log('Test 6: Dynamic Cache Invalidation');
  await workspaceContextService.indexWorkspaceFiles('test_inval_ws', mockFiles);
  workspaceContextService.invalidateWorkspaceIndex('test_inval_ws');
  // Re-indexing works cleanly after invalidation
  const reindexed = await workspaceContextService.indexWorkspaceFiles('test_inval_ws', mockFiles);
  assert(reindexed.length > 0, 'Re-indexing after invalidation should produce valid chunks');
  console.log('  ✔ Index cache invalidation operates cleanly on file updates.\n');

  // Test 7: End-to-End AI Service Integration with Citations
  console.log('Test 7: End-to-End AI Service with Source Citations');
  const aiResponse = await aiService.generateAIResponse({
    message: 'Explain how recordActivity works in this workspace',
    workspaceId: 'test_ws_1',
    files: mockFiles
  });

  assert(aiResponse.success === true, 'AI response should succeed');
  assert(Array.isArray(aiResponse.references), 'AI response should return references array');
  assert(aiResponse.references.length > 0, 'Should return at least 1 file reference');
  assert(aiResponse.references.some((r) => String(r?.fileName || '').toLowerCase().includes('activitycontroller')) || aiResponse.response.includes('activityController'), 'Response/references should cite relevant files');
  console.log('  ✔ AI response successfully synthesized answer with source citations.\n');

  console.log('======================================================================');
  console.log('🎉 ALL 7 WORKSPACE CONTEXT & AI KNOWLEDGE TESTS PASSED PERFECTLY!');
  console.log('======================================================================\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
