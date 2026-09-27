const crypto = require('crypto');

/**
 * Genesis hash used as the initial previousHash for block sequence 1.
 * Standard 64-character hexadecimal representation of 256 bits of zeroes.
 */
const GENESIS_HASH = '0'.repeat(64);

/**
 * Canonical serializer to ensure deterministic string representation
 * regardless of object key order.
 */
const canonicalize = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalize).join(',')}]`;
  }
  const sortedKeys = Object.keys(obj).sort();
  const entries = sortedKeys.map(key => `${JSON.stringify(key)}:${canonicalize(obj[key])}`);
  return `{${entries.join(',')}}`;
};

/**
 * Computes a deterministic SHA-256 cryptographic hash for an activity record.
 * 
 * Hash Payload includes:
 * - workspaceId: Workspace identifier
 * - sequenceNumber: Monotonic integer sequence (1, 2, 3...)
 * - previousHash: SHA-256 hash of the immediate preceding block
 * - timestamp: ISO string format of event timestamp
 * - userId: User ID of contributor (or 'anonymous'/'system')
 * - action: Action type ('code_edit', 'file_create', 'code_execution', etc.)
 * - fileId: Targeted file id (if applicable)
 * - linesAdded: Quantity of lines added
 * - linesDeleted: Quantity of lines deleted
 * - details: Description of activity
 */
const computeActivityHash = ({
  workspaceId,
  sequenceNumber,
  previousHash,
  timestamp,
  userId,
  action,
  fileId = null,
  linesAdded = 0,
  linesDeleted = 0,
  details = ''
}) => {
  const normalizedTimestamp = timestamp instanceof Date ? timestamp.toISOString() : new Date(timestamp).toISOString();

  const payload = {
    workspaceId: String(workspaceId),
    sequenceNumber: Number(sequenceNumber),
    previousHash: String(previousHash || GENESIS_HASH),
    timestamp: normalizedTimestamp,
    userId: userId ? String(userId) : 'system',
    action: String(action),
    fileId: fileId ? String(fileId) : null,
    linesAdded: Number(linesAdded) || 0,
    linesDeleted: Number(linesDeleted) || 0,
    details: String(details || '').trim()
  };

  const payloadString = canonicalize(payload);
  return crypto.createHash('sha256').update(payloadString).digest('hex');
};

/**
 * Verifies the integrity of a single activity log entry.
 */
const verifySingleActivityHash = (activity) => {
  if (!activity || !activity.currentHash) return false;

  const expectedHash = computeActivityHash({
    workspaceId: activity.workspaceId,
    sequenceNumber: activity.sequenceNumber,
    previousHash: activity.previousHash,
    timestamp: activity.timestamp,
    userId: activity.userId?._id || activity.userId,
    action: activity.action,
    fileId: activity.fileId,
    linesAdded: activity.linesAdded,
    linesDeleted: activity.linesDeleted,
    details: activity.details
  });

  return expectedHash === activity.currentHash;
};

/**
 * Verifies an entire chain of activity records for a workspace.
 * Validates:
 * 1. Genesis block references GENESIS_HASH.
 * 2. Every block's previousHash strictly matches the preceding block's currentHash.
 * 3. Every block's currentHash matches the re-computed SHA-256 of its payload.
 * 4. Sequence numbers strictly increment by 1.
 * 
 * @param {Array} activities - Sorted ascending by sequenceNumber (1, 2, 3...)
 * @returns {Object} { isValid, totalBlocks, latestHash, genesisHash, tamperedIndex?, error? }
 */
const verifyActivityChain = (activities = []) => {
  if (!Array.isArray(activities) || activities.length === 0) {
    return {
      isValid: true,
      totalBlocks: 0,
      genesisHash: GENESIS_HASH,
      latestHash: GENESIS_HASH,
      message: 'Chain is empty. Ready for genesis block.'
    };
  }

  let expectedPrevHash = GENESIS_HASH;

  for (let i = 0; i < activities.length; i++) {
    const block = activities[i];
    const expectedSeq = i + 1;

    // 1. Verify monotonic sequence sequenceNumber
    if (block.sequenceNumber !== expectedSeq) {
      return {
        isValid: false,
        totalBlocks: activities.length,
        tamperedIndex: i,
        blockId: block._id || block.id,
        error: `Sequence gap or disorder detected at block #${block.sequenceNumber}. Expected sequence #${expectedSeq}.`
      };
    }

    // 2. Verify previousHash pointer
    if (block.previousHash !== expectedPrevHash) {
      return {
        isValid: false,
        totalBlocks: activities.length,
        tamperedIndex: i,
        blockId: block._id || block.id,
        error: `Broken hash link at block #${block.sequenceNumber}. Expected previousHash "${expectedPrevHash}", but found "${block.previousHash}".`
      };
    }

    // 3. Verify internal payload SHA-256 signature
    const computedHash = computeActivityHash({
      workspaceId: block.workspaceId,
      sequenceNumber: block.sequenceNumber,
      previousHash: block.previousHash,
      timestamp: block.timestamp,
      userId: block.userId?._id || block.userId,
      action: block.action,
      fileId: block.fileId,
      linesAdded: block.linesAdded,
      linesDeleted: block.linesDeleted,
      details: block.details
    });

    if (computedHash !== block.currentHash) {
      return {
        isValid: false,
        totalBlocks: activities.length,
        tamperedIndex: i,
        blockId: block._id || block.id,
        error: `Cryptographic tamper detected at block #${block.sequenceNumber}. Stored hash "${block.currentHash}" does not match recomputed hash "${computedHash}". Data has been altered.`
      };
    }

    // Advance expected previous hash pointer
    expectedPrevHash = block.currentHash;
  }

  return {
    isValid: true,
    totalBlocks: activities.length,
    genesisHash: GENESIS_HASH,
    latestHash: activities[activities.length - 1].currentHash,
    message: `All ${activities.length} activity blocks cryptographically verified with 100% integrity.`
  };
};

module.exports = {
  GENESIS_HASH,
  canonicalize,
  computeActivityHash,
  verifySingleActivityHash,
  verifyActivityChain
};
