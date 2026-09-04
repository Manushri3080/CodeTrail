require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { verifyGoogleToken, registerUser, loginUser, forgotPassword, resetPassword, getProfile, updateProfile, changePassword } = require('./controllers/authController');
const auth = require('./middleware/auth');
const workspaceRoutes = require('./routes/workspaceRoutes');

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Auth & User Routes
app.post('/api/auth/google', verifyGoogleToken);
app.post('/api/auth/register', registerUser);
app.post('/api/auth/login', loginUser);
app.post('/api/auth/forgot-password', forgotPassword);
app.post('/api/auth/reset-password', resetPassword);

// Profile & Account Routes (Protected)
app.get('/api/auth/profile', auth, getProfile);
app.put('/api/auth/profile', auth, updateProfile);
app.put('/api/auth/change-password', auth, changePassword);

// Workspace & Collaboration Routes (Module 2)
app.use('/api/workspaces', workspaceRoutes);

// Connect to MongoDB & Start Server
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codetrail';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB Connected successfully to CodeTrail database');
    app.listen(PORT, () => console.log(`Backend Server listening on port ${PORT}`));
  })
  .catch(err => {
    console.error('Database connection error:', err.message);
    console.warn('Running backend server without database connection hooks...');
    app.listen(PORT, () => console.log(`Backend Server listening on port ${PORT} (Database Offline)`));
  });
