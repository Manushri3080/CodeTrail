const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  avatar: { type: String },
  username: { type: String },
  role: { type: String, default: 'CodeTrail Learner' },
  bio: { type: String, default: '' },
  googleId: { type: String, unique: true, sparse: true },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  notificationPreferences: {
    securityAlerts: { type: Boolean, default: true },
    weeklyProgress: { type: Boolean, default: true },
    platformNews: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);

