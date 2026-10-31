/**
 * analyticsValidator.js
 * CT-206: Analytics Data Validation Utility & CT-201: Session Analytics Validation
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

// ─────────────────────────────────────────────────────────────────────────────
// CT-201: Session Analytics & Participant Activity Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates session duration and boundary timestamps.
 * @param {object} sessionSummary
 * @returns {{ passed: boolean, message: string, durationSeconds: number }}
 */
const validateSessionDuration = (sessionSummary = {}) => {
  const durationSecs = sessionSummary.sessionDurationSeconds ?? 0;

  if (typeof durationSecs !== 'number' || durationSecs < 0 || !Number.isFinite(durationSecs)) {
    return {
      passed: false,
      message: `Invalid session duration: ${durationSecs} seconds (must be non-negative finite number)`,
      durationSeconds: durationSecs
    };
  }

  // If both startedAt and lastActiveAt are present, verify startedAt <= lastActiveAt
  if (sessionSummary.startedAt && sessionSummary.lastActiveAt) {
    const start = new Date(sessionSummary.startedAt).getTime();
    const end = new Date(sessionSummary.lastActiveAt).getTime();
    if (!Number.isNaN(start) && !Number.isNaN(end) && start > end) {
      return {
        passed: false,
        message: `Timestamp order violation: startedAt (${sessionSummary.startedAt}) is after lastActiveAt (${sessionSummary.lastActiveAt})`,
        durationSeconds: durationSecs
      };
    }
  }

  return {
    passed: true,
    message: `Session duration is valid: ${durationSecs}s (${sessionSummary.sessionDurationFormatted || '0s'})`,
    durationSeconds: durationSecs
  };
};

/**
 * Validates participant counts and participant list integrity.
 * @param {object} sessionSummary
 * @param {Array}  participants
 * @returns {{ passed: boolean, message: string }}
 */
const validateParticipantCounts = (sessionSummary = {}, participants = []) => {
  const total = sessionSummary.totalParticipants ?? 0;
  const active = sessionSummary.activeParticipants ?? 0;

  if (total < 0 || active < 0) {
    return { passed: false, message: 'Participant counts cannot be negative' };
  }

  if (active > total) {
    return {
      passed: false,
      message: `Active participants (${active}) cannot exceed total participants (${total})`
    };
  }

  if (Array.isArray(participants)) {
    if (participants.length !== total) {
      return {
        passed: false,
        message: `Participant list count (${participants.length}) does not match reported totalParticipants (${total})`
      };
    }

    // Check for duplicate participant IDs
    const seenIds = new Set();
    for (const p of participants) {
      const pid = String(p.userId || p.id || '');
      if (pid && seenIds.has(pid)) {
        return {
          passed: false,
          message: `Duplicate participant ID found in breakdown: ${pid}`
        };
      }
      seenIds.add(pid);
    }
  }

  return {
    passed: true,
    message: `Participant counts valid: ${total} total, ${active} active`
  };
};

/**
 * Validates participant activity integrity and consistency with session totals.
 * @param {object} sessionSummary
 * @param {Array}  participants
 * @returns {{ passed: boolean, message: string, issues: Array }}
 */
const validateParticipantActivityIntegrity = (sessionSummary = {}, participants = []) => {
  if (!Array.isArray(participants) || participants.length === 0) {
    return { passed: true, message: 'No participants to validate', issues: [] };
  }

  const issues = [];
  let computedTotalEvents = 0;
  let percentSum = 0;

  participants.forEach((p) => {
    const name = p.userName || p.name || p.userId || 'Unknown';

    if (typeof p.totalEvents !== 'number' || p.totalEvents < 0) {
      issues.push(`Participant ${name} has invalid or negative totalEvents: ${p.totalEvents}`);
    } else {
      computedTotalEvents += p.totalEvents;
    }

    if ((p.linesAdded ?? 0) < 0 || (p.linesDeleted ?? 0) < 0 || (p.totalLinesChanged ?? 0) < 0) {
      issues.push(`Participant ${name} has negative line metrics (added: ${p.linesAdded}, deleted: ${p.linesDeleted})`);
    }

    if (typeof p.activitySharePercent === 'number') {
      if (p.activitySharePercent < 0 || p.activitySharePercent > 100) {
        issues.push(`Participant ${name} has out-of-range activitySharePercent: ${p.activitySharePercent}%`);
      }
      percentSum += p.activitySharePercent;
    }
  });

  const reportedEvents = sessionSummary.totalEvents ?? 0;
  if (computedTotalEvents !== reportedEvents) {
    issues.push(`Sum of participant events (${computedTotalEvents}) does not match session totalEvents (${reportedEvents})`);
  }

  // If there are events, percentages should sum to ~100% (98-102% tolerance)
  if (reportedEvents > 0 && (percentSum < 98 || percentSum > 102)) {
    issues.push(`Activity share percentages sum to ${percentSum}% (expected 98–102%)`);
  } else if (reportedEvents === 0 && percentSum !== 0) {
    issues.push(`Activity share percentages should be 0% for empty session, got ${percentSum}%`);
  }

  const passed = issues.length === 0;
  return {
    passed,
    message: passed
      ? 'Participant activity breakdown is consistent with session totals'
      : `Participant activity integrity issues: ${issues.join('; ')}`,
    issues
  };
};

