/**
 * pdfValidator.js
 * CT-200: Contribution Report PDF Export Validator
 * Author: Meet Sheth (Lead - Export Reports / PDF Functionality)
 *
 * Dedicated PDF structural & content validation engine that verifies:
 *   - Magic byte header (%PDF-1.3 through %PDF-1.7)
 *   - File size boundaries (non-empty, minimum valid PDF size)
 *   - Document trailer & EOF marker (%%EOF)
 *   - Document catalog and page tree structure (/Type /Catalog, /Type /Pages)
 *   - Actual page count extraction and verification
 *   - Stream text extraction (handling uncompressed streams and font dictionaries)
 *   - Content section integrity (Report ID, Workspace Title, Executive Summary, Contributors, Forensic hash)
 *   - Cryptographic signature preservation check
 */

/**
 * Normalizes any PDF input (Blob, ArrayBuffer, Uint8Array, Buffer, or binary string) into a Uint8Array
 * @param {Blob|ArrayBuffer|Uint8Array|Buffer|string} input
 * @returns {Promise<Uint8Array>}
 */
export async function toUint8Array(input) {
  if (!input) {
    throw new Error('PDF input is required and cannot be null or undefined.');
  }

  // Browser Blob / File
  if (typeof Blob !== 'undefined' && input instanceof Blob) {
    const arrayBuffer = await input.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  // ArrayBuffer
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }

  // Uint8Array or Buffer
  if (input instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(input))) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }

  // String (binary string or UTF-8 string)
  if (typeof input === 'string') {
    const bytes = new Uint8Array(input.length);
    for (let i = 0; i < input.length; i++) {
      bytes[i] = input.charCodeAt(i) & 0xff;
    }
    return bytes;
  }

  throw new Error(`Unsupported PDF input type: ${typeof input}`);
}

/**
 * Extracts binary text representation from bytes (for structural token inspection)
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function bytesToBinaryString(bytes) {
  const chunkSize = 16384;
  let str = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    str += String.fromCharCode.apply(null, chunk);
  }
  return str;
}

/**
 * Decompresses a raw byte stream if zlib is available in Node.js
 * @param {Uint8Array} streamBytes
 * @returns {string}
 */
function safeInflateStream(streamBytes) {
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    try {
      const zlibModule = 'zlib';
      const zlib = (typeof require === 'function') ? require(zlibModule) : null;
      if (zlib) {
        const buf = Buffer.from(streamBytes.buffer, streamBytes.byteOffset, streamBytes.byteLength);
        try {
          return zlib.inflateSync(buf).toString('latin1');
        } catch {
          try {
            return zlib.inflateRawSync(buf).toString('latin1');
          } catch {
            // Not zlib compressed
          }
        }
      }
    } catch {
      // Ignore
    }
  }
  return bytesToBinaryString(streamBytes);
}

/**
 * Extracts all searchable text content across PDF dictionaries, uncompressed streams, and flate streams
 * @param {Uint8Array} bytes
 * @returns {Promise<string>} Complete aggregated searchable text corpus
 */
export async function extractAllPdfText(bytes) {
  const raw = bytesToBinaryString(bytes);
  let corpus = raw;

  // Search for stream ... endstream blocks
  const streamPattern = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  const matches = [...raw.matchAll(streamPattern)];

  for (const m of matches) {
    const streamContent = m[1];
    const streamBytes = new Uint8Array(streamContent.length);
    for (let i = 0; i < streamContent.length; i++) {
      streamBytes[i] = streamContent.charCodeAt(i) & 0xff;
    }
    const inflated = safeInflateStream(streamBytes);
    corpus += '\n' + inflated;
  }

  return corpus;
}

/**
 * Extracts the declared or counted number of pages from a PDF's raw structure
 * @param {string} raw
 * @returns {number}
 */
export function extractPageCount(raw) {
  // Method 1: Count /Type /Page (excluding /Pages)
  const pageMatches = raw.match(/\/Type\s*\/Page\b(?!\s*s)/g);
  if (pageMatches && pageMatches.length > 0) {
    return pageMatches.length;
  }

  // Method 2: Match /Count in the root /Pages object
  const countMatch = raw.match(/\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)/);
  if (countMatch && countMatch[1]) {
    return parseInt(countMatch[1], 10);
  }

  return 0;
}

