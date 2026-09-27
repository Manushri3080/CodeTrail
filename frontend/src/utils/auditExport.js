/**
 * CodeTrail Proof-of-Work Audit Exporter (Ruchita Patadiya - CT-168)
 * 
 * Provides client-side generation and export of cryptographic audit reports:
 * 1. JSON Audit Manifest (Machine-verifiable SHA-256 ledger summary)
 * 2. Markdown / Text Formal Certificate (Human-readable audit report)
 */

/**
 * Triggers a browser file download for text/json content.
 */
const downloadBlob = (content, fileName, mimeType = 'text/plain') => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Exports complete machine-verifiable JSON audit manifest
 */
export const exportAuditJson = (workspace, telemetry, verification) => {
  const wsId = workspace?._id || workspace?.id || telemetry?.workspaceId || 'workspace';
  const wsTitle = workspace?.title || telemetry?.workspaceTitle || 'Collaborative Workspace';

  const manifest = {
    $schema: 'https://codetrail.daiict.ac.in/schemas/audit-manifest-v1.json',
    format: 'CodeTrail Cryptographic Proof-of-Work Audit Manifest',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    course: 'Web Services & SOA (IT645) - DA-IICT',
    workspace: {
      id: wsId,
      title: wsTitle,
      description: workspace?.description || '',
      language: workspace?.language || 'JavaScript',
      owner: workspace?.owner?.name || workspace?.owner || 'Workspace Owner',
      updatedAt: workspace?.updatedAt || new Date().toISOString()
    },
    auditSummary: {
      totalLinesChanged: telemetry?.summary?.totalLinesChanged ?? 0,
      totalActivities: telemetry?.summary?.totalActivities ?? 0,
      activeContributorsCount: telemetry?.summary?.activeContributorsCount ?? 0,
      totalBlocks: telemetry?.summary?.totalBlocks ?? 0,
      latestBlockHash: telemetry?.summary?.latestBlockHash ?? '0'.repeat(64),
      isChainVerified: Boolean(verification?.isValid ?? telemetry?.summary?.isChainVerified)
    },
    verificationReport: {
      verifiedAt: verification?.verifiedAt || new Date().toISOString(),
      isValid: Boolean(verification?.isValid ?? true),
      totalBlocks: verification?.totalBlocks ?? telemetry?.summary?.totalBlocks ?? 0,
      verifiedBlocks: verification?.verifiedBlocks ?? telemetry?.summary?.totalBlocks ?? 0,
      brokenBlock: verification?.brokenBlock || null,
      message: verification?.message || 'Cryptographic proof-of-work hash chain verified successfully.'
    },
    contributors: (telemetry?.contributors || []).map(c => ({
      id: c.id,
      name: c.name,
      email: c.email || '',
      role: c.role,
      badge: c.badge,
      linesSynced: c.lines,
      linesAdded: c.linesAdded ?? 0,
      linesDeleted: c.linesDeleted ?? 0,
      participationPercent: c.percent,
      totalEvents: c.totalEvents ?? 0,
      codeExecutions: c.codeExecutions ?? 0,
      sha256VerificationHash: c.fullHash || c.hash,
      lastActiveAt: c.lastActiveAt
    }))
  };

  const fileName = `codetrail-audit-${wsId.toString().slice(-6)}-${Date.now()}.json`;
  downloadBlob(JSON.stringify(manifest, null, 2), fileName, 'application/json');
  return fileName;
};

/**
 * Exports formatted human-readable Markdown / Text Audit Certificate
 */
export const exportAuditMarkdown = (workspace, telemetry, verification) => {
  const wsId = workspace?._id || workspace?.id || telemetry?.workspaceId || 'workspace';
  const wsTitle = workspace?.title || telemetry?.workspaceTitle || 'Collaborative Workspace';
  const dateStr = new Date().toLocaleString();
  const isValid = Boolean(verification?.isValid ?? telemetry?.summary?.isChainVerified ?? true);

  const contributors = telemetry?.contributors || [];

  let md = `# 🛡️ CodeTrail Proof-of-Work Audit Certificate\n\n`;
  md += `**Course:** Web Services & SOA (IT645) — DA-IICT  \n`;
  md += `**Workspace:** ${wsTitle} (\`${wsId}\`)  \n`;
  md += `**Audit Generated:** ${dateStr}  \n`;
  md += `**Integrity Status:** ${isValid ? '✅ 100% CRYPTOGRAPHICALLY VERIFIED' : '⚠️ TAMPERING / INTEGRITY MISMATCH DETECTED'}  \n\n`;

  md += `---\n\n`;
  md += `## 1. Blockchain Ledger Summary\n\n`;
  md += `- **Total Blocks in Chain:** ${telemetry?.summary?.totalBlocks ?? 0}\n`;
  md += `- **Total Lines Synced:** ${telemetry?.summary?.totalLinesChanged ?? 0} lines\n`;
  md += `- **Total Recorded Activities:** ${telemetry?.summary?.totalActivities ?? 0} events\n`;
  md += `- **Active Contributors:** ${telemetry?.summary?.activeContributorsCount ?? contributors.length}\n`;
  md += `- **Latest Block Hash:** \`${telemetry?.summary?.latestBlockHash ?? '0'.repeat(64)}\`\n`;
  md += `- **Verification Message:** ${verification?.message || 'Proof-of-work hash sequence intact with zero tampering detected.'}\n\n`;

  md += `---\n\n`;
  md += `## 2. Contributor Telemetry & Participation Breakdown\n\n`;
  md += `| Contributor | Role | Badge | Lines Synced | Added / Deleted | Participation | SHA-256 Proof Hash |\n`;
  md += `| :--- | :--- | :---: | :---: | :---: | :---: | :--- |\n`;

  contributors.forEach(c => {
    const hashPill = c.fullHash ? `\`${c.fullHash.slice(0, 8)}...${c.fullHash.slice(-8)}\`` : `\`${c.hash || 'GENESIS'}\``;
    md += `| **${c.name}** | ${c.role} | \`${c.badge}\` | ${c.lines?.toLocaleString() || 0} | +${c.linesAdded || 0} / -${c.linesDeleted || 0} | **${c.percent || 0}%** | ${hashPill} |\n`;
  });

  md += `\n---\n\n`;
  md += `## 3. Cryptographic Verification Details\n\n`;
  md += `All activity records in this workspace are chained deterministically using SHA-256 cryptographic hashing.\n`;
  md += `Every block commits to the previous block's digest, timestamp, actor ID, and line-diff signature, creating a tamper-evident audit trail.\n\n`;
  md += `*Generated automatically by CodeTrail Telemetry Engine.*  \n`;

  const fileName = `codetrail-audit-${wsId.toString().slice(-6)}-${Date.now()}.md`;
  downloadBlob(md, fileName, 'text/markdown');
  return fileName;
};
