const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const crisisRoutes = require('./routes/crisis');
const userRoutes = require('./routes/users');
const locationRoutes = require('./routes/locations');
const notificationRoutes = require('./routes/notifications');
const dashboardRoutes = require('./routes/dashboard');
const { initDatabase } = require('./database/connection');

const app = express();
const server = http.createServer(app);

// Socket.io setup with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.WS_CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting - stricter for crisis endpoints
const crisisLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per minute for crisis endpoints
  message: { error: 'Too many crisis reports, please try again later' }
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(generalLimiter);
app.use(express.json({ limit: '10mb' }));

// Attach io to requests for real-time broadcasts
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/crisis', crisisLimiter, crisisRoutes);
app.use('/api/users', userRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Crisis Response API',
    version: '1.0.0',
    endpoints: {
      crisis: '/api/crisis',
      users: '/api/users',
      locations: '/api/locations',
      notifications: '/api/notifications',
      dashboard: '/api/dashboard',
      health: '/health'
    }
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  // Join room for specific property
  socket.on('join_property', (propertyId) => {
    socket.join(`property_${propertyId}`);
    logger.info(`Socket ${socket.id} joined property_${propertyId}`);
  });

  // Join room for role-based updates
  socket.on('join_role', (role) => {
    socket.join(`role_${role}`);
    logger.info(`Socket ${socket.id} joined role_${role}`);
  });

  // Handle location updates from mobile app
  socket.on('location_update', async (data) => {
    try {
      const { userId, latitude, longitude, beaconId, zoneId } = data;
      // Broadcast to command center and relevant staff
      io.to('role_admin').to('role_security').to('role_responder').emit('user_location_update', {
        userId,
        latitude,
        longitude,
        beaconId,
        zoneId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Location update error:', error);
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initDatabase();
    logger.info('Database connected successfully');

    server.listen(PORT, () => {
      logger.info(`Crisis Response API running on port ${PORT}`);
      logger.info(`WebSocket server ready for connections`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { app, server, io };
