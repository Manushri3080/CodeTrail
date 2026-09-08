require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const { verifyGoogleToken, registerUser, loginUser, forgotPassword, resetPassword, getProfile, updateProfile, changePassword } = require('./controllers/authController');
const auth = require('./middleware/auth');
const workspaceRoutes = require('./routes/workspaceRoutes');
const workspaceSessionRoutes = require('./routes/workspaceSessionRoutes');
const initWorkspaceSessionSocket = require('./sockets/workspaceSessionSocket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true
  }
});

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

// Workspace & Collaboration Routes
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspaces/:workspaceId/session', workspaceSessionRoutes);

// Initialize Real-time Socket.IO Presence Engine
initWorkspaceSessionSocket(io);

// Connect to MongoDB & Start Server
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codetrail';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB Connected successfully to CodeTrail database');
    server.listen(PORT, () => console.log(`Backend Server with Socket.IO listening on port ${PORT}`));
  })
  .catch(err => {
    console.error('Database connection error:', err.message);
    console.warn('Running backend server without database connection hooks...');
    server.listen(PORT, () => console.log(`Backend Server with Socket.IO listening on port ${PORT} (Database Offline)`));
  });
