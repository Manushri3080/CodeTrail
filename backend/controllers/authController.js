const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendResetPasswordEmail } = require('../utils/email');

// Fallback to a default key if MONGODB_URI/JWT_SECRET is unset
const JWT_SECRET = process.env.JWT_SECRET || 'codetrail_secret_default_key_99';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// 1. Google OAuth Token Verification
exports.verifyGoogleToken = async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ message: 'Token is required' });
  }

  try {
    let googleId, email, name, avatar;

    if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
      // Verify token signature against Google certificates
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      googleId = payload.sub;
      email = payload.email;
      name = payload.name;
      avatar = payload.picture;
    } else {
      // Development bypass/fallback: decode token without verification if client ID is unset
      console.warn("WARNING: GOOGLE_CLIENT_ID is not configured in backend .env. Decoding payload without signature validation.");
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(Buffer.from(base64, 'base64').toString());
      googleId = payload.sub || 'google-guest-dev';
      email = payload.email || 'developer@codetrail.com';
      name = payload.name || 'Developer';
      avatar = payload.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`;
    }

    // Locate or create user in MongoDB
    let user = await User.findOne({ $or: [{ googleId }, { email }] });
    
    if (!user) {
      user = new User({
        name,
        email,
        avatar,
        googleId,
        authProvider: 'google'
      });
      await user.save();
    } else if (!user.googleId) {
      // Connect existing email local account to Google Authentication
      user.googleId = googleId;
      user.avatar = avatar || user.avatar;
      user.authProvider = 'google';
      await user.save();
    }

    // Issue local app session JWT
    const localToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token: localToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });

  } catch (err) {
    console.error('Google Verification Error:', err);
    res.status(401).json({ message: 'Google Authentication Failed', error: err.message });
  }
};

// 2. Local Email/Password Registration
exports.registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create User with robot avatar seed
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`;
    user = new User({
      name,
      email,
      password: hashedPassword,
      avatar,
      authProvider: 'local'
    });

    await user.save();

    // Sign local JWT
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });

  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
};

// 3. Local Email/Password Login
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.authProvider === 'google' && !user.password) {
      return res.status(400).json({ message: 'Please sign in with Google or reset your password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });

  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
};

// 4. Forgot Password
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No user registered with this email address' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Set token hash and expiry (1 hour)
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    // Create reset URL (pointing to frontend reset page)
    const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;

    // Send email
    try {
      await sendResetPasswordEmail(user.email, user.name, resetUrl);
      res.json({ message: 'Password reset link sent to your email' });
    } catch (mailErr) {
      // Rollback changes on failure
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      console.error('Mail sending error:', mailErr);
      return res.status(500).json({ message: 'Failed to send password reset email. Please try again later.', error: mailErr.message });
    }

  } catch (err) {
    console.error('Forgot Password Error:', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
};

// 5. Reset Password
exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: 'Token and password are required' });
  }

  try {
    // Hash the token received to compare with database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Clear reset token and expiration fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({ message: 'Password has been successfully updated' });

  } catch (err) {
    console.error('Reset Password Error:', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
};

// 6. Get Authenticated User Profile (Derived purely from Database)
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id).select('-password -resetPasswordToken -resetPasswordExpires');
    if (!user) {
      return res.status(404).json({ message: 'User profile not found in database' });
    }

    const Workspace = require('../models/Workspace');
    const userWorkspaces = await Workspace.find({
      $or: [
        { owner: user._id },
        { 'members.user': user._id }
      ]
    });

    const activeWorkspacesCount = userWorkspaces.filter(w => w.status === 'active').length;
    const totalFilesCount = userWorkspaces.reduce((acc, w) => acc + (w.files ? w.files.length : 0), 0);

    const username = user.username || user.email.split('@')[0];
    const role = user.role || 'CodeTrail Learner';
    const avatar = user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`;
    const updatedAt = user.updatedAt || user.createdAt;

    // Build recent activity array dynamically from database workspace activity logs
    let dbActivities = [];
    userWorkspaces.forEach(ws => {
      if (ws.activityLogs && Array.isArray(ws.activityLogs)) {
        ws.activityLogs.forEach(log => {
          dbActivities.push({
            id: log.id || log._id,
            title: `${log.title} (${ws.title})`,
            category: log.type || 'Workspace',
            time: log.timestamp ? new Date(log.timestamp).toISOString() : 'Recently',
            details: log.details,
            tagColor: 'purple'
          });
        });
      }
    });

    dbActivities.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username,
        role,
        bio: user.bio || '',
        avatar,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
        updatedAt: updatedAt
      },
      stats: {
        totalWorkspaces: userWorkspaces.length,
        activeWorkspaces: activeWorkspacesCount,
        totalFiles: totalFilesCount,
        accountCreated: user.createdAt
      },
      recentActivity: dbActivities.slice(0, 10)
    });
  } catch (err) {
    console.error('Get Profile Error:', err);
    res.status(500).json({ message: 'Failed to fetch user profile from database', error: err.message });
  }
};

// 7. Update Authenticated User Profile
exports.updateProfile = async (req, res) => {
  const { name, username, role, bio, avatar } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (username) user.username = username.trim().toLowerCase();
    if (role) user.role = role.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (avatar) user.avatar = avatar.trim();

    user.updatedAt = new Date();
    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username || user.email.split('@')[0],
        role: user.role || 'CodeTrail Learner',
        bio: user.bio || '',
        avatar: user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (err) {
    console.error('Update Profile Error:', err);
    res.status(500).json({ message: 'Failed to update profile', error: err.message });
  }
};

// 8. Change Password (Authenticated User)
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.authProvider === 'google' && !user.password) {
      return res.status(400).json({ message: 'Password change is not available for Google OAuth accounts' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password does not match' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change Password Error:', err);
    res.status(500).json({ message: 'Failed to change password', error: err.message });
  }
};

