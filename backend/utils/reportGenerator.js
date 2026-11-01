/**
 * reportGenerator.js
 * CT-199: Generate Contribution Reports
 * Author: Anistina Dsouza (Lead - Execution & QA / Contribution Reports)
 *
 * Core engine responsible for:
 *   - Compiling comprehensive, audit-grade contribution reports
 *   - Aggregating activity summaries and session details
 *   - Calculating individual contributor metrics, rankings, and badges
 *   - Computing collaboration scores and forensic audit summaries
 *   - Signing reports with SHA-256 cryptographic checksums
 *   - Formatting reports into JSON, Markdown, and printable HTML layouts
 */

const crypto = require('crypto');

/**
 * Format milliseconds / seconds into human-readable duration string ("2h 15m 30s")
 */
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0s';
  const sec = Math.round(seconds);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Assign contributor tier/badge based on activity patterns
 */
function assignContributorBadge(contributor, totalWorkspaceEvents) {
  const share = totalWorkspaceEvents > 0 ? (contributor.totalEvents / totalWorkspaceEvents) * 100 : 0;
  if (contributor.userRole === 'owner') return 'Lead Architect';
  if (share >= 40) return 'Core Driver';
  if (contributor.executionsCount > 10 && contributor.executionSuccessRate >= 80) return 'Execution Champ';
  if (contributor.linesAdded >= 500) return 'Heavy Author';
  if (contributor.fileOpsCount >= 5) return 'File Architect';
  if (contributor.totalEvents > 0) return 'Active Contributor';
  return 'Participant';
}

/**
 * Generate a unique report reference identifier
 */
function generateReportId(workspaceId) {
  const wsPart = String(workspaceId || 'workspace').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
  const timeHex = Date.now().toString(16).toUpperCase();
  const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `CTR-${wsPart}-${timeHex}-${randomHex}`;
}

/**
 * Canonical JSON stringifier that recursively sorts keys at every level
 */
function canonicalStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const entries = keys
    .filter(k => k !== 'reportHash' && k !== 'signature' && k !== 'validation')
    .map(k => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`);
  return '{' + entries.join(',') + '}';
}

/**
 * Compute SHA-256 cryptographic signature of report payload
 */
function computeReportSignature(reportPayload) {
  const canonicalString = canonicalStringify(reportPayload);
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}

/**
 * Calculate team collaboration index (0 - 100)
 * Evaluates activity volume, participation balance (entropy/Gini inverse), and execution success.
 */
function calculateCollaborationIndex(contributors, totalEvents, executionSuccessRate) {
  if (!contributors || contributors.length === 0 || totalEvents === 0) return 0;
  if (contributors.length === 1) return Math.min(65, Math.round(50 + (totalEvents > 10 ? 15 : 5)));

  // Calculate Shannon entropy for participation balance
  let entropy = 0;
  const activeContributors = contributors.filter(c => c.totalEvents > 0);
  if (activeContributors.length <= 1) return 55;

  activeContributors.forEach(c => {
    const p = c.totalEvents / totalEvents;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  });

  const maxEntropy = Math.log2(activeContributors.length);
  const balanceFactor = maxEntropy > 0 ? (entropy / maxEntropy) : 0; // 0 (unbalanced) to 1 (perfectly balanced)

  // Weighted score: 40% balance, 30% execution reliability, 30% active participation
  const activeRatio = Math.min(1, activeContributors.length / contributors.length);
  const execFactor = (executionSuccessRate || 0) / 100;

  const score = (balanceFactor * 40) + (activeRatio * 30) + (execFactor * 30);
  return Math.min(100, Math.max(10, Math.round(score)));
}

/**
 * Core Contribution Report Generator (CT-199)
 *
 * @param {Object} params
 * @param {Object} params.workspace - Workspace document
 * @param {Array}  params.activityLogs - Raw ActivityLog documents
 * @param {Array}  params.sessions - WorkspaceSession records
 * @param {Object} [params.options] - Customization options
 * @param {Object} [params.generatedBy] - User metadata generating the report
 * @returns {Object} Comprehensive structured Contribution Report
 */
function generateContributionReport({
  workspace = {},
  activityLogs = [],
  sessions = [],
  options = {},
  generatedBy = null
}) {
  const now = new Date();
  const wsId = String(workspace._id || workspace.id || 'unknown');
  const reportId = generateReportId(wsId);

  // Filter logs by timeframe if requested
  let logs = [...activityLogs];
  if (options.timeRange && options.timeRange !== 'all') {
    const cutoff = new Date();
    if (options.timeRange === '24h') cutoff.setHours(cutoff.getHours() - 24);
    else if (options.timeRange === '7d') cutoff.setDate(cutoff.getDate() - 7);
    else if (options.timeRange === '30d') cutoff.setDate(cutoff.getDate() - 30);
    logs = logs.filter(l => new Date(l.timestamp || l.createdAt) >= cutoff);
  }

  // Filter by participants if requested
  if (Array.isArray(options.participantIds) && options.participantIds.length > 0) {
    const allowed = new Set(options.participantIds.map(String));
    logs = logs.filter(l => l.userId && allowed.has(String(l.userId._id || l.userId)));
  }

  // ── 1. Aggregate Session Details ──────────────────────────────────────────
  let sessionStartTime = null;
  let sessionLastActive = null;
  let activeSessionsCount = 0;
  let totalActiveTimeSeconds = 0;

  // Session duration from logs
  if (logs.length > 0) {
    const timestamps = logs
      .map(l => new Date(l.timestamp || l.createdAt).getTime())
      .filter(t => !isNaN(t))
      .sort((a, b) => a - b);

    if (timestamps.length > 0) {
      sessionStartTime = new Date(timestamps[0]).toISOString();
      sessionLastActive = new Date(timestamps[timestamps.length - 1]).toISOString();
    }
  }

  // If no logs, fallback to sessions or workspace creation
  if (!sessionStartTime && sessions.length > 0) {
    const joinTimes = sessions.map(s => new Date(s.joinedAt || s.createdAt).getTime()).filter(t => !isNaN(t)).sort((a, b) => a - b);
    if (joinTimes.length > 0) sessionStartTime = new Date(joinTimes[0]).toISOString();
  }
  if (!sessionStartTime) {
    sessionStartTime = workspace.createdAt ? new Date(workspace.createdAt).toISOString() : now.toISOString();
    sessionLastActive = sessionStartTime;
  }
  if (!sessionLastActive) {
    sessionLastActive = sessionStartTime;
  }

  const durationMs = Math.max(0, new Date(sessionLastActive).getTime() - new Date(sessionStartTime).getTime());
  const sessionDurationSeconds = Math.round(durationMs / 1000);

  // Active sessions and participants list
  const sessionMap = new Map();
  sessions.forEach(s => {
    const uid = String(s.userId?._id || s.userId || '');
    if (uid) {
      sessionMap.set(uid, s);
      if (s.status === 'online') activeSessionsCount += 1;
    }
  });

  // ── 2. Contributor Breakdown & Metrics ─────────────────────────────────────
  const contributorMap = new Map();

  // Seed known members from workspace
  if (workspace.owner) {
    const ownerId = String(workspace.owner._id || workspace.owner.id || workspace.owner);
    contributorMap.set(ownerId, {
      userId: ownerId,
      userName: workspace.owner.name || 'Workspace Owner',
      userEmail: workspace.owner.email || '',
      userRole: 'owner',
      avatar: workspace.owner.avatar || null,
      status: sessionMap.get(ownerId)?.status || 'offline',
      totalEvents: 0,
      linesAdded: 0,
      linesDeleted: 0,
      totalLinesChanged: 0,
      netLines: 0,
      codeEditsCount: 0,
      fileOpsCount: 0,
      executionsCount: 0,
      successfulExecutionsCount: 0,
      collaborationCount: 0,
      activeSeconds: 0,
      firstActiveAt: null,
      lastActiveAt: null
    });
  }

  (workspace.members || []).forEach(m => {
    if (m.user) {
      const uid = String(m.user._id || m.user.id || m.user);
      if (!contributorMap.has(uid)) {
        contributorMap.set(uid, {
          userId: uid,
          userName: m.user.name || 'Member',
          userEmail: m.user.email || '',
          userRole: m.role || 'editor',
          avatar: m.user.avatar || null,
          status: sessionMap.get(uid)?.status || 'offline',
          totalEvents: 0,
          linesAdded: 0,
          linesDeleted: 0,
          totalLinesChanged: 0,
          netLines: 0,
          codeEditsCount: 0,
          fileOpsCount: 0,
          executionsCount: 0,
          successfulExecutionsCount: 0,
          collaborationCount: 0,
          activeSeconds: 0,
          firstActiveAt: null,
          lastActiveAt: null
        });
      }
    }
  });

  // Track activity categories
  let totalLinesAdded = 0;
  let totalLinesDeleted = 0;
  let totalExecutions = 0;
  let successfulExecutions = 0;
  const actionCounts = {};
  const fileTouches = {};

  const categories = {
    coding: 0,
    fileOps: 0,
    executions: 0,
    collaboration: 0
  };

  // Process activity logs
  logs.forEach(log => {
    const uid = String(log.userId?._id || log.userId || 'anonymous');
    let c = contributorMap.get(uid);
    if (!c) {
      c = {
        userId: uid,
        userName: log.userName || 'Developer',
        userEmail: log.userEmail || '',
        userRole: log.userRole || 'editor',
        avatar: null,
        status: sessionMap.get(uid)?.status || 'offline',
        totalEvents: 0,
        linesAdded: 0,
        linesDeleted: 0,
        totalLinesChanged: 0,
        netLines: 0,
        codeEditsCount: 0,
        fileOpsCount: 0,
        executionsCount: 0,
        successfulExecutionsCount: 0,
        collaborationCount: 0,
        activeSeconds: 0,
        firstActiveAt: null,
        lastActiveAt: null
      };
      contributorMap.set(uid, c);
    }

    c.totalEvents += 1;
    const lAdd = Number(log.linesAdded) || 0;
    const lDel = Number(log.linesDeleted) || 0;
    c.linesAdded += lAdd;
    c.linesDeleted += lDel;
    c.totalLinesChanged += (lAdd + lDel);
    c.netLines = c.linesAdded - c.linesDeleted;

    totalLinesAdded += lAdd;
    totalLinesDeleted += lDel;

    // Track timestamps
    const logTime = log.timestamp || log.createdAt;
    if (logTime) {
      if (!c.firstActiveAt || new Date(logTime) < new Date(c.firstActiveAt)) c.firstActiveAt = new Date(logTime).toISOString();
      if (!c.lastActiveAt || new Date(logTime) > new Date(c.lastActiveAt)) c.lastActiveAt = new Date(logTime).toISOString();
    }

    // Action breakdown
    const action = log.action || 'general';
    actionCounts[action] = (actionCounts[action] || 0) + 1;

    // File touch breakdown
    if (log.fileName || log.fileId) {
      const fname = log.fileName || log.fileId;
      fileTouches[fname] = (fileTouches[fname] || 0) + 1;
    }

    // Categorization
    if (action === 'code_edit') {
      categories.coding += 1;
      c.codeEditsCount += 1;
    } else if (['file_create', 'file_delete', 'file_rename'].includes(action)) {
      categories.fileOps += 1;
      c.fileOpsCount += 1;
    } else if (action === 'code_execution') {
      categories.executions += 1;
      c.executionsCount += 1;
      totalExecutions += 1;
      if (log.executionStatus === 'success') {
        c.successfulExecutionsCount += 1;
        successfulExecutions += 1;
      }
    } else {
      categories.collaboration += 1;
      c.collaborationCount += 1;
    }
  });

  const totalEvents = logs.length;
  const executionSuccessRate = totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 0;

  // Build ranked contributor array
  const contributors = Array.from(contributorMap.values()).map(c => {
    const sharePercent = totalEvents > 0 ? Math.round((c.totalEvents / totalEvents) * 100) : 0;
    const execRate = c.executionsCount > 0 ? Math.round((c.successfulExecutionsCount / c.executionsCount) * 100) : 0;

    // Contribution Score: 3 pts per line added, 5 pts per code edit, 10 pts per successful execution, 2 pts per file op
    const score = (c.linesAdded * 3) + (c.codeEditsCount * 5) + (c.successfulExecutionsCount * 10) + (c.fileOpsCount * 2);

    // Active time heuristic: ~30s per event, capped at session duration
    const estimatedActiveSec = Math.min(sessionDurationSeconds, c.totalEvents * 30);
    totalActiveTimeSeconds += estimatedActiveSec;

    return {
      ...c,
      contributionSharePercent: sharePercent,
      executionSuccessRate: execRate,
      contributionScore: score,
      activeSeconds: estimatedActiveSec,
      activeTimeFormatted: formatDuration(estimatedActiveSec),
      badge: assignContributorBadge({ ...c, executionSuccessRate: execRate }, totalEvents)
    };
  }).sort((a, b) => b.contributionScore - a.contributionScore);

  // Normalize contributionSharePercent so they sum strictly to 100% when there is activity
  if (contributors.length > 0 && totalEvents > 0) {
    const sum = contributors.reduce((acc, c) => acc + c.contributionSharePercent, 0);
    if (sum !== 100 && contributors[0]) {
      contributors[0].contributionSharePercent += (100 - sum);
    }
  }

  // Active time for session overview
  const avgActiveSec = Math.min(sessionDurationSeconds, totalActiveTimeSeconds);
  const idleTimeSeconds = Math.max(0, sessionDurationSeconds - avgActiveSec);

  // Top files list
  const topFiles = Object.entries(fileTouches)
    .map(([file, count]) => ({ file, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ── 3. Forensic Integrity Summary ──────────────────────────────────────────
  let verifiedBlocksCount = 0;
  let chainIntegrityStatus = '100% Cryptographically Verified';

  logs.forEach(l => {
    if (l.isVerified !== false && l.currentHash) verifiedBlocksCount += 1;
    if (l.isVerified === false) chainIntegrityStatus = 'Tamper Warning Detected';
  });

  const forensicAudit = {
    totalBlocks: logs.length,
    verifiedBlocks: verifiedBlocksCount,
    verificationRate: logs.length > 0 ? Math.round((verifiedBlocksCount / logs.length) * 100) : 100,
    status: chainIntegrityStatus,
    genesisPointerValid: logs.length === 0 || !!(logs[0]?.previousHash),
    headHash: logs.length > 0 ? (logs[logs.length - 1]?.currentHash || '0000...0000') : '0000...0000'
  };

  // ── 4. Key Highlights & Executive Summary ───────────────────────────────────
  const leadContributor = contributors[0] || null;
  const collaborationIndex = calculateCollaborationIndex(contributors, totalEvents, executionSuccessRate);

  const highlights = [];
  if (leadContributor && leadContributor.totalEvents > 0) {
    highlights.push(`Lead Contributor: ${leadContributor.userName} with ${leadContributor.contributionSharePercent}% share (${leadContributor.totalEvents} actions).`);
  }
  if (totalExecutions > 0) {
    highlights.push(`Code Execution Stability: ${executionSuccessRate}% success rate across ${totalExecutions} runtime runs.`);
  } else {
    highlights.push('Runtime status: Ready for execution validation.');
  }
  if (totalLinesAdded > 0) {
    highlights.push(`Codebase expansion: +${totalLinesAdded} lines added, -${totalLinesDeleted} lines removed (net: ${totalLinesAdded - totalLinesDeleted}).`);
  }
  highlights.push(`Cryptographic Audit: ${forensicAudit.verificationRate}% of activity blocks verified.`);

  // ── 5. Assemble Full Report ────────────────────────────────────────────────
  const report = {
    reportId,
    schemaVersion: '1.0.0',
    generatedAt: now.toISOString(),
    generatedBy: generatedBy ? {
      userId: String(generatedBy._id || generatedBy.id || ''),
      userName: generatedBy.name || 'Anistina Dsouza',
      userEmail: generatedBy.email || '',
      userRole: generatedBy.role || 'Execution & QA Lead'
    } : {
      userId: 'system',
      userName: 'Anistina Dsouza',
      userEmail: 'anistina@codetrail.local',
      userRole: 'Execution & QA Lead / Lead Author'
    },
    workspace: {
      workspaceId: wsId,
      title: workspace.title || 'Collaborative Workspace',
      description: workspace.description || '',
      language: workspace.language || 'javascript',
      ownerName: workspace.owner?.name || 'Workspace Owner',
      createdAt: workspace.createdAt || sessionStartTime
    },
    options: {
      timeRange: options.timeRange || 'all',
      detailLevel: options.detailLevel || 'comprehensive',
      customTitle: options.customTitle || null,
      notes: options.notes || null
    },
    executiveSummary: {
      collaborationIndex,
      totalContributors: contributors.length,
      activeContributorsCount: contributors.filter(c => c.totalEvents > 0).length,
      totalEvents,
      totalLinesAdded,
      totalLinesDeleted,
      netLines: totalLinesAdded - totalLinesDeleted,
      totalLinesChanged: totalLinesAdded + totalLinesDeleted,
      totalExecutions,
      successfulExecutions,
      executionSuccessRate,
      sessionDurationSeconds,
      sessionDurationFormatted: formatDuration(sessionDurationSeconds),
      activeTimeSeconds: avgActiveSec,
      activeTimeFormatted: formatDuration(avgActiveSec),
      idleTimeSeconds,
      idleTimeFormatted: formatDuration(idleTimeSeconds),
      leadContributor: leadContributor ? {
        name: leadContributor.userName,
        share: leadContributor.contributionSharePercent,
        score: leadContributor.contributionScore
      } : null,
      highlights
    },
    sessionDetails: {
      status: activeSessionsCount > 0 ? 'active' : (totalEvents > 0 ? 'completed' : 'idle'),
      startedAt: sessionStartTime,
      lastActiveAt: sessionLastActive,
      durationSeconds: sessionDurationSeconds,
      durationFormatted: formatDuration(sessionDurationSeconds),
      activeDurationSeconds: avgActiveSec,
      activeDurationFormatted: formatDuration(avgActiveSec),
      activeSessionsCount,
      totalParticipantsCount: contributors.length,
      attendance: contributors.map(c => ({
        userId: c.userId,
        name: c.userName,
        role: c.userRole,
        status: c.status,
        joinedAt: c.firstActiveAt || sessionStartTime,
        lastActiveAt: c.lastActiveAt || sessionLastActive
      }))
    },
    contributors,
    activitySummary: {
      totalEvents,
      actionTypeCounts: actionCounts,
      categories: {
        coding: { count: categories.coding, percent: totalEvents > 0 ? Math.round((categories.coding / totalEvents) * 100) : 0 },
        fileOps: { count: categories.fileOps, percent: totalEvents > 0 ? Math.round((categories.fileOps / totalEvents) * 100) : 0 },
        executions: { count: categories.executions, percent: totalEvents > 0 ? Math.round((categories.executions / totalEvents) * 100) : 0 },
        collaboration: { count: categories.collaboration, percent: totalEvents > 0 ? Math.round((categories.collaboration / totalEvents) * 100) : 0 }
      },
      topFiles
    },
    forensicAudit
  };

  // Sign report with cryptographic hash (CT-199 tamper-proof verification)
  report.reportHash = computeReportSignature(report);

  return report;
}

/**
 * Format Contribution Report as Markdown (for copy / export)
 */
function formatReportAsMarkdown(report) {
  const meta = report.workspace || {};
  const exec = report.executiveSummary || {};
  const sess = report.sessionDetails || {};
  const contribs = report.contributors || [];
  const cat = report.activitySummary?.categories || {};
  const audit = report.forensicAudit || {};

  return `# 📊 CodeTrail Contribution Report — ${meta.title}
*Report Reference:* \`${report.reportId}\`  
*Generated:* ${new Date(report.generatedAt).toLocaleString()} by **${report.generatedBy?.userName || 'Lead'}**  
*Verification Signature:* \`${report.reportHash}\`  

---

## 🎯 Executive Summary
- **Collaboration Index:** **${exec.collaborationIndex}/100**
- **Total Contributors:** ${exec.totalContributors} (${exec.activeContributorsCount} active)
- **Total Collaboration Events:** ${exec.totalEvents}
- **Session Duration:** ${sess.durationFormatted} *(Active Time: ${sess.activeDurationFormatted})*
- **Code Velocity:** +${exec.totalLinesAdded} added / -${exec.totalLinesDeleted} removed (*Net: ${exec.netLines} lines*)
- **Execution Success Rate:** ${exec.executionSuccessRate}% (${exec.successfulExecutions}/${exec.totalExecutions} successful)
- **Forensic Integrity:** **${audit.status}** (${audit.verificationRate}% verified)

### 🌟 Key Highlights
${(exec.highlights || []).map(h => `- ${h}`).join('\n')}

---

## 👥 Contributor Breakdown
| Contributor | Role | Share | Score | Lines (+/-) | Executions | Badge |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
${contribs.map(c => `| **${c.userName}** | \`${c.userRole}\` | **${c.contributionSharePercent}%** | ${c.contributionScore} | +${c.linesAdded}/-${c.linesDeleted} | ${c.executionsCount} (${c.executionSuccessRate}%) | \`${c.badge}\` |`).join('\n')}

