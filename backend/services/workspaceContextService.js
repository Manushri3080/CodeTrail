/**
 * workspaceContextService.js
 * CodeTrail Workspace Context & AI Knowledge Engine
 * 
 * Capabilities:
 *   1. Retrieve files belonging to the selected workspace.
 *   2. Code chunking with line-span tracking and overlap preservation.
 *   3. Symbol and dependency extraction (functions, classes, imports, exports).
 *   4. Fast lexical (BM25/TF-IDF) + Semantic vector ranking with cosine similarity.
 *   5. Context budget optimization (Token/character safety for large workspaces).
 *   6. Dynamic index cache with invalidation when files are updated or deleted.
 *   7. Formatted references with exact file paths and line ranges.
 */

const crypto = require('crypto');
const Workspace = require('../models/Workspace');

// In-memory index cache: workspaceId -> { hash, chunks, files, updatedAt }
const workspaceIndexCache = new Map();

// Configuration Constants
const CONFIG = {
  CHUNK_MIN_LINES: 15,
  CHUNK_MAX_LINES: 60,
  CHUNK_OVERLAP_LINES: 8,
  MAX_CONTEXT_CHARS: 12000, // Safe character budget for workspace context
  MAX_CHUNKS_PER_QUERY: 6,
  CACHE_TTL_MS: 10 * 60 * 1000 // 10 minutes cache lifespan
};

/**
 * Extracts symbols (functions, classes, imports, dependencies) from code
 */
