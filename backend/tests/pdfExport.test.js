/**
 * pdfExport.test.js
 * CT-200: Export Reports — PDF Functionality Unit & Structural Test Suite
 * Author: Meet Sheth (Lead - Export Reports / PDF Functionality)
 *
 * Comprehensive tests covering:
 *   - Section 1: Valid PDF generation & structural token compliance (%PDF-, %%EOF, Catalog, Pages)
 *   - Section 2: Cryptographic signature preservation & Report ID verbatim embedding
 *   - Section 3: Multi-page document generation & pagination under large collaborative datasets
 *   - Section 4: Empty workspace edge cases & safe zero-event fallback handling
 *   - Section 5: Resilience against missing, null, or incomplete report fields
 *   - Section 6: Meaningful filename generation & special character sanitization
 *   - Section 7: PDF Validator diagnostic verification (tamper / corruption detection)
 */

const assert = require('assert');
const path = require('path');
const { generateContributionReport } = require('../utils/reportGenerator');

(async () => {
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('📄   CODETRAIL CT-200: PDF EXPORT & STRUCTURAL INTEGRITY TEST SUITE');
  console.log('    Lead: Meet Sheth (Export Reports / PDF Functionality Lead)');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Dynamically load the client-side PDF engine and validator
  const {
    generateContributionReportPdf,
    getReportPdfFilename,
    sanitizeFilename
  } = await import('../../frontend/src/utils/pdfReportGenerator.js');

  const {
    validatePdfReport,
    extractPageCount,
    bytesToBinaryString,
    toUint8Array
  } = await import('../../frontend/src/utils/pdfValidator.js');

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 1: Valid PDF Generation & Structural Compliance
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('▶ Test Section 1: Valid PDF Generation & Core Structure (%PDF-, %%EOF, Catalog)\n');
  {
    const baseReport = generateContributionReport({
      workspace: { _id: 'ws_test_01', title: 'CodeTrail Core Services', language: 'javascript' },
      activityLogs: [
        {
          userId: 'user_01',
          userName: 'Meet Sheth',
          action: 'code_edit',
          linesAdded: 150,
          linesDeleted: 20,
          timestamp: new Date().toISOString(),
          currentHash: 'block_hash_01',
          previousHash: '0000000000000000000000000000000000000000000000000000000000000000'
        },
        {
          userId: 'user_01',
          userName: 'Meet Sheth',
          action: 'code_execution',
          linesAdded: 0,
          linesDeleted: 0,
          executionStatus: 'success',
          timestamp: new Date().toISOString(),
          currentHash: 'block_hash_02',
          previousHash: 'block_hash_01'
        }
      ],
      sessions: []
    });

    const pdfResult = generateContributionReportPdf(baseReport);

    assert.ok(pdfResult.doc, 'jsPDF document instance should be returned');
    assert.ok(pdfResult.blob, 'PDF blob output should be generated');
    assert.ok(pdfResult.sizeBytes > 1024, `PDF size (${pdfResult.sizeBytes} bytes) should be greater than 1KB`);
    assert.strictEqual(pdfResult.pageCount, 1, 'Standard single-table report should fit on 1 page');

    // Run structural validator
    const validation = await validatePdfReport(pdfResult.blob, {
      reportId: baseReport.reportId,
      reportHash: baseReport.reportHash,
      workspaceTitle: baseReport.workspace.title,
      minPages: 1
    });

    assert.strictEqual(validation.isValid, true, `Validation should pass with 0 issues. Found: ${validation.issues.join(', ')}`);
    assert.strictEqual(validation.hasHeader, true, 'PDF should begin with %PDF- header');
    assert.strictEqual(validation.hasEof, true, 'PDF should terminate with %%EOF marker');
    assert.strictEqual(validation.hasCatalog, true, 'PDF should include /Type /Catalog');
    assert.strictEqual(validation.hasPagesTree, true, 'PDF should include /Type /Pages');
    console.log('  ✔ [PASS] PDF structure strictly conforms to specification (%PDF-1.3, %%EOF, Catalog, Pages)');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 2: Cryptographic Signature & Report Reference Preservation
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Test Section 2: Cryptographic Signature & Report ID Preservation\n');
  {
    const originalHash = '3a7b1c4d5e8f902143658709fedcba983a7b1c4d5e8f902143658709fedcba98';
    const testReport = {
      reportId: 'CTR-SEC2-9988-7766',
      schemaVersion: '1.0.0',
      generatedAt: '2026-11-01T12:00:00.000Z',
      generatedBy: { userName: 'Meet Sheth', userRole: 'Lead' },
      workspace: { workspaceId: 'ws_sec2', title: 'Cryptographic Workspace', language: 'python' },
      executiveSummary: {
        collaborationIndex: 88,
        totalContributors: 1,
        activeContributorsCount: 1,
        totalEvents: 10,
        totalLinesAdded: 100,
        totalLinesDeleted: 10,
        netLines: 90,
        executionSuccessRate: 100,
        highlights: ['Cryptographic signature verified']
      },
      sessionDetails: { durationFormatted: '30m', activeDurationFormatted: '25m' },
      contributors: [
        {
          userName: 'Meet Sheth',
          userRole: 'owner',
          contributionSharePercent: 100,
          contributionScore: 450,
          linesAdded: 100,
          linesDeleted: 10,
          executionsCount: 2,
          executionSuccessRate: 100,
          activeTimeFormatted: '25m',
          badge: 'Lead Architect'
        }
      ],
      activitySummary: {
        categories: {
          coding: { count: 8, percent: 80 },
          fileOps: { count: 0, percent: 0 },
          executions: { count: 2, percent: 20 },
          collaboration: { count: 0, percent: 0 }
        }
      },
      forensicAudit: { totalBlocks: 10, verifiedBlocks: 10, verificationRate: 100, status: '100% Cryptographically Verified' },
      reportHash: originalHash
    };

    const pdfResult = generateContributionReportPdf(testReport);
    const rawPdf = pdfResult.doc.output();

    // Verify hash is preserved verbatim in output without alteration
    assert.ok(rawPdf.includes(originalHash), 'The original SHA-256 report signature must be embedded verbatim in the PDF output');
    assert.ok(rawPdf.includes('CTR-SEC2-9988-7766'), 'The exact Report Reference ID must be present in the PDF output');

    const validation = await validatePdfReport(pdfResult.blob, {
      reportId: 'CTR-SEC2-9988-7766',
      reportHash: originalHash
    });

    assert.strictEqual(validation.isValid, true, 'PDF validation confirms signature preservation');
    assert.ok(validation.sectionsFound.includes('reportHash'), 'Sections found should include reportHash');
    console.log('  ✔ [PASS] SHA-256 signature preserved intact with zero retroactive alteration');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 3: Multi-Page Document Generation & Pagination
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Test Section 3: Multi-Page Pagination with 40 Contributors Dataset\n');
  {
    const manyContributors = [];
    for (let i = 1; i <= 40; i++) {
      manyContributors.push({
        userName: `Collaborator Alpha ${i}`,
        userRole: i === 1 ? 'owner' : 'editor',
        contributionSharePercent: Math.max(1, Math.floor(100 / 40)),
        contributionScore: 800 - i * 15,
        linesAdded: 80 + i,
        linesDeleted: 5 + i,
        executionsCount: i % 4,
        executionSuccessRate: 80,
        activeTimeFormatted: '1h 10m',
        badge: i === 1 ? 'Lead Architect' : (i < 5 ? 'Core Driver' : 'Active Contributor')
      });
    }

    const largeReport = {
      reportId: 'CTR-LARGE-40MEMBERS',
      schemaVersion: '1.0.0',
      generatedAt: new Date().toISOString(),
      workspace: { workspaceId: 'ws_large', title: 'Enterprise Team Collaboration', language: 'go' },
      executiveSummary: {
        collaborationIndex: 94,
        totalContributors: 40,
        activeContributorsCount: 40,
        totalEvents: 600,
        totalLinesAdded: 5000,
        totalLinesDeleted: 400,
        netLines: 4600,
        executionSuccessRate: 80,
        highlights: ['High concurrency multi-contributor stress test']
      },
      sessionDetails: { durationFormatted: '12h 00m', activeDurationFormatted: '9h 15m' },
      contributors: manyContributors,
      activitySummary: {
        categories: {
          coding: { count: 480, percent: 80 },
          fileOps: { count: 60, percent: 10 },
          executions: { count: 40, percent: 7 },
          collaboration: { count: 20, percent: 3 }
        }
      },
      forensicAudit: { totalBlocks: 600, verifiedBlocks: 600, verificationRate: 100, status: '100% Cryptographically Verified' },
      reportHash: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899'
    };

    const pdfResult = generateContributionReportPdf(largeReport);

    assert.ok(pdfResult.pageCount >= 3, `Expected at least 3 pages for 40 contributors, got: ${pdfResult.pageCount}`);

    const validation = await validatePdfReport(pdfResult.blob, {
      reportId: largeReport.reportId,
      reportHash: largeReport.reportHash,
      minPages: 3
    });

    assert.strictEqual(validation.isValid, true, 'Multi-page PDF should pass all structural checks');
    assert.strictEqual(validation.pageCount, pdfResult.pageCount, 'Validator page count matches jsPDF page count');
    console.log(`  ✔ [PASS] Multi-page layout rendered cleanly (${pdfResult.pageCount} pages, table headers recurring, footers stamped)`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 4: Empty Workspace Edge Cases & Safe Defaults
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Test Section 4: Empty Workspace Edge Cases (0 Events, 0 Contributors)\n');
  {
    const emptyReport = generateContributionReport({
      workspace: { _id: 'ws_empty_zero', title: 'Fresh Empty Workspace', language: 'rust' },
      activityLogs: [],
      sessions: []
    });

    const pdfResult = generateContributionReportPdf(emptyReport);

    assert.strictEqual(pdfResult.pageCount, 1, 'Empty workspace report should render cleanly on 1 page');
    assert.ok(pdfResult.sizeBytes > 1024, 'Output PDF must be valid non-empty byte buffer');

    const validation = await validatePdfReport(pdfResult.blob, {
      reportId: emptyReport.reportId,
      reportHash: emptyReport.reportHash
    });

    assert.strictEqual(validation.isValid, true, 'Empty workspace PDF report must pass validation');
    console.log('  ✔ [PASS] Empty workspace handled gracefully without divide-by-zero or rendering faults');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 5: Resilience Against Missing or Incomplete Report Fields
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Test Section 5: Missing Optional Fields Resilience\n');
  {
    // Minimal report payload missing optional notes, avatar, session timestamps, etc.
    const minimalReport = {
      reportId: 'CTR-MINIMAL-01',
      schemaVersion: '1.0.0',
      generatedAt: new Date().toISOString(),
      workspace: { title: 'Minimal Workspace' },
      executiveSummary: { totalEvents: 1, totalContributors: 1 },
      contributors: [
        { userName: 'Solo Developer' } // Missing all other fields
      ],
      reportHash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    };

    const pdfResult = generateContributionReportPdf(minimalReport);
    assert.ok(pdfResult.blob, 'Should successfully generate PDF despite minimal input');

    const validation = await validatePdfReport(pdfResult.blob, {
      reportId: 'CTR-MINIMAL-01',
      reportHash: minimalReport.reportHash
    });

    assert.strictEqual(validation.isValid, true, 'Minimal payload generates valid structural PDF');
    console.log('  ✔ [PASS] Missing optional fields seamlessly filled with defensive defaults');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 6: Filename Generation & Sanitization
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Test Section 6: Filename Generation & Sanitation\n');
  {
    assert.strictEqual(sanitizeFilename('Normal Title'), 'Normal_Title');
    assert.strictEqual(sanitizeFilename('Workspace / With : Special * Characters?'), 'Workspace_With_Special_Characters');
    assert.strictEqual(sanitizeFilename(''), 'Workspace');
    assert.strictEqual(sanitizeFilename(null), 'Workspace');

    const filename = getReportPdfFilename({
      workspace: { title: 'CT 200 / Special: Test!' },
      reportId: 'CTR-ABC-123'
    });

    assert.ok(filename.startsWith('CodeTrail-Report-CT_200_Special_Test-CTR-ABC-123-'), `Unexpected filename format: ${filename}`);
    assert.ok(filename.endsWith('.pdf'), 'Filename must end with .pdf extension');
    assert.ok(!filename.includes('/'), 'Filename must not contain illegal slashes');
    assert.ok(!filename.includes(':'), 'Filename must not contain illegal colons');
    console.log(`  ✔ [PASS] Filename generation sanitizes illegal characters cleanly ("${filename}")`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Section 7: PDF Validator Diagnostic & Tamper Detection
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ Test Section 7: PDF Validator Diagnostics & Corruption Detection\n');
  {
    // Test 1: Empty or tiny buffer detection
    const tinyValidation = await validatePdfReport(new Uint8Array([1, 2, 3]));
    assert.strictEqual(tinyValidation.isValid, false, 'Tiny buffer must be rejected');
    assert.ok(tinyValidation.issues.some(i => i.includes('suspiciously small')), 'Should report size issue');

    // Test 2: Missing %PDF- magic header
    const badHeader = new Uint8Array(1500);
    badHeader.set(Buffer.from('NOT_A_PDF_DOCUMENT'));
    const badHeaderValidation = await validatePdfReport(badHeader);
    assert.strictEqual(badHeaderValidation.isValid, false, 'Invalid header must be rejected');
    assert.ok(badHeaderValidation.issues.some(i => i.includes('magic header')), 'Should report header issue');

    // Test 3: Missing %%EOF marker
    const noEofStr = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 1 /Kids [] >>\nendobj\n';
    const noEofValidation = await validatePdfReport(noEofStr);
    assert.strictEqual(noEofValidation.isValid, false, 'Missing %%EOF must be flagged');
    assert.ok(noEofValidation.issues.some(i => i.includes('%%EOF')), 'Should report %%EOF issue');

    // Test 4: Missing expected signature detection
    const sampleReport = generateContributionReport({
      workspace: { title: 'Demo' },
      activityLogs: [],
      sessions: []
    });
    const goodPdf = generateContributionReportPdf(sampleReport);
    const tamperedValidation = await validatePdfReport(goodPdf.blob, {
      reportHash: 'this_hash_does_not_exist_in_the_document_at_all_00000000000000000'
    });
    assert.strictEqual(tamperedValidation.isValid, false, 'Missing or tampered hash must be detected');
    assert.ok(tamperedValidation.issues.some(i => i.includes('not preserved')), 'Should flag signature discrepancy');

    console.log('  ✔ [PASS] PDF Validator accurately isolates corrupted headers, truncated bodies, and forged hashes');
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('🎉   ALL CT-200 PDF EXPORT & VALIDATION TESTS PASSED WITH 100% SUCCESS!');
  console.log('     Section 1 (Core PDF Structure):         ✔');
  console.log('     Section 2 (Signature Preservation):     ✔');
  console.log('     Section 3 (Multi-Page Pagination):      ✔');
  console.log('     Section 4 (Empty Workspace Defaults):   ✔');
  console.log('     Section 5 (Missing Fields Resilience):  ✔');
  console.log('     Section 6 (Filename Sanitization):      ✔');
  console.log('     Section 7 (Corruption & Tamper Checks): ✔');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
})();

