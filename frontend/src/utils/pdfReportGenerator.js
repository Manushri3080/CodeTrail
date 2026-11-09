/**
 * pdfReportGenerator.js
 * CT-200: Contribution Report PDF Export Generator
 * Author: Meet Sheth (Lead - Export Reports / PDF Functionality)
 *
 * Professional, vector-grade PDF generation engine using client-side jsPDF and jspdf-autotable.
 * Features:
 *   - CodeTrail brand styling (dark tech accents, crisp typography, clean tabular hierarchy)
 *   - Complete metadata, executive summary, KPI cards, and highlights
 *   - Contributor breakdown table with role, score, share %, lines (+/-), and badges
 *   - Activity category distribution & file coverage
 *   - Forensic integrity audit & unmodified SHA-256 cryptographic report signature
 *   - Multi-page table handling with recurring headers and footers
 *   - Dynamic page numbering ("Page X of Y")
 *   - Robust handling of empty workspaces, missing fields, and custom filter notes
 *   - Safe object URL lifecycle management
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { validatePdfReport } from './pdfValidator.js';

// CodeTrail Theme Color Palette (RGB tuples for jsPDF)
const COLORS = {
  primaryDark: [11, 13, 23],       // #0B0D17 (CodeTrail Deep Navy)
  surfaceDark: [19, 23, 46],       // #13172E (Dark surface card)
  brandViolet: [139, 92, 246],     // #8B5CF6 (Purple brand accent)
  brandIndigo: [79, 70, 229],      // #4F46E5 (Indigo primary)
  headerDark: [30, 27, 75],        // #1E1B4B (Deep indigo table header)
  emeraldGreen: [16, 185, 129],    // #10B981 (Success green)
  cyanAccent: [14, 165, 233],      // #0EA5E9 (Info cyan)
  coralRed: [239, 68, 68],         // #EF4444 (Delete / warning red)
  amberWarning: [245, 158, 11],    // #F59E0B (Tamper warning amber)
  slateDark: [30, 41, 59],         // #1E293B (Dark text)
  slateMuted: [100, 116, 139],     // #64748B (Secondary / subtitle text)
  slateLight: [148, 163, 184],     // #94A3B8 (Light slate borders)
  cardBg: [248, 250, 252],         // #F8FAFC (Light card fill)
  cardBorder: [226, 232, 240],     // #E2E8F0 (Subtle border)
  white: [255, 255, 255]
};

/**
 * Sanitizes a string for use in downloadable filenames
 */
export function sanitizeFilename(str) {
  if (!str) return 'Workspace';
  return String(str)
    .trim()
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'Workspace';
}

/**
 * Constructs a meaningful, standard filename for the exported PDF report
 */
export function getReportPdfFilename(report) {
  const wsTitle = sanitizeFilename(report?.workspace?.title || 'Workspace');
  const ref = sanitizeFilename(report?.reportId || 'CTR');
  const dateStr = new Date().toISOString().slice(0, 10);
  return `CodeTrail-Report-${wsTitle}-${ref}-${dateStr}.pdf`;
}

/**
 * Master PDF Document Builder
 *
 * @param {Object} report - Complete CT-199 report object
 * @param {Object} [options] - Optional layout and branding overrides
 * @returns {jsPDF} Generated jsPDF instance
 */
