/**
 * reportValidator.js
 * CT-199: Validate Report Content
 * Author: Anistina Dsouza (Lead - Execution & QA / Contribution Reports)
 *
 * Dedicated report validation engine that verifies:
 *   - Structural schema compliance (all required sections present)
 *   - Mathematical consistency (contributor event sums, line count sums, percentages)
 *   - Session duration and timestamp sanity
 *   - Category distribution math
 *   - Cryptographic signature integrity (tamper detection)
 */

const { computeReportSignature } = require('./reportGenerator');

/**
 * Validates top-level report schema
 */
function validateReportSchema(report) {
  const issues = [];
  if (!report || typeof report !== 'object') {
    return { valid: false, issues: ['Report payload is empty or not an object.'] };
  }

  const requiredFields = [
    'reportId',
    'schemaVersion',
    'generatedAt',
    'workspace',
    'executiveSummary',
    'sessionDetails',
    'contributors',
    'activitySummary',
    'forensicAudit',
    'reportHash'
  ];

  requiredFields.forEach(field => {
    if (report[field] === undefined || report[field] === null) {
      issues.push(`Missing required report field: "${field}"`);
    }
  });

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Validates executive summary metrics
 */
function validateExecutiveMetrics(report) {
  const issues = [];
  const exec = report?.executiveSummary;
  if (!exec) return { valid: false, issues: ['executiveSummary is missing'] };

  if (typeof exec.totalEvents !== 'number' || exec.totalEvents < 0) {
    issues.push(`Invalid totalEvents: ${exec.totalEvents}. Must be non-negative integer.`);
  }

  if (typeof exec.totalLinesAdded !== 'number' || exec.totalLinesAdded < 0) {
    issues.push(`Invalid totalLinesAdded: ${exec.totalLinesAdded}. Cannot be negative.`);
  }

  if (typeof exec.totalLinesDeleted !== 'number' || exec.totalLinesDeleted < 0) {
    issues.push(`Invalid totalLinesDeleted: ${exec.totalLinesDeleted}. Cannot be negative.`);
  }

  if (exec.totalLinesChanged !== (exec.totalLinesAdded + exec.totalLinesDeleted)) {
    issues.push(`Line sum mismatch: totalLinesChanged (${exec.totalLinesChanged}) !== totalLinesAdded (${exec.totalLinesAdded}) + totalLinesDeleted (${exec.totalLinesDeleted}).`);
  }

  if (exec.netLines !== (exec.totalLinesAdded - exec.totalLinesDeleted)) {
    issues.push(`Net lines mismatch: netLines (${exec.netLines}) !== totalLinesAdded (${exec.totalLinesAdded}) - totalLinesDeleted (${exec.totalLinesDeleted}).`);
  }

  if (typeof exec.collaborationIndex !== 'number' || exec.collaborationIndex < 0 || exec.collaborationIndex > 100) {
    issues.push(`Invalid collaborationIndex: ${exec.collaborationIndex}. Must be between 0 and 100.`);
  }

  if (typeof exec.executionSuccessRate !== 'number' || exec.executionSuccessRate < 0 || exec.executionSuccessRate > 100) {
    issues.push(`Invalid executionSuccessRate: ${exec.executionSuccessRate}. Must be between 0 and 100.`);
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Validates individual contributor consistency against executive totals
 */
function validateContributorConsistency(report) {
  const issues = [];
  const exec = report?.executiveSummary || {};
  const contribs = report?.contributors;

  if (!Array.isArray(contribs)) {
    return { valid: false, issues: ['contributors must be an array.'] };
  }

  let sumEvents = 0;
  let sumLinesAdded = 0;
  let sumLinesDeleted = 0;
  let sumPercent = 0;

  contribs.forEach((c, idx) => {
    if (!c.userName) issues.push(`Contributor at index ${idx} is missing userName.`);
    if (c.linesAdded < 0) issues.push(`Contributor "${c.userName}" has negative linesAdded: ${c.linesAdded}.`);
    if (c.linesDeleted < 0) issues.push(`Contributor "${c.userName}" has negative linesDeleted: ${c.linesDeleted}.`);
    if (c.totalEvents < 0) issues.push(`Contributor "${c.userName}" has negative totalEvents: ${c.totalEvents}.`);
    if (c.contributionScore < 0) issues.push(`Contributor "${c.userName}" has negative score: ${c.contributionScore}.`);

    sumEvents += (c.totalEvents || 0);
    sumLinesAdded += (c.linesAdded || 0);
    sumLinesDeleted += (c.linesDeleted || 0);
    sumPercent += (c.contributionSharePercent || 0);
  });

  // Check sum consistency
  if (exec.totalEvents > 0 && sumEvents !== exec.totalEvents) {
    issues.push(`Contributor events sum mismatch: sum of contributor events (${sumEvents}) !== executive totalEvents (${exec.totalEvents}).`);
  }

  if (sumLinesAdded !== (exec.totalLinesAdded || 0)) {
    issues.push(`Lines added sum mismatch: sum of contributor linesAdded (${sumLinesAdded}) !== executive totalLinesAdded (${exec.totalLinesAdded}).`);
  }

  if (sumLinesDeleted !== (exec.totalLinesDeleted || 0)) {
    issues.push(`Lines deleted sum mismatch: sum of contributor linesDeleted (${sumLinesDeleted}) !== executive totalLinesDeleted (${exec.totalLinesDeleted}).`);
  }

  // Check percentage sum when total events > 0
  if (exec.totalEvents > 0 && Math.abs(sumPercent - 100) > 1) {
    issues.push(`Contributor share percentage mismatch: sum is ${sumPercent}%, expected ~100%.`);
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Validates session timeline and duration integrity
 */
function validateSessionIntegrity(report) {
  const issues = [];
  const sess = report?.sessionDetails;
  if (!sess) return { valid: false, issues: ['sessionDetails is missing.'] };

  if (sess.startedAt) {
    const start = new Date(sess.startedAt).getTime();
    if (isNaN(start)) issues.push(`Invalid startedAt timestamp: ${sess.startedAt}`);

    if (sess.lastActiveAt) {
      const end = new Date(sess.lastActiveAt).getTime();
      if (isNaN(end)) issues.push(`Invalid lastActiveAt timestamp: ${sess.lastActiveAt}`);
      if (start > end) issues.push(`Session timestamp inversion: startedAt (${sess.startedAt}) is after lastActiveAt (${sess.lastActiveAt}).`);
    }
  }

  if (typeof sess.durationSeconds !== 'number' || sess.durationSeconds < 0) {
    issues.push(`Invalid session duration: ${sess.durationSeconds}. Must be non-negative.`);
  }

  if (typeof sess.activeDurationSeconds === 'number' && sess.activeDurationSeconds > (sess.durationSeconds + 1)) {
    issues.push(`Active duration (${sess.activeDurationSeconds}s) exceeds total session duration (${sess.durationSeconds}s).`);
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Validates activity category mathematical consistency
 */
function validateActivityCategoryMath(report) {
  const issues = [];
  const exec = report?.executiveSummary || {};
  const cat = report?.activitySummary?.categories;
  if (!cat) return { valid: false, issues: ['activitySummary.categories is missing.'] };

  const cCount = cat.coding?.count || 0;
  const fCount = cat.fileOps?.count || 0;
  const eCount = cat.executions?.count || 0;
  const colCount = cat.collaboration?.count || 0;

  const categorySum = cCount + fCount + eCount + colCount;
  if (exec.totalEvents !== undefined && categorySum !== exec.totalEvents) {
    issues.push(`Activity category sum mismatch: ${cCount} (coding) + ${fCount} (fileOps) + ${eCount} (exec) + ${colCount} (collab) = ${categorySum}, but totalEvents is ${exec.totalEvents}.`);
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Validates cryptographic report signature (tamper-proofing)
 */
function validateReportSignature(report) {
  const issues = [];
  if (!report?.reportHash) {
    return { valid: false, issues: ['Report is missing cryptographic signature (reportHash).'] };
  }

  const expectedHash = computeReportSignature(report);
  if (report.reportHash !== expectedHash) {
    issues.push(`Report cryptographic checksum mismatch: Provided hash "${report.reportHash}" does not match recomputed payload hash "${expectedHash}". Content may have been tampered with.`);
  }

  return {
    valid: issues.length === 0,
    issues,
    verifiedHash: expectedHash
  };
}

/**
 * Master Contribution Report Validator (CT-199)
 *
 * Runs all validation rules, returns structured pass/fail results with diagnostics.
 */
function validateReportContent(report) {
  const checks = [
    { name: 'Report Schema Structure', result: validateReportSchema(report) },
    { name: 'Executive Metric Calculations', result: validateExecutiveMetrics(report) },
    { name: 'Contributor Metric Consistency', result: validateContributorConsistency(report) },
    { name: 'Session Duration & Timestamps', result: validateSessionIntegrity(report) },
    { name: 'Activity Category Mathematics', result: validateActivityCategoryMath(report) },
    { name: 'Cryptographic Signature & Integrity', result: validateReportSignature(report) }
  ];

  const errors = [];
  const warnings = [];
  let passedCount = 0;

  const checkSummaries = checks.map(c => {
    const passed = c.result.valid;
    if (passed) passedCount += 1;
    else errors.push(...c.result.issues);

    return {
      checkName: c.name,
      status: passed ? 'PASS' : 'FAIL',
      issues: c.result.issues || []
    };
  });

  const totalChecks = checks.length;
  const score = Math.round((passedCount / totalChecks) * 100);
  const isValid = passedCount === totalChecks;

  return {
    isValid,
    score,
    totalChecks,
    passedChecks: passedCount,
    failedChecks: totalChecks - passedCount,
    status: isValid ? 'VALIDATED' : 'TAMPER_OR_INVALID',
    verifiedAt: new Date().toISOString(),
    checks: checkSummaries,
    errors,
    warnings
  };
}

module.exports = {
  validateReportSchema,
  validateExecutiveMetrics,
  validateContributorConsistency,
  validateSessionIntegrity,
  validateActivityCategoryMath,
  validateReportSignature,
  validateReportContent
};
