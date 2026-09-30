const mongoose = require('mongoose');

const ExecutionSchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    default: null,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  userName: {
    type: String,
    default: 'Developer'
  },
  filename: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true
  },
  code: {
    type: String,
    default: ''
  },
  stdin: {
    type: String,
    default: ''
  },
  stdout: {
    type: String,
    default: ''
  },
  stderr: {
    type: String,
    default: ''
  },
  compileOutput: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['success', 'error', 'compile_error', 'timeout'],
    default: 'success'
  },
  exitCode: {
    type: Number,
    default: 0
  },
  executionTimeMs: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

ExecutionSchema.index({ workspace: 1, timestamp: -1 });

module.exports = mongoose.model('Execution', ExecutionSchema);
