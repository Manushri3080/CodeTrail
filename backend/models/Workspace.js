const mongoose = require('mongoose');

const WorkspaceFileSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  content: { type: String, default: '' },
  language: { type: String, default: 'javascript' },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const WorkspaceMemberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { 
    type: String, 
    enum: ['owner', 'admin', 'editor', 'viewer'], 
    default: 'editor' 
  },
  joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const WorkspaceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Workspace title is required'],
    trim: true,
    maxlength: [80, 'Workspace title cannot exceed 80 characters']
  },
  description: {
    type: String,
    trim: true,
    default: 'Collaborative development workspace on CodeTrail',
    maxlength: [300, 'Description cannot exceed 300 characters']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [WorkspaceMemberSchema],
  inviteCode: {
    type: String,
    unique: true,
    sparse: true
  },
  language: {
    type: String,
    enum: ['javascript', 'python', 'cpp', 'java', 'rust', 'go', 'typescript'],
    default: 'javascript'
  },
  files: [WorkspaceFileSchema],
  brandColor: {
    type: String,
    enum: ['purple', 'cyan', 'emerald', 'rose', 'amber', 'blue'],
    default: 'purple'
  },
  icon: {
    type: String,
    default: 'Rocket'
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  },
  settings: {
    isPublic: { type: Boolean, default: false },
    allowAnonymousExecution: { type: Boolean, default: false },
    autoSaveInterval: { type: Number, default: 3000 } // in ms
  },
  timeSpent: {
    type: String,
    default: '0h 0m'
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for fast lookup
WorkspaceSchema.index({ owner: 1, status: 1 });
WorkspaceSchema.index({ 'members.user': 1 });

module.exports = mongoose.model('Workspace', WorkspaceSchema);
