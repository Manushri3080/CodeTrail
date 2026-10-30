console.log('====================================================');
console.log('🚀 CODETRAIL MODULE 5: PROOF-OF-WORK AUDIT TEST SUITE');
console.log('====================================================\n');

require('./proofOfWork.test');
require('./activityController.test');
require('./telemetrySync.test');
require('./integrityAuditor.test');

// CT-197: Contribution Analytics Tests
require('./analytics.test');

console.log('✅ ALL TEST SUITES COMPLETED WITH 100% SUCCESS.\n');
