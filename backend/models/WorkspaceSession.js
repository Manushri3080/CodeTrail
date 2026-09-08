const mongoose = require('mongoose');

const workspaceSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  workspaceId: {
    type: String,
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['admin', 'editor', 'viewer'],
    default: 'editor'
  },
  status: {
    type: String,
    enum: ['online', 'away', 'offline'],
    default: 'online'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  leftAt: {
    type: Date,
    default: null
  },
  socketId: {
    type: String,
    default: null
  },
  currentFileId: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Compound unique index to ensure ONE active session record per User + Workspace
workspaceSessionSchema.index(
  { userId: 1, workspaceId: 1 },
  { unique: true }
);

module.exports = mongoose.model('WorkspaceSession', workspaceSessionSchema);
