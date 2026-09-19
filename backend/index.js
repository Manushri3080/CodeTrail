require('dotenv').config();
// Auto-start local Piston code execution server v2 on port 2000
try {
  require('./utils/pistonServer');
} catch (pistonErr) {
  console.warn('Local Piston Server startup notice:', pistonErr.message);
}
const express = require('express');
const cors = require('cors');
const http = require('http');
const dns = require('dns');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

// Resolve Windows DNS SRV lookup issues for MongoDB Atlas (querySrv ECONNREFUSED)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (dnsErr) {
  console.warn('DNS resolver configuration notice:', dnsErr.message);
}
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const { verifyGoogleToken, registerUser, loginUser, forgotPassword, resetPassword, getProfile, updateProfile, changePassword } = require('./controllers/authController');
const { executeCode } = require('./controllers/executionController');
const auth = require('./middleware/auth');
const { optionalAuth } = require('./middleware/auth');
const workspaceRoutes = require('./routes/workspaceRoutes');
const workspaceSessionRoutes = require('./routes/workspaceSessionRoutes');
const initWorkspaceSessionSocket = require('./sockets/workspaceSessionSocket');

// Disable Mongoose command buffering so queries fail immediately when DB is offline instead of hanging
mongoose.set('bufferCommands', false);

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

// Multi-Language Code Execution Sandbox Endpoint (Supports optional auth & works offline)
app.post('/api/execute', optionalAuth, executeCode);


// Middleware to verify database connectivity for API endpoints
const checkDbConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) { // 1 = Connected
    return res.status(503).json({
      message: 'Database connection is currently offline or unreachable. Please ensure MongoDB is running and reachable.',
      dbConnected: false
    });
  }
  next();
};

app.use('/api', checkDbConnection);

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
const LOCAL_MONGODB_URI = 'mongodb://127.0.0.1:27017/codetrail';

const startServer = async () => {
  let connected = false;

  // 1. Attempt Primary MongoDB Atlas / Configured Connection
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB Connected successfully to CodeTrail database');
    connected = true;
  } catch (err) {
    console.error('Primary Database connection error:', err.message);

    // 2. Fallback to Local MongoDB if primary Atlas connection failed
    if (MONGODB_URI !== LOCAL_MONGODB_URI) {
      try {
        console.log('Attempting fallback connection to local MongoDB:', LOCAL_MONGODB_URI);
        await mongoose.connect(LOCAL_MONGODB_URI, {
          serverSelectionTimeoutMS: 5000
        });
        console.log('Local MongoDB Connected successfully to CodeTrail database');
        connected = true;
      } catch (localErr) {
        console.error('Local Database fallback connection error:', localErr.message);
      }
    }
  }

  if (!connected) {
    console.warn('Backend server starting with Database Offline (API endpoints will respond with HTTP 503 until DB is connected)...');
  }

  server.listen(PORT, () => {
    console.log(`Backend Server with Socket.IO listening on port ${PORT} (${connected ? 'Database Online' : 'Database Offline'})`);
  });
};

startServer();


