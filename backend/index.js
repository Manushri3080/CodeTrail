require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { verifyGoogleToken, registerUser, loginUser, forgotPassword, resetPassword } = require('./controllers/authController');

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Routes
app.post('/api/auth/google', verifyGoogleToken);
app.post('/api/auth/register', registerUser);
app.post('/api/auth/login', loginUser);
app.post('/api/auth/forgot-password', forgotPassword);
app.post('/api/auth/reset-password', resetPassword);

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
