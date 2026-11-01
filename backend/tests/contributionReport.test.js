/**
 * contributionReport.test.js
 * CT-199: Generate Contribution Reports Unit Test Suite
 * Author: Anistina Dsouza (Lead - Execution & QA / Contribution Reports)
 *
 * Tests covering:
 *   - Empty workspace edge cases & graceful defaults
 *   - Single contributor report metrics and 100% share normalization
 *   - Multi-contributor activity distribution, ranking, and badge assignment
 *   - Session details incorporation (timestamps, durations, active vs idle)
 *   - Activity category distribution & file touches aggregation
 *   - Report Content Validator (schema, metric math, duration sanity)
 *   - Cryptographic signature generation & tamper detection
 *   - Markdown and HTML export format generation
 *   - Custom report generation with timeframe and participant filtering
 */

const assert = require('assert');
const {
  generateContributionReport,
  generateReportId,
  computeReportSignature,
  calculateCollaborationIndex,
  assignContributorBadge,
  formatDuration,
  formatReportAsMarkdown,
  formatReportAsHtml
} = require('../utils/reportGenerator');
const {
  validateReportSchema,
  validateExecutiveMetrics,
  validateContributorConsistency,
  validateSessionIntegrity,
  validateActivityCategoryMath,
  validateReportSignature,
  validateReportContent
} = require('../utils/reportValidator');

