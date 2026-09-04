const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'codetrail_secret_default_key_99';

/**
 * Authentication Middleware:
 * Verifies JWT token from Authorization header or x-auth-token and attaches req.user
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

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token payload.' });
    }

    // Try finding the user in DB, otherwise attach decoded payload
    try {
      const user = await User.findById(decoded.id || decoded._id).select('-password');
      if (user) {
        req.user = user;
      } else {
        req.user = decoded;
      }
    } catch {
      req.user = decoded;
    }

    next();
  } catch (err) {
    console.error('Auth Middleware Error:', err.message);
    return res.status(401).json({ message: 'Token is invalid or expired.' });
  }
};

module.exports = authMiddleware;