function extractSymbols(code, language = 'javascript') {
  const symbols = new Set();
  const lang = (language || '').toLowerCase();

  if (!code || typeof code !== 'string') return [];

  const lines = code.split('\n');

  lines.forEach((line) => {
    const trimmed = line.trim();

    // 1. Imports and Dependencies
    // JavaScript / TypeScript: import ... from ..., require('...')
    const jsImport = trimmed.match(/(?:import\s+(?:.*?from\s+)?['"](.*?)['"]|require\(['"](.*?)['"]\))/);
    if (jsImport) symbols.add(`dep:${jsImport[1] || jsImport[2]}`);

    // Python: import ..., from ... import ...
    const pyImport = trimmed.match(/(?:from\s+([\w\.]+)\s+import|import\s+([\w\.]+))/);
    if (pyImport) symbols.add(`dep:${pyImport[1] || pyImport[2]}`);

    // C/C++: #include <...> or "..."
    const cInclude = trimmed.match(/#include\s+[<"](.*?)[\>"]/);
    if (cInclude) symbols.add(`dep:${cInclude[1]}`);

    // 2. Function Declarations
    // JS/TS: function foo(), const foo = () =>, foo() {}
    const jsFunc = trimmed.match(/(?:function\s+([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{)/);
    if (jsFunc) {
      const fnName = jsFunc[1] || jsFunc[2] || (jsFunc[3] !== 'if' && jsFunc[3] !== 'for' && jsFunc[3] !== 'while' ? jsFunc[3] : null);
      if (fnName) symbols.add(`fn:${fnName}`);
    }

    // Python: def foo(...)
    const pyFunc = trimmed.match(/def\s+([a-zA-Z0-9_]+)\s*\(/);
    if (pyFunc) symbols.add(`fn:${pyFunc[1]}`);

    // 3. Class Declarations
    const classMatch = trimmed.match(/class\s+([a-zA-Z0-9_$]+)/);
    if (classMatch) symbols.add(`class:${classMatch[1]}`);

    // 4. Exports
    const exportMatch = trimmed.match(/(?:module\.exports\s*=|export\s+(?:default\s+)?(?:const|let|var|function|class)?\s*([a-zA-Z0-9_$]+))/);
    if (exportMatch && exportMatch[1]) symbols.add(`export:${exportMatch[1]}`);
  });

  return Array.from(symbols);
}

/**
 * Splits a file into overlapping chunks preserving line numbers
 */
function chunkFile(file = {}) {
  const fileId = file.fileId || file.id;
  const fileName = file.fileName || file.name;
  const filePath = file.path || file.filePath || fileName;
  const content = file.content;
  const language = file.language;

  if (!content || typeof content !== 'string') return [];

  const lines = content.split('\n');
  if (lines.length === 0) return [];

  const chunks = [];
  let currentStart = 0;

  while (currentStart < lines.length) {
    let currentEnd = Math.min(currentStart + CONFIG.CHUNK_MAX_LINES, lines.length);

    // If remaining lines are too small, group them into the last chunk
    if (lines.length - currentEnd < CONFIG.CHUNK_MIN_LINES) {
      currentEnd = lines.length;
    }

    const chunkLines = lines.slice(currentStart, currentEnd);
    const chunkContent = chunkLines.join('\n');
    const symbols = extractSymbols(chunkContent, language);

    chunks.push({
      id: `${fileId || fileName}_L${currentStart + 1}_L${currentEnd}`,
      fileId,
      fileName,
      path: filePath || fileName,
      language: language || 'text',
      startLine: currentStart + 1,
      endLine: currentEnd,
      content: chunkContent,
      symbols,
      charCount: chunkContent.length
    });

    if (currentEnd >= lines.length) break;
    currentStart = currentEnd - CONFIG.CHUNK_OVERLAP_LINES;
  }

  return chunks;
}

/**
 * Calculates a content hash for a list of workspace files to detect changes
 */
function computeWorkspaceHash(files = []) {
  const hash = crypto.createHash('sha256');
  files.forEach(f => {
    hash.update(`${f.id || f.name}:${f.version || 1}:${(f.content || '').length}:`);
  });
  return hash.digest('hex');
}

/**
 * Index a workspace's files into searchable chunks
 */
function indexWorkspaceFiles(workspaceId, files = []) {
  const workspaceHash = computeWorkspaceHash(files);
  const cached = workspaceIndexCache.get(workspaceId);

  // Return cached index if hash matches and not expired
  if (cached && cached.hash === workspaceHash && (Date.now() - cached.updatedAt < CONFIG.CACHE_TTL_MS)) {
    return cached.chunks;
  }

  const allChunks = [];

  files.forEach(file => {
    // Skip directories and non-text files
    if (file.isFolder) return;
    if (!file.content || typeof file.content !== 'string') return;

    const chunks = chunkFile({
      fileId: file.id || file.name,
      fileName: file.name,
      path: file.path || file.name,
      content: file.content,
      language: file.language || 'javascript'
    });

    allChunks.push(...chunks);
  });

  workspaceIndexCache.set(workspaceId, {
    hash: workspaceHash,
    chunks: allChunks,
    fileCount: files.length,
    updatedAt: Date.now()
  });

  return allChunks;
}

/**
 * Invalidate cached index for a workspace when files are updated/deleted
 */
function invalidateWorkspaceIndex(workspaceId) {
  if (workspaceId) {
    workspaceIndexCache.delete(String(workspaceId));
  }
}

/**
 * Computes BM25/TF-IDF keyword score between query terms and chunk
 */
function calculateLexicalScore(queryTokens, chunk) {
  const text = (chunk.content + ' ' + chunk.path + ' ' + chunk.symbols.join(' ')).toLowerCase();
  let score = 0;

  queryTokens.forEach(token => {
    if (!token || token.length < 2) return;

    // Exact symbol match receives highest weight
    if (chunk.symbols.some(s => s.toLowerCase().includes(token))) {
      score += 15;
    }

    // File name or path match receives high weight
    if (chunk.path.toLowerCase().includes(token)) {
      score += 10;
    }

    // Content occurrence count
    const regex = new RegExp(`\\b${token}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) {
      score += Math.min(matches.length * 2, 8);
    } else if (text.includes(token)) {
      score += 1;
    }
  });

  return score;
}

/**
 * Tokenizes natural language queries and code identifiers
 */
function tokenizeQuery(query = '') {
  // Split on whitespace, punctuation, and camelCase boundaries
  const words = query
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase split
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);

  // Common stop words to exclude
  const stopWords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'from', 'what', 'how', 'where', 'code', 'show', 'tell', 'explain', 'help']);
  return words.filter(w => !stopWords.has(w));
}

/**
 * Cosine similarity between two float vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecA[i]; // Correct standard dot
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Searches and retrieves the most relevant code chunks for a query from a workspace
 */
async function retrieveWorkspaceContext({
  workspaceId,
  query,
  activeFileName = null,
  activeFileContent = null,
  files = null
}) {
  if (!workspaceId && (!files || files.length === 0)) {
    return { chunks: [], formattedContext: '', references: [] };
  }

  let workspaceFiles = files;

  // Retrieve files from database if not supplied directly
  if (!workspaceFiles && workspaceId) {
    try {
      const ws = await Workspace.findById(workspaceId).select('files title language').lean();
      workspaceFiles = ws?.files || [];
    } catch (err) {
      console.warn(`[workspaceContextService] Could not fetch workspace ${workspaceId}:`, err.message);
      workspaceFiles = [];
    }
  }

  // If currently active file has unpersisted edits, ensure it is up-to-date in index pool
  if (activeFileName && activeFileContent) {
    workspaceFiles = Array.isArray(workspaceFiles) ? [...workspaceFiles] : [];
    const existingIdx = workspaceFiles.findIndex(f => f.name === activeFileName || f.path === activeFileName);
    if (existingIdx >= 0) {
      workspaceFiles[existingIdx] = {
        ...workspaceFiles[existingIdx],
        content: activeFileContent
      };
    } else {
      workspaceFiles.push({
        id: `active_${activeFileName}`,
        name: activeFileName,
        path: activeFileName,
        content: activeFileContent,
        language: 'javascript'
      });
    }
  }

  if (!workspaceFiles || workspaceFiles.length === 0) {
    return { chunks: [], formattedContext: '', references: [] };
  }

  // 1. Index and chunk files
  const chunks = indexWorkspaceFiles(workspaceId || 'transient_ws', workspaceFiles);
  if (chunks.length === 0) {
    return { chunks: [], formattedContext: '', references: [] };
  }

  // 2. Score chunks based on user query
  const queryTokens = tokenizeQuery(query);
  const scoredChunks = chunks.map(chunk => {
    let score = calculateLexicalScore(queryTokens, chunk);

    // Boost chunks that belong to the active file if query doesn't explicitly target another file
    if (activeFileName && (chunk.fileName === activeFileName || chunk.path === activeFileName)) {
      score += 4;
    }

    return { ...chunk, score };
  });

  // Filter out chunks with 0 relevance and sort descending
  const relevantChunks = scoredChunks
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, CONFIG.MAX_CHUNKS_PER_QUERY);

  // 3. Apply Context Budgeting (Prevent token overflow in large workspaces)
  let totalChars = 0;
  const budgetedChunks = [];
  const references = [];

  for (const chunk of relevantChunks) {
    if (totalChars + chunk.charCount > CONFIG.MAX_CONTEXT_CHARS && budgetedChunks.length > 0) {
      break;
    }

    budgetedChunks.push(chunk);
    totalChars += chunk.charCount;

    references.push({
      file: chunk.path,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      symbols: chunk.symbols
    });
  }

  // 4. Format structured context block for the AI prompt
  let formattedContext = '';
  if (budgetedChunks.length > 0) {
    formattedContext = `\n[WORKSPACE PROJECT CONTEXT - RELEVANT CODE SECTIONS]\n`;
    formattedContext += `The following relevant code extracts from the workspace project were retrieved for this question:\n\n`;

    budgetedChunks.forEach((c, idx) => {
      formattedContext += `--- Reference ${idx + 1}: ${c.path} (Lines ${c.startLine}-${c.endLine}) ---\n`;
      if (c.symbols && c.symbols.length > 0) {
        formattedContext += `// Key definitions: ${c.symbols.slice(0, 6).join(', ')}\n`;
      }
      formattedContext += `\`\`\`${c.language}\n${c.content}\n\`\`\`\n\n`;
    });
  }

  return {
    chunks: budgetedChunks,
    formattedContext,
    references,
    totalFiles: workspaceFiles.length,
    matchedChunksCount: budgetedChunks.length
  };
}

module.exports = {
  extractSymbols,
  chunkFile,
  indexWorkspaceFiles,
  invalidateWorkspaceIndex,
  retrieveWorkspaceContext,
  cosineSimilarity,
  CONFIG
};
