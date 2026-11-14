/**
 * workspaceContextService.js
 * CodeTrail Workspace Context & AI Knowledge Engine
 * 
 * Capabilities:
 *   1. Retrieve files belonging to the selected workspace.
 *   2. Code chunking with line-span tracking and overlap preservation.
 *   3. Symbol and dependency extraction (functions, classes, imports, exports).
 *   4. Lexical (BM25/TF-IDF-like) + semantic vector ranking with embeddings and cosine similarity.
 *   5. Context budget optimization (Token/character safety for large workspaces).
 *   6. Dynamic index cache with invalidation when files are updated or deleted.
 *   7. Formatted references with exact file paths and line ranges.
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const axios = require('axios');
const Workspace = require('../models/Workspace');

// In-memory index cache: workspaceId -> { hash, chunks, files, updatedAt, embeddingModel }
const workspaceIndexCache = new Map();
// In-memory embedding cache: textHash -> { vector, model }
const embeddingCache = new Map();

function getUserId(user) {
  if (!user) return null;
  const id = user._id || user.id || user;
  return id ? String(id) : null;
}

function canAccessWorkspaceContext(workspace, user) {
  if (!workspace) return false;
  if (workspace.settings && workspace.settings.isPublic === true) return true;
  const userId = getUserId(user);
  if (!userId) return false;
  const ownerId = workspace.owner ? String(workspace.owner._id || workspace.owner) : null;
  if (ownerId && ownerId === userId) return true;
  return Array.isArray(workspace.members) && workspace.members.some((member) => {
    const memberId = member?.user ? String(member.user._id || member.user) : null;
    return memberId === userId;
  });
}

// Configuration Constants
const CONFIG = {
  CHUNK_MIN_LINES: 15,
  CHUNK_MAX_LINES: 60,
  CHUNK_OVERLAP_LINES: 8,
  MAX_CONTEXT_CHARS: 12000, // Safe character budget for workspace context
  MAX_CHUNKS_PER_QUERY: 6,
  CACHE_TTL_MS: 10 * 60 * 1000, // 10 minutes cache lifespan
  LOCAL_EMBED_DIM: 128,
  MAX_EMBED_CHUNKS: 120,
  EMBED_TEXT_LIMIT: 4000,
  EMBED_BATCH_SIZE: 16,
  EMBED_TIMEOUT_MS: 15000
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

function getEmbeddingConfig() {
  const openAiKey = (process.env.OPENAI_API_KEY || '').trim();
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '').trim();
  const customBaseUrl = (process.env.AI_API_BASE_URL || process.env.OPENAI_BASE_URL || '').replace(/\/+$/, '');
  if (openAiKey) {
    return {
      provider: 'openai',
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      apiKey: openAiKey,
      baseUrl: customBaseUrl || 'https://api.openai.com/v1'
    };
  }
  if (geminiKey) {
    return {
      provider: 'gemini',
      model: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
      apiKey: geminiKey
    };
  }
  return { provider: 'local', model: `local-hash-${CONFIG.LOCAL_EMBED_DIM}` };
}

function normalizeEmbeddingText(chunk) {
  const symbols = Array.isArray(chunk?.symbols) ? chunk.symbols.slice(0, 20).join(' ') : '';
  const header = `${chunk?.path || chunk?.fileName || ''} ${symbols}`;
  const content = String(chunk?.content || '').replace(/\s+/g, ' ').trim();
  const text = `${header}\n${content}`.trim();
  return text.length > CONFIG.EMBED_TEXT_LIMIT ? text.slice(0, CONFIG.EMBED_TEXT_LIMIT) : text;
}

function hashText(text = '') {
  return crypto.createHash('sha1').update(text).digest('hex');
}

function embedTextLocally(text = '', dim = CONFIG.LOCAL_EMBED_DIM) {
  const vec = new Float32Array(dim);
  const tokens = String(text)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return Array.from(vec);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const h = hashText(t);
    const idx = parseInt(h.slice(0, 8), 16) % dim;
    const sign = (parseInt(h.slice(8, 10), 16) & 1) ? 1 : -1;
    vec[idx] += sign;
    if (t.length > 2) {
      for (let j = 0; j < t.length - 2; j++) {
        const n = t.slice(j, j + 3);
        const nh = hashText(n);
        const nidx = parseInt(nh.slice(0, 8), 16) % dim;
        const nsign = (parseInt(nh.slice(8, 10), 16) & 1) ? 1 : -1;
        vec[nidx] += nsign * 0.5;
      }
    }
  }
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  const out = new Array(dim);
  for (let i = 0; i < dim; i++) out[i] = vec[i] / norm;
  return out;
}

async function embedTextsWithProvider(texts, cfg) {
  if (!Array.isArray(texts) || texts.length === 0) return [];
  if (cfg.provider === 'openai') {
    const endpoint = `${cfg.baseUrl}/embeddings`;
    const resp = await axios.post(
      endpoint,
      { model: cfg.model, input: texts },
      {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
        timeout: CONFIG.EMBED_TIMEOUT_MS
      }
    );
    const data = resp.data?.data || [];
    const byIndex = new Map(data.map((d) => [d.index, d.embedding]));
    return texts.map((_, i) => byIndex.get(i) || null);
  }
  if (cfg.provider === 'gemini') {
    const results = [];
    for (const text of texts) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:embedContent?key=${cfg.apiKey}`;
        const resp = await axios.post(
          url,
          { content: { parts: [{ text }] } },
          { headers: { 'Content-Type': 'application/json' }, timeout: CONFIG.EMBED_TIMEOUT_MS }
        );
        results.push(resp.data?.embedding?.values || null);
      } catch {
        results.push(null);
      }
    }
    return results;
  }
  return texts.map((t) => embedTextLocally(t));
}

async function embedTexts(texts, cfg = getEmbeddingConfig()) {
  const out = new Array(texts.length).fill(null);
  const pending = [];
  for (let i = 0; i < texts.length; i++) {
    const text = String(texts[i] || '');
    const key = `${cfg.provider}:${cfg.model}:${hashText(text)}`;
    const cached = embeddingCache.get(key);
    if (cached && Array.isArray(cached.vector)) {
      out[i] = cached.vector;
    } else {
      pending.push({ i, text, key });
    }
  }
  for (let i = 0; i < pending.length; i += CONFIG.EMBED_BATCH_SIZE) {
    const batch = pending.slice(i, i + CONFIG.EMBED_BATCH_SIZE);
    let vectors = null;
    try {
      if (cfg.provider !== 'local') {
        vectors = await embedTextsWithProvider(batch.map((b) => b.text), cfg);
      }
    } catch {
      vectors = null;
    }
    if (!Array.isArray(vectors)) {
      vectors = batch.map((b) => embedTextLocally(b.text));
    }
    for (let j = 0; j < batch.length; j++) {
      const vec = Array.isArray(vectors[j]) ? vectors[j] : embedTextLocally(batch[j].text);
      out[batch[j].i] = vec;
      embeddingCache.set(batch[j].key, { vector: vec, model: cfg.model, provider: cfg.provider, at: Date.now() });
    }
  }
  if (embeddingCache.size > 4000) {
    const entries = Array.from(embeddingCache.entries()).slice(embeddingCache.size - 3000);
    embeddingCache.clear();
    for (const [k, v] of entries) embeddingCache.set(k, v);
  }
  return { vectors: out, model: cfg.model, provider: cfg.provider };
}

async function embedChunks(chunks = []) {
  const cfg = getEmbeddingConfig();
  const limited = chunks.slice(0, CONFIG.MAX_EMBED_CHUNKS);
  const texts = limited.map(normalizeEmbeddingText);
  const { vectors, model, provider } = await embedTexts(texts, cfg);
  for (let i = 0; i < limited.length; i++) {
    limited[i].embedding = vectors[i] || embedTextLocally(texts[i]);
  }
  for (let i = limited.length; i < chunks.length; i++) {
    // Keep lexical search for overflow chunks without remote embedding cost
    chunks[i].embedding = null;
  }
  return { model, provider };
}

/**
 * Index a workspace's files into searchable chunks
 */