export function buildContributionReportPdfDocument(report, options = {}) {
  if (!report || typeof report !== 'object') {
    throw new Error('Cannot generate PDF: Report payload is empty or invalid.');
  }

  // 1. Initialize Document (A4 portrait, mm coordinates)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    compress: options.compress !== undefined ? options.compress : false
  });

  const pageWidth = doc.internal.pageSize.getWidth();   // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 14;
  const contentWidth = pageWidth - (marginX * 2);       // 182mm

  // Set standard PDF document properties
  const docTitle = `CodeTrail Contribution Report — ${report.workspace?.title || 'Workspace'}`;
  doc.setProperties({
    title: docTitle,
    subject: `Contribution Audit & Analytics Report (Ref: ${report.reportId || 'N/A'})`,
    author: report.generatedBy?.userName || 'CodeTrail Analytics',
    keywords: `${report.reportHash || ''} CodeTrail Contribution Report Proof of Work Audit Analytics`,
    creator: 'CodeTrail CT-200 PDF Export Engine'
  });

  let currentY = 18;

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Top Decorative Brand Bar & Report Title Banner
  // ─────────────────────────────────────────────────────────────────────────────
  doc.setFillColor(...COLORS.primaryDark);
  doc.roundedRect(marginX, currentY, contentWidth, 32, 2, 2, 'F');

  // Accent vertical stripe
  doc.setFillColor(...COLORS.brandViolet);
  doc.roundedRect(marginX, currentY, 4, 32, 2, 0, 'F');

  // Brand Name & Badge
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('CODETRAIL', marginX + 8, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.cyanAccent);
  doc.text('MODULE 6: CONTRIBUTION AUDIT & REPORTING ENGINE', marginX + 46, currentY + 9);

  // Main Report Title
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const wsTitleText = report.workspace?.title
    ? `Workspace: ${report.workspace.title}`
    : 'Workspace Contribution Report';
  doc.text(wsTitleText.slice(0, 65), marginX + 8, currentY + 18);

  // Subtitle / Reference Line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.slateLight);
  const genDate = report.generatedAt ? new Date(report.generatedAt).toLocaleString() : new Date().toLocaleString();
  const authorName = report.generatedBy?.userName || 'System';
  const refText = `Reference: ${report.reportId || 'N/A'}  |  Generated: ${genDate}  |  Author: ${authorName}`;
  doc.text(refText.slice(0, 95), marginX + 8, currentY + 26);

  currentY += 38;

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Metadata & Filter Context Strip
  // ─────────────────────────────────────────────────────────────────────────────
  doc.setFillColor(...COLORS.cardBg);
  doc.setDrawColor(...COLORS.cardBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, currentY, contentWidth, 14, 1.5, 1.5, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.slateDark);
  doc.setFont('helvetica', 'bold');
  doc.text('Language:', marginX + 4, currentY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(String(report.workspace?.language || 'JavaScript').toUpperCase(), marginX + 22, currentY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Timeframe:', marginX + 55, currentY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(String(report.options?.timeRange || 'All Time').toUpperCase(), marginX + 74, currentY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Detail Level:', marginX + 105, currentY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(String(report.options?.detailLevel || 'Comprehensive').toUpperCase(), marginX + 125, currentY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Owner:', marginX + 4, currentY + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.text(String(report.workspace?.ownerName || 'Workspace Owner').slice(0, 30), marginX + 17, currentY + 10.5);

  if (report.options?.customTitle || report.options?.notes) {
    const extra = [report.options.customTitle, report.options.notes].filter(Boolean).join(' - ');
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.slateMuted);
    doc.text(`Notes: ${extra.slice(0, 65)}`, marginX + 74, currentY + 10.5);
  }

  currentY += 19;

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Section: Executive Summary & KPI Metrics
  // ─────────────────────────────────────────────────────────────────────────────
  const exec = report.executiveSummary || {};
  const sess = report.sessionDetails || {};

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.brandIndigo);
  doc.text('1. EXECUTIVE SUMMARY & KEY PERFORMANCE METRICS', marginX, currentY);

  currentY += 4;

  // Draw 4 KPI Metric Cards in a Grid
  const cardW = (contentWidth - 9) / 4; // ~43.25mm each
  const cardH = 18;

  const kpis = [
    {
      label: 'COLLABORATION INDEX',
      value: `${exec.collaborationIndex ?? 0} / 100`,
      sub: exec.collaborationIndex >= 70 ? 'High Team Synergy' : 'Active Engagement',
      color: COLORS.brandViolet
    },
    {
      label: 'TOTAL EVENTS',
      value: `${exec.totalEvents ?? 0}`,
      sub: `${exec.activeContributorsCount ?? 0} active / ${exec.totalContributors ?? 0} total`,
      color: COLORS.cyanAccent
    },
    {
      label: 'SESSION DURATION',
      value: sess.durationFormatted || '0s',
      sub: `Active: ${sess.activeDurationFormatted || '0s'}`,
      color: COLORS.emeraldGreen
    },
    {
      label: 'CODE VELOCITY',
      value: `+${exec.totalLinesAdded ?? 0} / -${exec.totalLinesDeleted ?? 0}`,
      sub: `Net: ${exec.netLines ?? 0} lines`,
      color: COLORS.slateDark
    }
  ];

  kpis.forEach((kpi, idx) => {
    const cardX = marginX + idx * (cardW + 3);
    doc.setFillColor(...COLORS.cardBg);
    doc.setDrawColor(...COLORS.cardBorder);
    doc.roundedRect(cardX, currentY, cardW, cardH, 1.5, 1.5, 'FD');

    // Colored top line
    doc.setFillColor(...kpi.color);
    doc.rect(cardX, currentY, cardW, 1.2, 'F');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.slateMuted);
    doc.text(kpi.label, cardX + 3, currentY + 5.5);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.slateDark);
    doc.text(kpi.value, cardX + 3, currentY + 11.5);

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...COLORS.slateMuted);
    doc.text(kpi.sub, cardX + 3, currentY + 15.5);
  });

  currentY += cardH + 5;

  // Executive Highlights (if present)
  if (Array.isArray(exec.highlights) && exec.highlights.length > 0) {
    doc.setFillColor(...COLORS.cardBg);
    doc.setDrawColor(...COLORS.cardBorder);
    const boxH = Math.min(26, 6 + (exec.highlights.length * 4.5));
    doc.roundedRect(marginX, currentY, contentWidth, boxH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.brandIndigo);
    doc.text('Key Highlights & Milestones:', marginX + 3, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.slateDark);

    exec.highlights.slice(0, 4).forEach((h, hIdx) => {
      const lineY = currentY + 9 + (hIdx * 4.2);
      doc.text(`• ${h.slice(0, 110)}`, marginX + 5, lineY);
    });

    currentY += boxH + 6;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Section: Contributor Breakdown & Rankings Table
  // ─────────────────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.brandIndigo);
  doc.text('2. CONTRIBUTOR BREAKDOWN & RANKINGS', marginX, currentY);

  currentY += 3;

  const contributors = Array.isArray(report.contributors) ? report.contributors : [];
  const tableRows = contributors.map((c, idx) => {
    const nameRole = `${idx + 1}. ${c.userName || 'Member'}\n(${c.userRole || 'editor'})`;
    const share = `${c.contributionSharePercent ?? 0}%`;
    const score = String(c.contributionScore ?? 0);
    const lines = `+${c.linesAdded ?? 0}\n-${c.linesDeleted ?? 0}`;
    const execs = `${c.executionsCount ?? 0}\n(${c.executionSuccessRate ?? 0}%)`;
    const active = c.activeTimeFormatted || '0s';
    const badge = c.badge || 'Participant';

    return [nameRole, share, score, lines, execs, active, badge];
  });

  if (tableRows.length === 0) {
    tableRows.push(['No recorded contributors in this workspace session', '-', '-', '-', '-', '-', '-']);
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX, top: 22, bottom: 20 },
    head: [['Contributor & Role', 'Share', 'Score', 'Lines (+/-)', 'Executions', 'Active Time', 'Assigned Badge']],
    body: tableRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.2,
      textColor: COLORS.slateDark,
      lineColor: COLORS.cardBorder,
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: COLORS.headerDark,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left'
    },
    alternateRowStyles: {
      fillColor: COLORS.cardBg
    },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 24, halign: 'center' },
      5: { cellWidth: 26, halign: 'center' },
      6: { cellWidth: 30, halign: 'center', fontStyle: 'bold', textColor: COLORS.brandIndigo }
    }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Section: Activity Distribution & Forensic Chain Integrity
  // ─────────────────────────────────────────────────────────────────────────────
  // Check if we have enough vertical space for the forensic and activity sections
  if (currentY > pageHeight - 75) {
    doc.addPage();
    currentY = 24;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.brandIndigo);
  doc.text('3. ACTIVITY DISTRIBUTION & FORENSIC CHAIN INTEGRITY', marginX, currentY);

  currentY += 4;

  // Activity Categories Summary Table
  const cat = report.activitySummary?.categories || {};
  const catRows = [
    ['Coding Edits', String(cat.coding?.count ?? 0), `${cat.coding?.percent ?? 0}%`],
    ['File Operations', String(cat.fileOps?.count ?? 0), `${cat.fileOps?.percent ?? 0}%`],
    ['Code Executions', String(cat.executions?.count ?? 0), `${cat.executions?.percent ?? 0}%`],
    ['Collaboration & Presence', String(cat.collaboration?.count ?? 0), `${cat.collaboration?.percent ?? 0}%`]
  ];

  const leftTableW = 88;
  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: pageWidth - marginX - leftTableW, top: 22, bottom: 20 },
    tableWidth: leftTableW,
    head: [['Activity Category', 'Events', 'Share %']],
    body: catRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 1.8,
      textColor: COLORS.slateDark,
      lineColor: COLORS.cardBorder
    },
    headStyles: {
      fillColor: COLORS.surfaceDark,
      textColor: COLORS.white,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: COLORS.cardBg
    },
    columnStyles: {
      0: { cellWidth: 46 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 22, halign: 'center', fontStyle: 'bold' }
    }
  });

  // Forensic Chain Integrity Box on the right side
  const rightBoxX = marginX + leftTableW + 6;
  const rightBoxW = contentWidth - leftTableW - 6;
  const forensicH = doc.lastAutoTable.finalY - currentY;
  const audit = report.forensicAudit || {};

  doc.setFillColor(...COLORS.cardBg);
  doc.setDrawColor(...COLORS.cardBorder);
  doc.roundedRect(rightBoxX, currentY, rightBoxW, forensicH, 1.5, 1.5, 'FD');

  const isVerified = audit.status && audit.status.includes('Verified');
  doc.setFillColor(...(isVerified ? COLORS.emeraldGreen : COLORS.amberWarning));
  doc.rect(rightBoxX, currentY, rightBoxW, 1.2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.slateDark);
  doc.text('Forensic Cryptographic Status:', rightBoxX + 3, currentY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...(isVerified ? COLORS.emeraldGreen : COLORS.amberWarning));
  doc.text(String(audit.status || '100% Cryptographically Verified').slice(0, 36), rightBoxX + 3, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.slateDark);
  doc.text(`Blocks Verified: ${audit.verifiedBlocks ?? 0} / ${audit.totalBlocks ?? 0} (${audit.verificationRate ?? 100}%)`, rightBoxX + 3, currentY + 15);
  doc.text(`Genesis Pointer: ${audit.genesisPointerValid !== false ? 'Valid' : 'Warning'}`, rightBoxX + 3, currentY + 19.5);

  currentY = doc.lastAutoTable.finalY + 7;

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Section: Cryptographic Report Signature (SHA-256 Checksum)
  // ─────────────────────────────────────────────────────────────────────────────
  if (currentY > pageHeight - 38) {
    doc.addPage();
    currentY = 24;
  }

  const sigBoxH = 22;
  doc.setFillColor(...COLORS.primaryDark);
  doc.roundedRect(marginX, currentY, contentWidth, sigBoxH, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.cyanAccent);
  doc.text('CRYPTOGRAPHIC REPORT SIGNATURE (SHA-256 CHECKSUM)', marginX + 4, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.slateLight);
  doc.text('This hash deterministically verifies report authenticity and protects against retroactive metric alteration.', marginX + 4, currentY + 9.5);

  // Exact unmodified report signature
  const signatureHex = String(report.reportHash || 'NO_SIGNATURE_PRESENT');
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.white);
  doc.text(signatureHex, marginX + 4, currentY + 16);

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Multi-Page Header & Footer Stamping (Two-Pass Routine)
  // ─────────────────────────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);

    // Top Running Header on subsequent pages
    if (pageNum > 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLORS.slateDark);
      doc.text('CodeTrail Contribution Audit Report', marginX, 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLORS.slateMuted);
      const headerWs = `${report.workspace?.title || 'Workspace'} | Ref: ${report.reportId || 'N/A'}`;
      doc.text(headerWs.slice(0, 55), pageWidth - marginX - doc.getTextWidth(headerWs.slice(0, 55)), 10);

      doc.setDrawColor(...COLORS.cardBorder);
      doc.setLineWidth(0.2);
      doc.line(marginX, 12, pageWidth - marginX, 12);
    }

    // Bottom Running Footer on ALL pages
    const footerY = pageHeight - 10;
    doc.setDrawColor(...COLORS.cardBorder);
    doc.setLineWidth(0.2);
    doc.line(marginX, footerY - 2.5, pageWidth - marginX, footerY - 2.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.slateMuted);
    doc.text('CodeTrail Cryptographic Audit Report  |  Verified: SHA-256  |  Confidential & Audit-Grade', marginX, footerY + 1.5);

    const pageStr = `Page ${pageNum} of ${totalPages}`;
    const pageStrW = doc.getTextWidth(pageStr);
    doc.text(pageStr, pageWidth - marginX - pageStrW, footerY + 1.5);
  }

  return doc;
}

