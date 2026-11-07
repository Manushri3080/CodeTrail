console.log('====================================================');
console.log('🚀 CODETRAIL MODULE 5 & 6 AUDIT & ANALYTICS TEST SUITE');
console.log('====================================================\n');

require('./proofOfWork.test');
require('./activityController.test');
require('./telemetrySync.test');
require('./integrityAuditor.test');

// CT-197: Contribution Analytics Tests
require('./analytics.test');

// CT-198 & CT-201: Session Analytics & Analytics Validation Tests
require('./sessionAnalytics.test');

// CT-199: Generate Contribution Reports Tests (Anistina Dsouza)
require('./contributionReport.test');

// Workspace Visibility, Creation & Dashboard Regression Tests (Meet Sheth)
require('./workspaceRegression.test');

(async () => {
  // Backend Runtime Bug Fixes & Workflow Verification Tests
  await require('./runtimeFixes.test');

  // CT-233: Cross-Workspace History Aggregation Tests (Manushri)
  await require('./crossWorkspaceHistory.test');

  // CT-235 & CT-236: Search, Filter Engine & Dashboard Integration Tests (Monar)
  await require('./searchFilterIntegration.test');

  console.log('✅ ALL TEST SUITES COMPLETED WITH 100% SUCCESS.\n');
})().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