console.log('\n═══════════════════════════════════════════════════════════════════════════');
console.log('📊   CODETRAIL CT-199: GENERATE CONTRIBUTION REPORTS TEST SUITE');
console.log('    Lead: Anistina Dsouza (Execution & QA / Contribution Reports Lead)');
console.log('═══════════════════════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: Empty Workspace Edge Cases
// ─────────────────────────────────────────────────────────────────────────────
console.log('▶ Test Section 1: Empty Workspace Edge Cases & Safe Defaults\n');

{
  const emptyReport = generateContributionReport({
    workspace: { _id: 'ws_empty_01', title: 'Empty Workspace', language: 'python' },
    activityLogs: [],
    sessions: []
  });

  assert.strictEqual(emptyReport.executiveSummary.totalEvents, 0, 'Total events should be 0');
  assert.strictEqual(emptyReport.executiveSummary.totalLinesAdded, 0, 'Lines added should be 0');
  assert.strictEqual(emptyReport.executiveSummary.totalExecutions, 0, 'Executions should be 0');
  assert.strictEqual(emptyReport.executiveSummary.executionSuccessRate, 0, 'Success rate should be 0% without divide-by-zero');
  assert.strictEqual(emptyReport.executiveSummary.collaborationIndex, 0, 'Collaboration index should be 0');
  assert.strictEqual(emptyReport.sessionDetails.status, 'idle', 'Status should be idle');
  assert.ok(emptyReport.reportId.startsWith('CTR-'), 'Report ID should have CTR- prefix');
  assert.ok(emptyReport.reportHash, 'Report should be cryptographically signed');

  // Validate empty report
  const validation = validateReportContent(emptyReport);
  assert.strictEqual(validation.isValid, true, 'Empty report should pass validation checks');
  console.log('  ✔ [PASS] Empty workspace gracefully handled: 0 events, 0s duration, valid signature');
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: Single Contributor Report Generation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 2: Single Contributor Report & Metric Consistency\n');

{
  const baseTime = new Date('2026-11-01T10:00:00.000Z');
  const logs = [
    {
      userId: 'user_alice',
      userName: 'Alice Developer',
      userEmail: 'alice@codetrail.io',
      userRole: 'editor',
      action: 'code_edit',
      linesAdded: 50,
      linesDeleted: 10,
      totalLinesChanged: 60,
      timestamp: new Date(baseTime.getTime() + 10000).toISOString(),
      currentHash: 'hash_01',
      previousHash: '0000000000000000000000000000000000000000000000000000000000000000'
    },
    {
      userId: 'user_alice',
      userName: 'Alice Developer',
      userEmail: 'alice@codetrail.io',
      userRole: 'editor',
      action: 'code_execution',
      linesAdded: 0,
      linesDeleted: 0,
      executionStatus: 'success',
      timestamp: new Date(baseTime.getTime() + 60000).toISOString(),
      currentHash: 'hash_02',
      previousHash: 'hash_01'
    }
  ];

  const singleReport = generateContributionReport({
    workspace: { _id: 'ws_single_01', title: 'Single Dev Project', language: 'javascript' },
    activityLogs: logs,
    sessions: [{ userId: 'user_alice', status: 'online', joinedAt: baseTime.toISOString() }]
  });

  const exec = singleReport.executiveSummary;
  assert.strictEqual(exec.totalEvents, 2, 'Total events should be 2');
  assert.strictEqual(exec.totalLinesAdded, 50, 'Total lines added should be 50');
  assert.strictEqual(exec.totalLinesDeleted, 10, 'Total lines deleted should be 10');
  assert.strictEqual(exec.netLines, 40, 'Net lines should be 40');
  assert.strictEqual(exec.totalExecutions, 1, 'Total executions should be 1');
  assert.strictEqual(exec.successfulExecutions, 1, 'Successful executions should be 1');
  assert.strictEqual(exec.executionSuccessRate, 100, 'Execution success rate should be 100%');

  const contributor = singleReport.contributors.find(c => c.userId === 'user_alice');
  assert.ok(contributor, 'Alice should be found in contributors');
  assert.strictEqual(contributor.contributionSharePercent, 100, 'Single contributor must have 100% share');
  assert.strictEqual(contributor.linesAdded, 50, 'Contributor lines added must match');

  const validation = validateReportContent(singleReport);
  assert.strictEqual(validation.isValid, true, 'Single contributor report should pass validation');
  console.log('  ✔ [PASS] Single contributor report accurately computed: 100% share, 100% execution success');
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: Multi-Contributor Activity Distribution & Ranking
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 3: Multi-Contributor Ranking, Distribution & Badges\n');

{
  const t0 = new Date('2026-11-01T12:00:00.000Z');
  const logs = [
    // Alice: 3 edits, 1 execution (success), lines: 120 / 20
    { userId: 'u_alice', userName: 'Alice', userRole: 'owner', action: 'code_edit', linesAdded: 60, linesDeleted: 10, timestamp: new Date(t0.getTime() + 1000) },
    { userId: 'u_alice', userName: 'Alice', userRole: 'owner', action: 'code_edit', linesAdded: 60, linesDeleted: 10, timestamp: new Date(t0.getTime() + 2000) },
    { userId: 'u_alice', userName: 'Alice', userRole: 'owner', action: 'code_execution', executionStatus: 'success', timestamp: new Date(t0.getTime() + 3000) },

    // Bob: 2 edits, lines: 40 / 5
    { userId: 'u_bob', userName: 'Bob', userRole: 'editor', action: 'code_edit', linesAdded: 20, linesDeleted: 2, timestamp: new Date(t0.getTime() + 4000) },
    { userId: 'u_bob', userName: 'Bob', userRole: 'editor', action: 'code_edit', linesAdded: 20, linesDeleted: 3, timestamp: new Date(t0.getTime() + 5000) },

    // Charlie: 1 file create
    { userId: 'u_charlie', userName: 'Charlie', userRole: 'editor', action: 'file_create', fileName: 'utils.js', timestamp: new Date(t0.getTime() + 6000) }
  ];

  const report = generateContributionReport({
    workspace: {
      _id: 'ws_team_01',
      title: 'Full Stack App',
      owner: { _id: 'u_alice', name: 'Alice', email: 'alice@codetrail.io' },
      members: [
        { user: { _id: 'u_bob', name: 'Bob', email: 'bob@codetrail.io' }, role: 'editor' },
        { user: { _id: 'u_charlie', name: 'Charlie', email: 'charlie@codetrail.io' }, role: 'editor' }
      ]
    },
    activityLogs: logs
  });

  assert.strictEqual(report.contributors.length, 3, 'Should have 3 contributors');
  assert.strictEqual(report.executiveSummary.totalEvents, 6, 'Total events should be 6');

  // Check ranking (Alice highest score)
  assert.strictEqual(report.contributors[0].userId, 'u_alice', 'Alice should be #1 contributor');
  assert.strictEqual(report.contributors[0].badge, 'Lead Architect', 'Owner gets Lead Architect badge');

  // Verify percentage share sum equals 100%
  const totalPercent = report.contributors.reduce((sum, c) => sum + c.contributionSharePercent, 0);
  assert.strictEqual(totalPercent, 100, `Contribution percentages must sum strictly to 100%, got ${totalPercent}%`);

  const validation = validateReportContent(report);
  assert.strictEqual(validation.isValid, true, 'Multi-contributor report must pass all validation checks');
  console.log('  ✔ [PASS] Multi-contributor ranking and 100% share sum verified (Alice > Bob > Charlie)');
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 4: Session Details Incorporation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 4: Session Details & Duration Formatting\n');

{
  const start = new Date('2026-11-01T14:00:00.000Z');
  const end = new Date('2026-11-01T16:30:15.000Z'); // 2h 30m 15s = 9015 seconds

  const logs = [
    { userId: 'u1', userName: 'Dev 1', action: 'code_edit', linesAdded: 10, linesDeleted: 0, timestamp: start.toISOString() },
    { userId: 'u1', userName: 'Dev 1', action: 'code_edit', linesAdded: 5, linesDeleted: 2, timestamp: end.toISOString() }
  ];

  const report = generateContributionReport({
    workspace: { _id: 'ws_sess_01', title: 'Session Test' },
    activityLogs: logs,
    sessions: [
      { userId: 'u1', status: 'online', joinedAt: start.toISOString() }
    ]
  });

  const sess = report.sessionDetails;
  assert.strictEqual(sess.durationSeconds, 9015, 'Duration seconds should be 9015');
  assert.strictEqual(sess.durationFormatted, '2h 30m 15s', 'Formatted duration should match 2h 30m 15s');
  assert.strictEqual(sess.status, 'active', 'Session should be marked active with online user');
  assert.strictEqual(sess.activeSessionsCount, 1, 'Active session count should be 1');

  // Test formatDuration helper directly
  assert.strictEqual(formatDuration(45), '45s');
  assert.strictEqual(formatDuration(125), '2m 5s');
  assert.strictEqual(formatDuration(3665), '1h 1m 5s');

  console.log('  ✔ [PASS] Session duration correctly parsed and formatted (2h 30m 15s)');
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 5: Activity Summaries & Category Mathematics
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 5: Activity Summaries & Category Mathematics\n');

{
  const logs = [
    { action: 'code_edit', linesAdded: 10, linesDeleted: 0, fileName: 'App.jsx' },
    { action: 'code_edit', linesAdded: 20, linesDeleted: 5, fileName: 'App.jsx' },
    { action: 'file_create', fileName: 'Header.jsx' },
    { action: 'file_delete', fileName: 'OldNav.jsx' },
    { action: 'code_execution', executionStatus: 'success' },
    { action: 'code_execution', executionStatus: 'error' },
    { action: 'member_join' },
    { action: 'role_change' }
  ];

  const report = generateContributionReport({
    workspace: { _id: 'ws_cat_01', title: 'Category Test' },
    activityLogs: logs
  });

  const cat = report.activitySummary.categories;
  assert.strictEqual(cat.coding.count, 2, 'Coding count should be 2');
  assert.strictEqual(cat.fileOps.count, 2, 'File ops count should be 2');
  assert.strictEqual(cat.executions.count, 2, 'Executions count should be 2');
  assert.strictEqual(cat.collaboration.count, 2, 'Collaboration count should be 2');

  const totalCatEvents = cat.coding.count + cat.fileOps.count + cat.executions.count + cat.collaboration.count;
  assert.strictEqual(totalCatEvents, 8, 'Sum of categories must strictly equal total events (8)');

  // Verify top files
  const topFiles = report.activitySummary.topFiles;
  assert.strictEqual(topFiles[0].file, 'App.jsx', 'App.jsx should be top file');
  assert.strictEqual(topFiles[0].count, 2, 'App.jsx should have 2 touches');

  console.log('  ✔ [PASS] Category mathematics strictly consistent: coding + fileOps + exec + collab = 8');
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 6: Report Content Validator Suite
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 6: Report Content Validator Rules\n');

{
  // Valid report test
  const validReport = generateContributionReport({
    workspace: { _id: 'ws_val_01', title: 'Validator Workspace' },
    activityLogs: [
      { userId: 'u1', userName: 'Dev', action: 'code_edit', linesAdded: 15, linesDeleted: 5 }
    ]
  });

  const vResult = validateReportContent(validReport);
  assert.strictEqual(vResult.isValid, true, 'Well-formed report must pass all checks');
  assert.strictEqual(vResult.score, 100, 'Score should be 100%');
  assert.strictEqual(vResult.failedChecks, 0, 'Zero failed checks expected');

  // Test corrupted metrics detection (line sum discrepancy)
  const corruptedLinesReport = JSON.parse(JSON.stringify(validReport));
  corruptedLinesReport.executiveSummary.totalLinesChanged = 999; // Corrupted
  const lineCheck = validateExecutiveMetrics(corruptedLinesReport);
  assert.strictEqual(lineCheck.valid, false, 'Line mismatch should be flagged');
  assert.ok(lineCheck.issues[0].includes('Line sum mismatch'), 'Should diagnose line sum mismatch');

  // Test negative contributor metrics
  const corruptedContributorReport = JSON.parse(JSON.stringify(validReport));
  corruptedContributorReport.contributors[0].linesAdded = -50;
  const contribCheck = validateContributorConsistency(corruptedContributorReport);
  assert.strictEqual(contribCheck.valid, false, 'Negative lines should be rejected');

  // Test timestamp inversion
  const invertedTimeReport = JSON.parse(JSON.stringify(validReport));
  invertedTimeReport.sessionDetails.startedAt = '2026-11-01T15:00:00.000Z';
  invertedTimeReport.sessionDetails.lastActiveAt = '2026-11-01T12:00:00.000Z'; // Inverted
  const timeCheck = validateSessionIntegrity(invertedTimeReport);
  assert.strictEqual(timeCheck.valid, false, 'Inverted timestamps must be rejected');

  console.log('  ✔ [PASS] Report Content Validator successfully flags corrupted lines, negative values, and timestamp inversions');
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 7: Tamper Detection & Cryptographic Signature
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 7: Cryptographic Tamper Detection (SHA-256 Checksum)\n');

{
  const report = generateContributionReport({
    workspace: { _id: 'ws_crypto_01', title: 'Cryptographic Test' },
    activityLogs: [
      { userId: 'u1', userName: 'Auditor', action: 'code_edit', linesAdded: 100, linesDeleted: 10 }
    ]
  });

  // Untampered report
  const sigCheckValid = validateReportSignature(report);
  assert.strictEqual(sigCheckValid.valid, true, 'Untampered report signature must be valid');

  // Tamper with score
  const tamperedReport = JSON.parse(JSON.stringify(report));
  tamperedReport.contributors[0].contributionScore = 999999; // Forged score
  const sigCheckTampered = validateReportSignature(tamperedReport);
  assert.strictEqual(sigCheckTampered.valid, false, 'Tampered report must fail signature verification');
  assert.ok(sigCheckTampered.issues[0].includes('checksum mismatch'), 'Diagnostic message must mention checksum mismatch');

  console.log('  ✔ [PASS] SHA-256 signature verification validates authentic report and detects forged payload');
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 8: Markdown & HTML Formatted Output Generation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 8: Markdown & HTML Output Layout Generation\n');

{
  const report = generateContributionReport({
    workspace: { _id: 'ws_layout_01', title: 'Layout Showcase' },
    activityLogs: [
      { userId: 'u_anistina', userName: 'Anistina Dsouza', action: 'code_edit', linesAdded: 150, linesDeleted: 20 },
      { userId: 'u_anistina', userName: 'Anistina Dsouza', action: 'code_execution', executionStatus: 'success' }
    ]
  });

  const markdown = formatReportAsMarkdown(report);
  assert.ok(markdown.includes('# 📊 CodeTrail Contribution Report — Layout Showcase'), 'Markdown should have report header');
  assert.ok(markdown.includes('Anistina Dsouza'), 'Markdown should list Anistina Dsouza');
  assert.ok(markdown.includes('Executive Summary'), 'Markdown should contain Executive Summary');
  assert.ok(markdown.includes('Forensic Chain Audit'), 'Markdown should contain Forensic Chain Audit');

  const html = formatReportAsHtml(report);
  assert.ok(html.includes('<!DOCTYPE html>'), 'HTML output should be a complete document');
  assert.ok(html.includes('@media print'), 'HTML output should include print stylesheet');
  assert.ok(html.includes('Layout Showcase'), 'HTML output should contain workspace title');

  console.log('  ✔ [PASS] Markdown and standalone HTML layouts generated cleanly with publication-ready styling');
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 9: Custom Timeframe & Participant Filtering
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Test Section 9: Custom Report Filtering (Timeframe & Participants)\n');

{
  const now = new Date();
  const recentLog = {
    userId: 'u1',
    userName: 'Recent Dev',
    action: 'code_edit',
    linesAdded: 25,
    linesDeleted: 0,
    timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString() // 2h ago
  };

  const oldLog = {
    userId: 'u2',
    userName: 'Old Dev',
    action: 'code_edit',
    linesAdded: 50,
    linesDeleted: 10,
    timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString() // 48h ago
  };

  // Filter 24h: only recentLog should be included
  const report24h = generateContributionReport({
    workspace: { _id: 'ws_filter_01', title: 'Filter Test' },
    activityLogs: [recentLog, oldLog],
    options: { timeRange: '24h' }
  });

  assert.strictEqual(report24h.executiveSummary.totalEvents, 1, 'Only 1 event should fall within 24h');
  assert.strictEqual(report24h.executiveSummary.totalLinesAdded, 25, 'Lines added should only be from recent log (25)');

  // Filter by participant
  const reportUserFilter = generateContributionReport({
    workspace: { _id: 'ws_filter_01', title: 'Filter Test' },
    activityLogs: [recentLog, oldLog],
    options: { participantIds: ['u2'] }
  });

  assert.strictEqual(reportUserFilter.executiveSummary.totalEvents, 1, 'Only u2 event should be included');
  assert.strictEqual(reportUserFilter.executiveSummary.totalLinesAdded, 50, 'Lines added should be 50');

  console.log('  ✔ [PASS] Timeframe (24h) and participant filtering accurately isolates target records');
}

console.log('\n═══════════════════════════════════════════════════════════════════════════');
console.log('🎉   ALL CT-199 CONTRIBUTION REPORT TESTS PASSED WITH 100% SUCCESS!');
console.log('     Section 1 (Empty Workspace Defaults):     ✔');
console.log('     Section 2 (Single Contributor Report):    ✔');
console.log('     Section 3 (Multi-Contributor Ranking):    ✔');
console.log('     Section 4 (Session Details Integration):  ✔');
console.log('     Section 5 (Activity Summaries Math):      ✔');
console.log('     Section 6 (Report Content Validator):     ✔');
console.log('     Section 7 (Tamper Detection SHA-256):     ✔');
console.log('     Section 8 (Markdown & HTML Export):       ✔');
console.log('     Section 9 (Custom Filters & Options):     ✔');
console.log('═══════════════════════════════════════════════════════════════════════════\n');
