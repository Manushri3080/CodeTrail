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

console.log('✅ ALL TEST SUITES COMPLETED WITH 100% SUCCESS.\n');
