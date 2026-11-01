console.log('====================================================');
console.log('🚀 CODETRAIL MODULE 5 & 6 AUDIT & ANALYTICS TEST SUITE');
console.log('====================================================\n');

require('./proofOfWork.test');
require('./activityController.test');
require('./telemetrySync.test');
require('./integrityAuditor.test');

<<<<<<< HEAD
=======
<<<<<<< Updated upstream
=======
>>>>>>> features/meet
// CT-197: Contribution Analytics Tests
require('./analytics.test');

// CT-198 & CT-201: Session Analytics & Analytics Validation Tests
require('./sessionAnalytics.test');

// CT-199: Generate Contribution Reports Tests (Anistina Dsouza)
require('./contributionReport.test');

<<<<<<< HEAD
=======
// CT-200: Export Reports — PDF Functionality Tests (Meet Sheth)
require('./pdfExport.test');

// Backend Runtime Bug Fixes & Workflow Verification Tests
require('./runtimeFixes.test');

// Workspace Visibility, Creation & Dashboard Regression Tests (Meet Sheth)
require('./workspaceRegression.test');

>>>>>>> Stashed changes
>>>>>>> features/meet
console.log('✅ ALL TEST SUITES COMPLETED WITH 100% SUCCESS.\n');