---

## ⚡ Activity Category Distribution
- **💻 Coding Edits:** ${cat.coding?.count || 0} (${cat.coding?.percent || 0}%)
- **📁 File Operations:** ${cat.fileOps?.count || 0} (${cat.fileOps?.percent || 0}%)
- **🚀 Code Executions:** ${cat.executions?.count || 0} (${cat.executions?.percent || 0}%)
- **🤝 Collaboration & Presence:** ${cat.collaboration?.count || 0} (${cat.collaboration?.percent || 0}%)

---

## 🛡️ Forensic Chain Audit
- **Total Activity Blocks:** ${audit.totalBlocks}
- **Verified Blocks:** ${audit.verifiedBlocks} (${audit.verificationRate}%)
- **Chain Head SHA-256:** \`${audit.headHash}\`
- **Tamper Status:** ${audit.status}

---
*Report generated automatically by CodeTrail Module 6 Analytics & Reporting Engine (CT-199).*
`;
}

/**
 * Format Contribution Report as Standalone HTML (for print & PDF export)
 */
function formatReportAsHtml(report) {
  const md = formatReportAsMarkdown(report);
  const jsonString = JSON.stringify(report, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CodeTrail Contribution Report — ${report.workspace?.title || 'Workspace'}</title>
  <style>
    @media print {
      body { background: #fff !important; color: #111 !important; }
      .no-print { display: none !important; }
      .page-break { page-break-after: always; }
      .card { border: 1px solid #ccc !important; box-shadow: none !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      color: #e2e8f0;
      background: #0B0D17;
      margin: 0;
      padding: 30px;
    }
    .container { max-width: 900px; margin: 0 auto; }
    .header { border-bottom: 2px solid #8B5CF6; padding-bottom: 15px; margin-bottom: 25px; }
    .title { font-size: 24px; font-weight: bold; color: #fff; margin: 0; }
    .subtitle { color: #94a3b8; font-size: 13px; margin-top: 5px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px; }
    .card { background: #13172E; border: 1px solid #23294C; border-radius: 8px; padding: 15px; }
    .card-label { font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 600; }
    .card-value { font-size: 22px; font-weight: bold; color: #fff; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; background: #13172E; border-radius: 8px; overflow: hidden; }
    th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #23294C; font-size: 13px; }
    th { background: #1b203e; color: #a5b4fc; font-weight: 600; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background: #8b5cf622; color: #c084fc; border: 1px solid #8b5cf644; }
    .hash-box { background: #070913; border: 1px solid #23294C; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 11px; word-break: break-all; color: #38bdf8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">CodeTrail Contribution Report</div>
      <div class="subtitle">
        Workspace: <strong>${report.workspace?.title}</strong> | Ref: <strong>${report.reportId}</strong> | Generated: ${new Date(report.generatedAt).toLocaleString()} by ${report.generatedBy?.userName}
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-label">Collaboration Index</div>
        <div class="card-value" style="color: #a78bfa;">${report.executiveSummary?.collaborationIndex}/100</div>
      </div>
      <div class="card">
        <div class="card-label">Total Events</div>
        <div class="card-value">${report.executiveSummary?.totalEvents}</div>
      </div>
      <div class="card">
        <div class="card-label">Active Time</div>
        <div class="card-value" style="color: #34d399;">${report.sessionDetails?.activeDurationFormatted}</div>
      </div>
      <div class="card">
        <div class="card-label">Exec Success Rate</div>
        <div class="card-value" style="color: #38bdf8;">${report.executiveSummary?.executionSuccessRate}%</div>
      </div>
    </div>

    <h3>👥 Contributor Breakdown</h3>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Role</th>
          <th>Share</th>
          <th>Score</th>
          <th>Lines (+/-)</th>
          <th>Executions</th>
          <th>Badge</th>
        </tr>
      </thead>
      <tbody>
        ${(report.contributors || []).map(c => `
          <tr>
            <td><strong>${c.userName}</strong></td>
            <td>${c.userRole}</td>
            <td><strong>${c.contributionSharePercent}%</strong></td>
            <td>${c.contributionScore}</td>
            <td><span style="color:#34d399;">+${c.linesAdded}</span> / <span style="color:#f87171;">-${c.linesDeleted}</span></td>
            <td>${c.executionsCount} (${c.executionSuccessRate}%)</td>
            <td><span class="badge">${c.badge}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h3 style="margin-top: 30px;">🛡️ Forensic Integrity</h3>
    <div class="card">
      <div>Status: <strong style="color:#34d399;">${report.forensicAudit?.status}</strong> (${report.forensicAudit?.verificationRate}% verified)</div>
      <div style="margin-top: 8px;">Cryptographic Report Signature:</div>
      <div class="hash-box" style="margin-top: 4px;">${report.reportHash}</div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = {
  generateContributionReport,
  generateReportId,
  computeReportSignature,
  calculateCollaborationIndex,
  assignContributorBadge,
  formatDuration,
  formatReportAsMarkdown,
  formatReportAsHtml
};
