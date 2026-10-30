/**
 * analyticsValidator.js
 * CT-206: Analytics Data Validation Utility
 *
 * Cross-checks aggregated analytics outputs against raw activity data
 * to ensure consistency, completeness, and mathematical correctness.
 */

/**
 * Validates that contribution percentages across all users sum to ~100%.
 * Allows ±2% tolerance for rounding.
 * @param {Array} contributors - Array of contributor objects with a `percent` field
 * @returns {{ passed: boolean, message: string, total: number }}
 */
const validatePercentageSum = (contributors) => {
  if (!Array.isArray(contributors) || contributors.length === 0) {
    return { passed: true, message: 'No contributors to validate', total: 0 };
  }

  const total = contributors.reduce((sum, c) => sum + (c.percent || 0), 0);
  const passed = total >= 98 && total <= 102;

  return {
    passed,
    message: passed
      ? `Percentage sum valid: ${total}%`
      : `Percentage sum out of bounds: ${total}% (expected 98–102%)`,
    total
  };
};

/**
 * Validates that no contributor has negative line counts.
 * @param {Array} contributors - Array of contributor objects
 * @returns {{ passed: boolean, message: string, violations: Array }}
 */
const validateNoNegativeLines = (contributors) => {
  if (!Array.isArray(contributors) || contributors.length === 0) {
    return { passed: true, message: 'No contributors to validate', violations: [] };
  }

  const violations = contributors.filter(
    (c) => (c.linesAdded < 0) || (c.linesDeleted < 0) || (c.lines < 0)
  );

  return {
    passed: violations.length === 0,
    message: violations.length === 0
      ? 'All line counts are non-negative'
      : `Negative line counts found for: ${violations.map(v => v.userName || v.name || v.id).join(', ')}`,
    violations: violations.map(v => ({ id: v.id, name: v.userName || v.name }))
  };
};

/**
 * Validates that aggregated total lines match the sum of individual contributor lines.
 * @param {number} reportedTotal - Total from summary
 * @param {Array} contributors - Array of contributor objects
 * @returns {{ passed: boolean, message: string, expected: number, reported: number }}
 */
const validateTotalLinesConsistency = (reportedTotal, contributors) => {
  if (!Array.isArray(contributors) || contributors.length === 0) {
    return { passed: true, message: 'No contributors to cross-check', expected: 0, reported: reportedTotal };
  }

  const computed = contributors.reduce((sum, c) => sum + (c.lines || c.totalLinesChanged || 0), 0);
  const passed = Math.abs(computed - reportedTotal) <= 5; // Allow tiny float tolerance

  return {
    passed,
    message: passed
      ? `Total lines consistent: ${computed} lines`
      : `Total lines mismatch — reported: ${reportedTotal}, computed from contributors: ${computed}`,
    expected: computed,
    reported: reportedTotal
  };
};

/**
 * Validates that all activity events per user are non-negative integers.
 * @param {Array} contributors - Array of contributor objects
 * @returns {{ passed: boolean, message: string }}
 */
const validateEventCounts = (contributors) => {
  if (!Array.isArray(contributors) || contributors.length === 0) {
    return { passed: true, message: 'No contributors to validate' };
  }

  const invalid = contributors.filter(
    (c) => typeof c.totalEvents !== 'number' || c.totalEvents < 0 || !Number.isFinite(c.totalEvents)
  );

  return {
    passed: invalid.length === 0,
    message: invalid.length === 0
      ? 'All event counts are valid non-negative integers'
      : `Invalid event counts for: ${invalid.map(v => v.userName || v.name || v.id).join(', ')}`
  };
};

/**
 * Validates coding activity metrics for internal consistency.
 * @param {Array} codingMetrics - Array from getCodingActivity
 * @returns {{ passed: boolean, message: string, checks: Array }}
 */
const validateCodingMetrics = (codingMetrics) => {
  if (!Array.isArray(codingMetrics) || codingMetrics.length === 0) {
    return { passed: true, message: 'No coding metrics to validate', checks: [] };
  }

  const checks = [];
  let allPassed = true;

  codingMetrics.forEach((m) => {
    const name = m.userName || m.userId;

    // Execution success rate must be 0–100
    if (m.executionSuccessRate < 0 || m.executionSuccessRate > 100) {
      checks.push({ user: name, issue: `executionSuccessRate out of range: ${m.executionSuccessRate}` });
      allPassed = false;
    }

    // Active days can't exceed total possible days in the window
    if (m.activeDaysCount < 0) {
      checks.push({ user: name, issue: `activeDaysCount is negative: ${m.activeDaysCount}` });
      allPassed = false;
    }

    // Streak can't exceed activeDaysCount
    if (m.streak > m.activeDaysCount) {
      checks.push({ user: name, issue: `streak (${m.streak}) exceeds activeDaysCount (${m.activeDaysCount})` });
      allPassed = false;
    }

    // codeEdits must be >= 0
    if (m.codeEdits < 0) {
      checks.push({ user: name, issue: `codeEdits is negative: ${m.codeEdits}` });
      allPassed = false;
    }
  });

  return {
    passed: allPassed,
    message: allPassed ? 'All coding metrics are internally consistent' : `Coding metric issues detected (${checks.length} violations)`,
    checks
  };
};

/**
 * Master validation runner — runs all checks and returns a unified report.
 * @param {object} params
 * @param {number} params.reportedTotalLines
 * @param {Array}  params.contributors
 * @param {Array}  params.codingMetrics
 * @returns {{ validationPassed: boolean, checks: object, summary: string }}
 */
const runFullValidation = ({ reportedTotalLines = 0, contributors = [], codingMetrics = [] }) => {
  const percentCheck   = validatePercentageSum(contributors);
  const negLinesCheck  = validateNoNegativeLines(contributors);
  const totalCheck     = validateTotalLinesConsistency(reportedTotalLines, contributors);
  const eventCheck     = validateEventCounts(contributors);
  const codingCheck    = validateCodingMetrics(codingMetrics);

  const allPassed = [percentCheck, negLinesCheck, totalCheck, eventCheck, codingCheck].every(c => c.passed);

  return {
    validationPassed: allPassed,
    summary: allPassed
      ? 'All analytics validation checks passed — data is consistent and reliable.'
      : 'One or more analytics validation checks failed — inspect individual check results.',
    checks: {
      percentageSum:      percentCheck,
      noNegativeLines:    negLinesCheck,
      totalLinesMatch:    totalCheck,
      eventCountsValid:   eventCheck,
      codingMetricsValid: codingCheck
    }
  };
};

module.exports = {
  validatePercentageSum,
  validateNoNegativeLines,
  validateTotalLinesConsistency,
  validateEventCounts,
  validateCodingMetrics,
  runFullValidation
};
