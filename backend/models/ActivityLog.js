const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  userName: {
    type: String,
    default: 'Developer'
  },
  userEmail: {
    type: String,
    default: ''
  },
  userRole: {
    type: String,
    enum: ['owner', 'admin', 'editor', 'viewer', 'system'],
    default: 'editor'
  },
  action: {
    type: String,
    required: true,
    enum: [
      'code_edit',
      'file_create',
      'file_delete',
      'file_rename',
      'code_execution',
      'session_start',
      'session_end',
      'member_join',
      'member_leave',
      'role_change',
      'settings_update',
      'general'
    ],
    default: 'general'
  },
  fileId: {
    type: String,
    default: null
  },
  fileName: {
    type: String,
    default: null
  },
  details: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  linesAdded: {
    type: Number,
    default: 0,
    min: 0
  },
  linesDeleted: {
    type: Number,
    default: 0,
    min: 0
  },
  totalLinesChanged: {
    type: Number,
    default: 0
  },
  executionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Execution',
    default: null
  },
  executionStatus: {
    type: String,
    enum: ['success', 'error', 'compile_error', 'timeout', null],
    default: null
  },
  sequenceNumber: {
    type: Number,
    required: true,
    min: 1
  },
  previousHash: {
    type: String,
    required: true,
    length: 64
  },
  currentHash: {
    type: String,
    required: true,
    length: 64
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  isVerified: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound unique index guaranteeing exact sequence progression per workspace
ActivityLogSchema.index(
  { workspaceId: 1, sequenceNumber: 1 },
  { unique: true }
);

// Indexes for high-performance dashboard and audit lookups
ActivityLogSchema.index({ workspaceId: 1, timestamp: -1 });
ActivityLogSchema.index({ workspaceId: 1, action: 1 });
ActivityLogSchema.index({ workspaceId: 1, userId: 1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