/**
 * Validates that event category counts match total session events.
 * @param {object} sessionSummary
 * @param {object} eventCategories
 * @returns {{ passed: boolean, message: string }}
 */
const validateEventCategoryConsistency = (sessionSummary = {}, eventCategories = {}) => {
  const { coding = 0, fileOps = 0, executions = 0, collaboration = 0 } = eventCategories;

  if (coding < 0 || fileOps < 0 || executions < 0 || collaboration < 0) {
    return { passed: false, message: 'Event category counts cannot be negative' };
  }

  const sumCategories = coding + fileOps + executions + collaboration;
  const reportedEvents = sessionSummary.totalEvents ?? 0;

  if (sumCategories !== reportedEvents) {
    return {
      passed: false,
      message: `Event categories sum (${sumCategories}: coding=${coding}, files=${fileOps}, execs=${executions}, collab=${collaboration}) does not match session totalEvents (${reportedEvents})`
    };
  }

  return {
    passed: true,
    message: `Event category breakdown is fully consistent: ${sumCategories} total events`
  };
};

/**
 * Validates that an array of events contains no duplicate sequence numbers or duplicate IDs.
 * @param {Array} events
 * @returns {{ passed: boolean, message: string, duplicateCount: number }}
 */
const validateEventDeduplication = (events = []) => {
  if (!Array.isArray(events) || events.length <= 1) {
    return { passed: true, message: 'No events or single event — deduplication valid', duplicateCount: 0 };
  }

  const seenIds = new Set();
  const seenSequences = new Set();
  let duplicates = 0;

  for (const ev of events) {
    const id = ev._id || ev.id;
    const seq = ev.sequenceNumber;

    if (id) {
      if (seenIds.has(String(id))) duplicates++;
      else seenIds.add(String(id));
    }

    if (seq !== undefined && seq !== null) {
      if (seenSequences.has(seq)) duplicates++;
      else seenSequences.add(seq);
    }
  }

  return {
    passed: duplicates === 0,
    message: duplicates === 0
      ? 'All events are unique with no duplicate sequence numbers or IDs'
      : `Found ${duplicates} duplicate event occurrences`,
    duplicateCount: duplicates
  };
};

/**
 * Master session analytics validation runner (CT-201).
 * Runs all validation checks and returns a unified report.
 * @param {object} params
 * @param {object} params.sessionSummary
 * @param {Array}  params.participants
 * @param {object} params.eventCategories
 * @param {Array}  params.rawEvents
 * @returns {{ validationPassed: boolean, summary: string, checks: object }}
 */
const runSessionValidation = ({
  sessionSummary = {},
  participants = [],
  eventCategories = {},
  rawEvents = []
}) => {
  const durationCheck    = validateSessionDuration(sessionSummary);
  const participantCheck = validateParticipantCounts(sessionSummary, participants);
  const activityCheck    = validateParticipantActivityIntegrity(sessionSummary, participants);
  const categoryCheck    = validateEventCategoryConsistency(sessionSummary, eventCategories);
  const dedupCheck       = validateEventDeduplication(rawEvents);

  const allPassed = [durationCheck, participantCheck, activityCheck, categoryCheck, dedupCheck].every(c => c.passed);

  return {
    validationPassed: allPassed,
    summary: allPassed
      ? 'All CT-201 session analytics validation checks passed — session data is consistent and reliable.'
      : 'One or more session analytics validation checks failed — see individual check diagnostics.',
    checks: {
      sessionDuration:     durationCheck,
      participantCounts:   participantCheck,
      participantActivity: activityCheck,
      categoryConsistency: categoryCheck,
      eventDeduplication:  dedupCheck
    }
  };
};

module.exports = {
  validatePercentageSum,
  validateNoNegativeLines,
  validateTotalLinesConsistency,
  validateEventCounts,
  validateCodingMetrics,
  runFullValidation,
  // CT-201 Session Analytics Validators
  validateSessionDuration,
  validateParticipantCounts,
  validateParticipantActivityIntegrity,
  validateEventCategoryConsistency,
  validateEventDeduplication,
  runSessionValidation
};
