const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

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
      return res.status(400).json({ message: 'This email is registered using Google OAuth. Please sign in with Google.' });
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
