const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getNotificationPreferences,
  updateNotificationPreferences
} = require('../controllers/notificationPreferencesController');

// Authenticated user notification preferences routes
router.get('/preferences', authMiddleware, getNotificationPreferences);
router.patch('/preferences', authMiddleware, updateNotificationPreferences);

module.exports = router;