/**
 * Master PDF Validator for CT-200 Export Reports
 *
 * @param {Blob|ArrayBuffer|Uint8Array|Buffer|string} input - The PDF output to validate
 * @param {Object} [expectedMetadata] - Optional expected report metadata to assert
 * @param {string} [expectedMetadata.reportId]
 * @param {string} [expectedMetadata.reportHash]
 * @param {string} [expectedMetadata.workspaceTitle]
 * @param {number} [expectedMetadata.minPages=1]
 * @returns {Promise<Object>} Structured validation result
 */
export async function validatePdfReport(input, expectedMetadata = {}) {
  const issues = [];
  const warnings = [];

  let bytes;
  try {
    bytes = await toUint8Array(input);
  } catch (err) {
    return {
      isValid: false,
      sizeBytes: 0,
      pageCount: 0,
      version: null,
      issues: [err.message],
      warnings: []
    };
  }

  const sizeBytes = bytes.length;

  // 1. Minimum file size check
  if (sizeBytes < 500) {
    issues.push(`PDF file size is suspiciously small (${sizeBytes} bytes). Valid PDF reports are expected to be at least 500 bytes.`);
  }

  const raw = bytesToBinaryString(bytes);

  // 2. Magic Header Check (%PDF-X.Y)
  let version = null;
  const headerMatch = raw.slice(0, 32).match(/^%PDF-(\d+\.\d+)/);
  if (headerMatch) {
    version = headerMatch[1];
  } else {
    issues.push('Missing or invalid PDF magic header at byte offset 0. Expected "%PDF-1.x".');
  }

  // 3. Document End-of-File Marker (%%EOF)
  const tail = raw.slice(-1024);
  const hasEof = tail.includes('%%EOF');
  if (!hasEof) {
    issues.push('Missing "%%EOF" terminal marker in PDF trailer.');
  }

  // 4. Catalog & Page Tree Structure
  const hasCatalog = /\/Type\s*\/Catalog/.test(raw) || /\/Catalog\b/.test(raw);
  if (!hasCatalog) {
    issues.push('Missing PDF Document Catalog object ("/Type /Catalog").');
  }

  const hasPagesTree = /\/Type\s*\/Pages\b/.test(raw);
  if (!hasPagesTree) {
    issues.push('Missing PDF Page Tree object ("/Type /Pages").');
  }

  // 5. Page Count Validation
  const pageCount = extractPageCount(raw);
  const minPages = expectedMetadata.minPages || 1;
  if (pageCount < minPages) {
    issues.push(`Insufficient page count: found ${pageCount} page(s), expected at least ${minPages}.`);
  }

  // 6. Comprehensive Text Content Extraction (decompressing page streams if needed)
  const fullText = await extractAllPdfText(bytes);
  const sectionsFound = [];

  if (expectedMetadata.reportId) {
    if (fullText.includes(expectedMetadata.reportId)) {
      sectionsFound.push('reportId');
    } else {
      issues.push(`Report ID "${expectedMetadata.reportId}" was not found in the PDF stream.`);
    }
  }

  if (expectedMetadata.reportHash) {
    // The report cryptographic signature must be preserved without modification
    if (fullText.includes(expectedMetadata.reportHash)) {
      sectionsFound.push('reportHash');
    } else {
      issues.push(`Cryptographic signature "${expectedMetadata.reportHash}" was not preserved in the PDF output.`);
    }
  }

  if (expectedMetadata.workspaceTitle) {
    const cleanTitle = expectedMetadata.workspaceTitle.replace(/[^\w\s-]/g, '').trim();
    if (fullText.includes(expectedMetadata.workspaceTitle) || (cleanTitle && fullText.includes(cleanTitle))) {
      sectionsFound.push('workspaceTitle');
    } else {
      warnings.push(`Workspace title "${expectedMetadata.workspaceTitle}" not found verbatim in extracted text.`);
    }
  }

  // Check standard section signatures
  const sectionKeywords = [
    { key: 'executiveSummary', regex: /Executive Summary/i },
    { key: 'contributors', regex: /Contributor/i },
    { key: 'forensicAudit', regex: /Forensic/i }
  ];

  sectionKeywords.forEach(({ key, regex }) => {
    if (regex.test(fullText)) {
      sectionsFound.push(key);
    }
  });

  const isValid = issues.length === 0;

  return {
    isValid,
    sizeBytes,
    pageCount,
    version: version ? `PDF-${version}` : 'Unknown',
    hasHeader: !!headerMatch,
    hasEof,
    hasCatalog,
    hasPagesTree,
    sectionsFound,
    issues,
    warnings
  };
}

export default {
  toUint8Array,
  bytesToBinaryString,
  extractAllPdfText,
  extractPageCount,
  validatePdfReport
};
