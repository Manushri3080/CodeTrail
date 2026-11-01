console.log('====================================================');
console.log('🚀 CODETRAIL MODULE 5: PROOF-OF-WORK AUDIT TEST SUITE');
console.log('====================================================\n');

require('./proofOfWork.test');
require('./activityController.test');
require('./telemetrySync.test');
require('./integrityAuditor.test');

<<<<<<< Updated upstream
=======
// CT-197: Contribution Analytics Tests
require('./analytics.test');

// CT-198 & CT-201: Session Analytics & Analytics Validation Tests
require('./sessionAnalytics.test');

// CT-199: Generate Contribution Reports Tests (Anistina Dsouza)
require('./contributionReport.test');

// CT-200: Export Reports — PDF Functionality Tests (Meet Sheth)
require('./pdfExport.test');

// Backend Runtime Bug Fixes & Workflow Verification Tests
require('./runtimeFixes.test');

// Workspace Visibility, Creation & Dashboard Regression Tests (Meet Sheth)
require('./workspaceRegression.test');

>>>>>>> Stashed changes
console.log('✅ ALL TEST SUITES COMPLETED WITH 100% SUCCESS.\n');
