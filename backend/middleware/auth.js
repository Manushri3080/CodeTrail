const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'codetrail_secret_default_key_99';

/**
 * Authentication Middleware:
 * Verifies JWT token from Authorization header or x-auth-token and attaches req.user strictly from DB
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.header('Authorization');
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.header('x-auth-token')) {
      token = req.header('x-auth-token');
    }

    if (!token) {
      return res.status(401).json({ message: 'No authentication token provided, authorization denied' });
    }

    let decoded = null;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({ message: 'Token is invalid or expired. Please sign in again.' });
    }

    if (!decoded || (!decoded.id && !decoded._id)) {
      return res.status(401).json({ message: 'Invalid token payload.' });
    }

    const userId = decoded.id || decoded._id;
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User account not found in database.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth Middleware Error:', err.message);
    return res.status(401).json({ message: 'Authentication failed due to database or server error.', error: err.message });
  }
};

module.exports = authMiddleware;