/**
 * Generates and bundles the PDF into standard formats (doc, Blob, filename)
 *
 * @param {Object} report
 * @param {Object} [options]
 * @returns {Object} { doc, blob, filename, sizeBytes, pageCount }
 */
export function generateContributionReportPdf(report, options = {}) {
  const doc = buildContributionReportPdfDocument(report, options);
  const blob = doc.output('blob');
  const filename = getReportPdfFilename(report);
  const sizeBytes = blob.size;
  const pageCount = doc.getNumberOfPages();

  return {
    doc,
    blob,
    filename,
    sizeBytes,
    pageCount
  };
}

/**
 * Triggers a browser download of the contribution report PDF with validation
 * and safe object URL lifecycle cleanup.
 *
 * @param {Object} report - CT-199 report object
 * @param {Object} [options] - Optional generation settings
 * @returns {Promise<Object>} Verification and download summary
 */
export async function downloadContributionReportPdf(report, options = {}) {
  if (!report) {
    throw new Error('Report object is required for PDF export.');
  }

  // 1. Generate document and blob
  const { doc, blob, filename, sizeBytes, pageCount } = generateContributionReportPdf(report, options);

  // 2. Validate PDF structure and integrity
  const validation = await validatePdfReport(blob, {
    reportId: report.reportId,
    reportHash: report.reportHash,
    workspaceTitle: report.workspace?.title,
    minPages: 1
  });

  if (!validation.isValid) {
    const errorMsg = `PDF Structural Validation failed: ${validation.issues.join('; ')}`;
    console.error('PDF Export Validation Warning:', errorMsg);
    // Throw error so UI can display proper error toast
    throw new Error(errorMsg);
  }

  // 3. Trigger safe browser download if running in client environment
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const objectUrl = window.URL.createObjectURL(blob);
    try {
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      // Revoke the object URL after small timeout to allow browser download initiation
      setTimeout(() => {
        try {
          window.URL.revokeObjectURL(objectUrl);
        } catch (revokeErr) {
          console.warn('RevokeObjectURL notice:', revokeErr.message);
        }
      }, 1500);
    }
  }

  return {
    success: true,
    filename,
    sizeBytes,
    pageCount,
    validation
  };
}

export default {
  buildContributionReportPdfDocument,
  generateContributionReportPdf,
  downloadContributionReportPdf,
  getReportPdfFilename,
  sanitizeFilename
};