function buildWorkspaceChunks(files = []) {
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
  return allChunks;
}

async function indexWorkspaceFiles(workspaceId, files = []) {
  const workspaceHash = computeWorkspaceHash(files);
  const embedCfg = getEmbeddingConfig();
  const cached = workspaceIndexCache.get(workspaceId);

  // Return cached index if hash matches, embeddings compatible, and not expired
  if (
    cached &&
    cached.hash === workspaceHash &&
    cached.embeddingModel === embedCfg.model &&
    cached.embeddingProvider === embedCfg.provider &&
    (Date.now() - cached.updatedAt < CONFIG.CACHE_TTL_MS)
  ) {
    return cached.chunks;
  }

  const allChunks = buildWorkspaceChunks(files);
  const { model, provider } = await embedChunks(allChunks);

  workspaceIndexCache.set(workspaceId, {
    hash: workspaceHash,
    chunks: allChunks,
    fileCount: files.length,
    updatedAt: Date.now(),
    embeddingModel: model,
    embeddingProvider: provider
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
    const regex = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
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
    const a = vecA[i] || 0;
    const b = vecB[i] || 0;
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Searches and retrieves the most relevant code chunks for a query from a workspace
 */
async function retrieveWorkspaceContext({
  workspaceId,
  query,
  activeFileName = null,
  activeFileContent = null,
  files = null,
  user = null
}) {
  if (!workspaceId && (!files || files.length === 0)) {
    return { chunks: [], formattedContext: '', references: [] };
  }

  let workspaceFiles = Array.isArray(files) ? files : null;

  // Retrieve files from database if not supplied directly
  if (!workspaceFiles && workspaceId) {
    if (!mongoose.Types.ObjectId.isValid(String(workspaceId))) {
      return { chunks: [], formattedContext: '', references: [] };
    }
    try {
      const ws = await Workspace.findById(workspaceId)
        .select('files title language owner members settings.isPublic')
        .lean();
      if (!canAccessWorkspaceContext(ws, user)) {
        return { chunks: [], formattedContext: '', references: [], accessDenied: true };
      }
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
  const chunks = await indexWorkspaceFiles(workspaceId || 'transient_ws', workspaceFiles);
  if (chunks.length === 0) {
    return { chunks: [], formattedContext: '', references: [] };
  }

  // 2. Score chunks based on user query (lexical + semantic)
  const queryTokens = tokenizeQuery(query);
  let queryEmbedding = null;
  try {
    const embedResult = await embedTexts([String(query || '')]);
    queryEmbedding = Array.isArray(embedResult?.vectors) ? embedResult.vectors[0] : null;
  } catch {
    queryEmbedding = embedTextLocally(String(query || ''));
  }
  const hasSemanticIndex = chunks.some((c) => Array.isArray(c.embedding) && c.embedding.length > 0);
  const scoredChunks = chunks.map(chunk => {
    const lexicalScore = calculateLexicalScore(queryTokens, chunk);
    let semanticScore = 0;
    if (queryEmbedding && Array.isArray(chunk.embedding) && chunk.embedding.length === queryEmbedding.length) {
      semanticScore = cosineSimilarity(queryEmbedding, chunk.embedding);
    } else if (queryEmbedding && chunk.embedding === null && !hasSemanticIndex) {
      // no embeddings available
      semanticScore = 0;
    }
    let score = lexicalScore + (semanticScore * 18);

    // Boost chunks that belong to the active file if query doesn't explicitly target another file
    if (activeFileName && (chunk.fileName === activeFileName || chunk.path === activeFileName)) {
      score += 4;
    }

    return { ...chunk, score, lexicalScore, semanticScore };
  });

  // Filter out chunks with 0 relevance and sort descending
  let relevantChunks = scoredChunks
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, CONFIG.MAX_CHUNKS_PER_QUERY);

  // Semantic fallback: if lexical produced nothing but embeddings exist, use semantic ranking
  if (relevantChunks.length === 0 && hasSemanticIndex) {
    relevantChunks = scoredChunks
      .filter(c => c.semanticScore > 0.05)
      .sort((a, b) => b.semanticScore - a.semanticScore)
      .slice(0, CONFIG.MAX_CHUNKS_PER_QUERY)
      .map((c) => ({ ...c, score: c.semanticScore * 18 }));
  }

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
    matchedChunksCount: budgetedChunks.length,
    searchMode: hasSemanticIndex ? 'lexical+semantic' : 'lexical',
    embeddingModel: getEmbeddingConfig().model
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
