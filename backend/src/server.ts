import dotenv from 'dotenv';
dotenv.config();

console.log('--- CRISIS RESPONSE API STARTING ---');

import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import http from 'http';
import { Server } from 'socket.io';
import { initDatabase } from './database/connection';
import crisisRoutes from './routes/crisis';
import dashboardRoutes from './routes/dashboard';
import locationRoutes from './routes/locations';
import notificationRoutes from './routes/notifications';
import userRoutes from './routes/users';
import platformRoutes from './routes/platform';
import simulationRoutes from './routes/simulation';
import logger from './utils/logger';
import { createAutomatedIncident } from './controllers/crisisController';

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
});

// Track active simulation incidents to avoid duplicates and allow state updates
const activeSimulationIncidents = new Map<string, { id: number, lastUpdate: number }>();
const INCIDENT_DEDUPLICATION_WINDOW = 30000; // 30 seconds for idempotency

app.use(helmet());
app.use(cors());

const crisisLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { error: 'Too many crisis reports, please try again later' },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use(generalLimiter);
app.use(express.json({ limit: '10mb' }));

app.use((req: any, res: any, next: any) => {
  req.io = io;
  next();
});

app.use('/api/crisis', crisisLimiter, crisisRoutes);
app.use('/api/users', userRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/simulation', simulationRoutes);

app.get('/health', (req: any, res: any) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req: any, res: any) => {
  res.json({
    name: 'Crisis Response API',
    version: '1.0.0',
    endpoints: {
      crisis: '/api/crisis',
      users: '/api/users',
      locations: '/api/locations',
      notifications: '/api/notifications',
      dashboard: '/api/dashboard',
      platform: '/api/platform',
      health: '/health',
    },
  });
});

io.on('connection', (socket: any) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join_property', (propertyId: number) => {
    socket.join(`property_${propertyId}`);
    logger.info(`Socket ${socket.id} joined property_${propertyId}`);
  });

  socket.on('join_organization', (organizationId: number) => {
    socket.join(`organization_${organizationId}`);
    logger.info(`Socket ${socket.id} joined organization_${organizationId}`);
  });

  socket.on('join_role', (role: string) => {
    socket.join(`role_${role}`);
    logger.info(`Socket ${socket.id} joined role_${role}`);
  });

  socket.on('join_user', (userId: number) => {
    socket.join(`user_${userId}`);
    logger.info(`Socket ${socket.id} joined user_${userId}`);
  });

  // Simulation Events: Godot -> Backend
  socket.on('simulation:event_detected', async (data: any) => {
    const { version = "1.0", propertyId, type, confidence, description } = data;

    // EVENT VERSIONING: Future-proof + professional
    if (version !== "1.0") {
       logger.warn(`Simulation event version mismatch: ${version}`);
       return;
    }

    // PRE-FILTER LAYER: Drop low confidence unless in SIMULATION_MODE
    if (confidence < 0.7 && process.env.SIMULATION_MODE !== 'true') {
      logger.debug(`Simulation event dropped: low confidence (${confidence})`);
      return;
    }

    const incidentKey = `${propertyId}_${type}`;
    const now = Date.now();
    
    // IDEMPOTENCY / DEDUPLICATION: Prevent event spamming DB/LLM
    if (activeSimulationIncidents.has(incidentKey)) {
      const existing = activeSimulationIncidents.get(incidentKey)!;
      
      // If event arrives within deduplication window, only update state on dashboard
      if (now - existing.lastUpdate < INCIDENT_DEDUPLICATION_WINDOW) {
        io.to(`property_${propertyId}`).emit('simulation:state_update', { 
          incidentId: existing.id, 
          update: description,
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // If window passed, we might want to re-enrich, but for now we just update timestamp
      existing.lastUpdate = now;
    } else {
      const incident = await createAutomatedIncident(io, data);
      if (incident) {
        activeSimulationIncidents.set(incidentKey, { id: incident.id, lastUpdate: now });
      }
    }
  });

  socket.on('simulation:state_update', (data: any) => {
    const { propertyId, incidentId, update } = data;
    // Broadcast state updates (like fire spread) to all property clients instantly
    io.to(`property_${propertyId}`).emit('simulation:state_update', { 
      incidentId, 
      update, 
      timestamp: new Date().toISOString() 
    });
  });

  // Real-time simulation analysis via Socket.io
  socket.on('simulation:request_analysis', async (data: any) => {
    const { snapshot, propertyId, simulationDuration = 0 } = data;
    if (!snapshot || !propertyId) {
      socket.emit('simulation:analysis_error', { error: 'Missing snapshot or propertyId' });
      return;
    }
    try {
      const { analyzeSimulation } = await import('./services/simulationAnalysisService.js');
      const analysis = await analyzeSimulation({ snapshot, propertyId, simulationDuration });
      io.to(`property_${propertyId}`).emit('simulation:analysis_result', {
        analysis,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Socket simulation analysis failed:', error);
      socket.emit('simulation:analysis_error', { error: 'Analysis failed' });
    }
  });

  socket.on('location_update', async (data: any) => {
    try {
      const { userId, latitude, longitude, beaconId, zoneId } = data;
      io.to('role_admin').to('role_security').to('role_responder').emit('user_location_update', {
        userId,
        latitude,
        longitude,
        beaconId,
        zoneId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Location update error:', error);
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

app.use((err: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req: any, res: any) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = Number(process.env.PORT) || 3001;

async function startServer() {
  try {
    await initDatabase();
    logger.info('Database connected successfully');

    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Crisis Response API running on port ${PORT}`);
      logger.info('WebSocket server ready for connections');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { app, server, io };