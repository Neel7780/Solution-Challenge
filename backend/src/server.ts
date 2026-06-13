import dotenv from 'dotenv';
dotenv.config();

import logger from './utils/logger';
logger.info('--- CRISIS RESPONSE API STARTING ---');

import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import http from 'http';
import { Server } from 'socket.io';
import crisisRoutes from './routes/crisis';
import dashboardRoutes from './routes/dashboard';
import locationRoutes from './routes/locations';
import notificationRoutes from './routes/notifications';
import userRoutes from './routes/users';
import platformRoutes from './routes/platform';
import simulationRoutes from './routes/simulation';
import taskRoutes from './routes/tasks';
import chatRoutes from './routes/chat';
// logger is already imported at the top
import { analyzeSimulation } from './services/simulationAnalysisService';
import { createAutomatedIncident } from './controllers/crisisController';
import { enrichIncident } from './services/intelligenceService';
import navigationRoutes from './routes/navigation';

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// Robust CORS handling: Trim trailing slashes from the environment variable
const rawOrigin = process.env.CORS_ORIGIN || process.env.WS_CORS_ORIGIN || '*';
const corsOrigin = rawOrigin.endsWith('/') ? rawOrigin.slice(0, -1) : rawOrigin;

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:8080',
  'https://solution-challenge-nu.vercel.app',
];
if (corsOrigin !== '*' && !allowedOrigins.includes(corsOrigin)) {
  allowedOrigins.push(corsOrigin);
}

const checkOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  if (!origin || corsOrigin === '*') {
    callback(null, true);
    return;
  }
  const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.netlify.app') || origin.startsWith('http://localhost:') || origin === 'http://localhost';
  callback(null, isAllowed);
};

const io = new Server(server, {
  cors: {
    origin: checkOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  },
});

// Track active simulation incidents to avoid duplicates and allow state updates
const activeSimulationIncidents = new Map<string, { id: number, lastUpdate: number }>();
const INCIDENT_DEDUPLICATION_WINDOW = 30000; // 30 seconds for idempotency
const SIMULATION_PROPERTY_ID = 2;
const SIMULATION_NO_FIRE_RESOLVE_MS = Number(process.env.SIMULATION_NO_FIRE_RESOLVE_MS || 90000);

type FireWatchState = {
  activeIncidentId: number | null;
  lastFireSeenAt: number;
  noFireSince: number | null;
  resolving: boolean;
};

const simulationFireWatch = new Map<number, FireWatchState>();

const getFireWatch = (propertyId: number): FireWatchState => {
  const existing = simulationFireWatch.get(propertyId);
  if (existing) return existing;

  const initial: FireWatchState = {
    activeIncidentId: null,
    lastFireSeenAt: Date.now(),
    noFireSince: null,
    resolving: false,
  };
  simulationFireWatch.set(propertyId, initial);
  return initial;
};

app.use(helmet());
app.use(cors({
  origin: checkOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const crisisLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { error: 'Too many crisis reports, please try again later' },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased to support frequent polling and dashboard updates
});

app.use(generalLimiter);
app.use(express.json({ limit: '10mb' }));

app.use((req: any, res: any, next: any) => {
  req.io = io;
  next();
});

app.use('/api/crisis', crisisRoutes);
app.use('/api/users', userRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/simulation', simulationRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/navigation', navigationRoutes);

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
    io.to(`property_${propertyId}`).emit('simulation:state_update', { 
      incidentId, 
      update, 
      timestamp: new Date().toISOString() 
    });
  });

  socket.on('simulation:telemetry', async (data: any) => {
    const propertyId = Number(data?.propertyId);
    const activeFireCount = Number(data?.activeFireCount || 0);
    const agents = data?.agents || [];

    if (!propertyId) {
      return;
    }

    // Update simulated agent coordinates in DB in real-time
    if (agents.length > 0) {
      try {
        const { pool } = await import('./database/connection.js');
        const client = await pool.connect();
        try {
          // PROPERTY CONFIG (Matches Locations.tsx exactly)
          const ANCHOR_LAT = 40.7128;
          const ANCHOR_LNG = -74.0060;
          const SCALE_LAT = 0.000008983;
          const SCALE_LNG = 0.000011831;
          const ROTATION_RAD = 0.25;

          const theta = ROTATION_RAD;
          const cosTheta = Math.cos(theta);
          const sinTheta = Math.sin(theta);

          for (const agent of agents) {
            // Strip role tags like [GUEST], [SECURITY], [STAFF], [RESPONDER] from name
            const cleanName = agent.name.replace(/^\[[A-Z]+\]\s*/, '').trim();

            const userRes = await client.query(
              `SELECT id FROM users WHERE name = $1 AND property_id = $2 LIMIT 1`,
              [cleanName, propertyId]
            );

            if (userRes.rows.length > 0) {
              const userId = userRes.rows[0].id;
              const x = Number(agent.x) || 0;
              const y = Number(agent.y) || 0;

              // Georeference calculations
              const eastOffset = x * cosTheta - y * sinTheta;
              const northOffset = -x * sinTheta - y * cosTheta;

              const lat = ANCHOR_LAT + northOffset * SCALE_LAT;
              const lng = ANCHOR_LNG + eastOffset * SCALE_LNG;

              await client.query(
                `INSERT INTO location_tracking (user_id, latitude, longitude, location, recorded_at)
                 VALUES ($1, $2::numeric, $3::numeric, ST_SetSRID(ST_MakePoint($3::double precision, $2::double precision), 4326), CURRENT_TIMESTAMP)`,
                [userId, lat, lng]
              );
            }
          }
        } finally {
          client.release();
        }
      } catch (err) {
        logger.error('Error updating simulated agent positions in database:', err);
      }
    }

    const now = Date.now();
    const fireWatch = getFireWatch(propertyId);

    if (activeFireCount > 0) {
      fireWatch.lastFireSeenAt = now;
      fireWatch.noFireSince = null;
      return;
    }

    if (!fireWatch.activeIncidentId || fireWatch.resolving) {
      return;
    }

    if (!fireWatch.noFireSince) {
      fireWatch.noFireSince = now;
      return;
    }

    if (now - fireWatch.noFireSince < SIMULATION_NO_FIRE_RESOLVE_MS) {
      return;
    }

    fireWatch.resolving = true;

    try {
      const { pool } = await import('./database/connection.js');
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const incidentResult = await client.query(
          `UPDATE incidents
           SET status = 'contained', resolved_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND property_id = $2 AND status = 'active'
           RETURNING id, status, resolved_at`,
          [fireWatch.activeIncidentId, propertyId]
        );

        const statusColumnCheck = await client.query(
          `SELECT 1
           FROM information_schema.columns
           WHERE table_name = 'properties' AND column_name = 'status'
           LIMIT 1`
        );
        const hasPropertyStatus = statusColumnCheck.rows.length > 0;

        if (hasPropertyStatus) {
          await client.query(
            `UPDATE properties
             SET status = 'operational', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [propertyId]
          );
        } else {
          await client.query(
            `UPDATE properties
             SET updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [propertyId]
          );
        }

        await client.query(
          `INSERT INTO notifications (
            incident_id, property_id, recipient_type, recipient_id, channel, message, status, sent_at
          ) VALUES ($1, $2, 'property', $3, 'websocket', $4, 'sent', CURRENT_TIMESTAMP)`,
          [
            fireWatch.activeIncidentId,
            propertyId,
            String(propertyId),
            'AI Update: Fire has been extinguished. Crisis status has been contained and property returned to operational monitoring.',
          ]
        );

        await client.query('COMMIT');

        const incident = incidentResult.rows[0];
        if (incident) {
          io.to(`property_${propertyId}`).emit('incident_status_update', {
            incidentId: incident.id,
            status: incident.status,
            resolvedAt: incident.resolved_at,
            timestamp: new Date().toISOString(),
          });
        }

        io.to(`property_${propertyId}`).emit('property_status_update', {
          propertyId,
          status: 'operational',
          reason: 'auto_resolved_no_fire',
          timestamp: new Date().toISOString(),
        });

        io.to(`property_${propertyId}`).emit('mass_notification', {
          title: 'Crisis Contained',
          message: 'AI confirms fire inactivity over sustained period. Crisis marked contained and property is operational.',
          severity: 'info',
          timestamp: new Date().toISOString(),
        });

        logger.info(`Simulation crisis auto-contained for property ${propertyId} after ${SIMULATION_NO_FIRE_RESOLVE_MS}ms without fire activity.`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error: any) {
      logger.error('Failed to auto-resolve simulation crisis:', error);
    } finally {
      fireWatch.activeIncidentId = null;
      fireWatch.noFireSince = null;
      fireWatch.resolving = false;
      activeSimulationIncidents.delete(`sim_fire_${propertyId}`);
    }
  });

  // ═══════════════════════════════════════════════════
  // SIMULATION FIRE CRISIS → Full Stack Integration
  // ═══════════════════════════════════════════════════
  socket.on('simulation:fire_crisis', async (data: any) => {
    const { propertyId, fireX, fireY, agentCount, userId, latitude, longitude } = data;
    logger.info(`🔥 Simulation fire crisis received for property ${propertyId} at (${fireX}, ${fireY}) - Georeferenced: [${latitude}, ${longitude}]`);

    if (!propertyId) {
      socket.emit('simulation:crisis_error', { error: 'Property ID is required' });
      return;
    }

    const crisisKey = `sim_fire_${propertyId}`;
    const now = Date.now();

    // Deduplicate: don't create duplicate incidents within 30s
    if (activeSimulationIncidents.has(crisisKey)) {
      const existing = activeSimulationIncidents.get(crisisKey)!;
      if (now - existing.lastUpdate < INCIDENT_DEDUPLICATION_WINDOW) {
        logger.info(`Fire crisis deduplicated for property ${propertyId} (incident ${existing.id})`);
        socket.emit('simulation:crisis_ack', { 
          incidentId: existing.id, 
          deduplicated: true 
        });
        return;
      }
    }

    try {
      const { pool } = await import('./database/connection.js');
      const client = await pool.connect();

      try {
        await client.query('BEGIN');
        const simulationCoordinates = {
          x: Math.round(Number(fireX) || 0),
          y: Math.round(Number(fireY) || 0),
        };

        const incidentLat = latitude !== undefined ? Number(latitude) : null;
        const incidentLng = longitude !== undefined ? Number(longitude) : null;

        // 1. Create the incident
        const incidentResult = await client.query(
          `INSERT INTO incidents (
            property_id, reported_by, incident_type, severity, status,
            description, mass_alert_message, responder_action_plan,
            latitude, longitude, location
          ) VALUES ($1, $2, 'fire', 'critical', 'active',
            $3, $4, $5, $6::numeric, $7::numeric, CASE WHEN $6 IS NOT NULL AND $7 IS NOT NULL THEN ST_SetSRID(ST_MakePoint($7::double precision, $6::double precision), 4326) ELSE NULL END
          ) RETURNING *`,
          [
            propertyId,
            userId || null,
            `[SIMULATION] Fire detected at simulation coordinates (${simulationCoordinates.x}, ${simulationCoordinates.y}). ${agentCount || 0} guests in the building.`,
            `🚨 FIRE EMERGENCY: A fire has been detected. Please proceed to the nearest exit immediately. Follow staff instructions.`,
            'Security and responders: secure evacuation corridors, prioritize high-risk zones, and complete room-by-room sweep.',
            incidentLat,
            incidentLng
          ]
        );
        const incident = incidentResult.rows[0];

        // 2. Set property status to 'evacuating' when the column exists.
        // Some deployed prototype DBs were created before this column was added.
        const statusColumnCheck = await client.query(
          `SELECT 1
           FROM information_schema.columns
           WHERE table_name = 'properties' AND column_name = 'status'
           LIMIT 1`
        );
        const hasPropertyStatusColumn = statusColumnCheck.rows.length > 0;
        if (hasPropertyStatusColumn) {
          await client.query(
            `UPDATE properties SET status = 'evacuating', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [propertyId]
          );
        } else {
          await client.query(
            `UPDATE properties SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [propertyId]
          );
          logger.warn(`properties.status column missing; continuing fire-crisis flow for property ${propertyId}`);
        }

        // 3. Auto-assign available staff/security/responders
        const propResult = await client.query('SELECT organization_id FROM properties WHERE id = $1', [propertyId]);
        const organizationId = propResult.rows[0]?.organization_id || null;

        const staffResult = await client.query(
          `SELECT id, name, role FROM users
           WHERE property_id = $1 AND role IN ('security', 'staff', 'responder') AND status = 'active'
           ORDER BY role ASC`,
          [propertyId]
        );

        const assignedStaff: any[] = [];
        for (const staff of staffResult.rows) {
          const taskDesc = staff.role === 'security'
            ? `Report to fire location (${simulationCoordinates.x}, ${simulationCoordinates.y}) and secure evacuation routes. Ensure all guests evacuate safely.`
            : staff.role === 'responder'
            ? `Respond to fire emergency at (${simulationCoordinates.x}, ${simulationCoordinates.y}). Coordinate with fire department. Assist trapped guests.`
            : `Assist guest evacuation and move toward fire sector (${simulationCoordinates.x}, ${simulationCoordinates.y}). Check all rooms on your assigned floor. Guide guests to nearest exit.`;

          await client.query(
            `INSERT INTO tasks (incident_id, property_id, organization_id, assigned_to, task_type, priority, status, description, assigned_by_ai)
             VALUES ($1, $2, $3, $4, 'evacuation_response', 'urgent', 'pending', $5, true)`,
            [incident.id, propertyId, organizationId, staff.id, taskDesc]
          );

          assignedStaff.push({
            id: staff.id,
            name: staff.name,
            role: staff.role,
            task: taskDesc,
            fireCoordinates: simulationCoordinates,
          });
        }

        // 4. Create mass notification record
        await client.query(
          `INSERT INTO notifications (incident_id, property_id, recipient_type, recipient_id, channel, message, status)
           VALUES ($1, $2, 'property', $3, 'websocket', $4, 'sent')`,
          [incident.id, propertyId, String(propertyId), incident.mass_alert_message]
        );

        await client.query('COMMIT');

        // Track for deduplication
        activeSimulationIncidents.set(crisisKey, { id: incident.id, lastUpdate: now });

        const fireWatch = getFireWatch(Number(propertyId));
        fireWatch.activeIncidentId = incident.id;
        fireWatch.lastFireSeenAt = now;
        fireWatch.noFireSince = null;
        fireWatch.resolving = false;

        // ─── Broadcast to ALL connected clients ───

        // Get org ID for org-level broadcast
        const orgResult = await client.query('SELECT organization_id FROM properties WHERE id = $1', [propertyId]);
        const orgId = orgResult.rows[0]?.organization_id;

        // A. Crisis notification to entire property (guests see this)
        io.to(`property_${propertyId}`).emit('crisis_reported', {
          incident,
          fromSimulation: true,
          timestamp: new Date().toISOString(),
        });

        // B. Mass alert to all guests at property
        io.to(`property_${propertyId}`).emit('mass_notification', {
          incidentId: incident.id,
          type: 'fire',
          title: '🚨 FIRE EMERGENCY',
          message: incident.mass_alert_message,
          severity: 'critical',
          timestamp: new Date().toISOString(),
        });

        // C. Staff assignment notification to everyone at property so guests know help is coming
        io.to(`property_${propertyId}`).emit('staff_auto_assigned', {
          incidentId: incident.id,
          propertyId,
          assignedStaff,
          fireCoordinates: simulationCoordinates,
          message: `Help is on the way: ${assignedStaff.length} emergency personnel have been dispatched to the fire.`,
          timestamp: new Date().toISOString(),
        });

        // D. Notify each staff member individually
        for (const staff of assignedStaff) {
          io.to(`user_${staff.id}`).emit('task_assigned', {
            incidentId: incident.id,
            task: staff.task,
            fireCoordinates: simulationCoordinates,
            priority: 'urgent',
            message: `🚨 URGENT: ${staff.task} Fire coordinates: (${simulationCoordinates.x}, ${simulationCoordinates.y})`,
            timestamp: new Date().toISOString(),
          });
        }

        // E. Admin/org notification
        io.to('role_admin').to('role_org_admin').to('role_super_admin')
          .to(`organization_${orgId}`)
          .emit('new_crisis', {
            incident,
            assignedStaff,
            fromSimulation: true,
            timestamp: new Date().toISOString(),
          });

        // F. Evacuation trigger
        io.to(`property_${propertyId}`).emit('evacuation_triggered', {
          propertyId,
          incidentId: incident.id,
          message: 'EMERGENCY: Immediate evacuation ordered. Proceed to nearest exit.',
          timestamp: new Date().toISOString(),
        });

        // Acknowledge back to simulation
        socket.emit('simulation:crisis_ack', {
          incidentId: incident.id,
          assignedStaffCount: assignedStaff.length,
          assignedStaff,
          deduplicated: false,
        });

        logger.info(`🔥 Fire crisis pipeline complete: incident=${incident.id}, staff_assigned=${assignedStaff.length}`);

        // Generate and broadcast AI evacuation guidance for guest + staff dashboards.
        const floorPlanData = await client.query('SELECT floor_plan_data FROM properties WHERE id = $1', [propertyId]);
        const activeUsersResult = await client.query(
          'SELECT COUNT(*) FROM users WHERE property_id = $1 AND status = $2',
          [propertyId, 'active']
        );
        const aggregatedState = {
          propertyContext: floorPlanData.rows[0]?.floor_plan_data,
          activeUsersCount: parseInt(activeUsersResult.rows[0]?.count || '0'),
          lastEvents: [
            {
              type: 'fire',
              description: `Simulation fire at (${Math.round(fireX)}, ${Math.round(fireY)})`,
              confidence: 1.0,
            },
          ],
          description: `[SIMULATION] Fire emergency with ${agentCount || 0} active agents`,
        };

        enrichIncident(incident.id, aggregatedState).then((enrichment) => {
          if (!enrichment) return;
          io.to(`property_${propertyId}`).emit('incident_enriched', {
            incidentId: incident.id,
            enrichment,
            timestamp: new Date().toISOString(),
          });
        });

      } catch (error: any) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error: any) {
      logger.error('Simulation fire crisis pipeline failed:', error);
      socket.emit('simulation:crisis_error', { error: 'Failed to process fire crisis' });
    }
  });

  // Real-time simulation analysis via Socket.io
  socket.on('simulation:request_analysis', async (data: any) => {
    const { snapshot, propertyId, simulationDuration = 0 } = data;
    logger.info(`Received simulation analysis request for property ${propertyId}`);
    
    if (!snapshot || !propertyId) {
      logger.warn(`Invalid simulation analysis request: snapshot=${!!snapshot}, propertyId=${propertyId}`);
      socket.emit('simulation:analysis_error', { error: 'Missing snapshot or propertyId' });
      return;
    }
    
    try {
      logger.info(`Processing simulation analysis for property ${propertyId}...`);
      const analysis = await analyzeSimulation({ snapshot, propertyId, simulationDuration });
      
      logger.info(`Sending simulation analysis result to property_${propertyId}`);
      io.to(`property_${propertyId}`).emit('simulation:analysis_result', {
        analysis,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error(`Socket simulation analysis failed for property ${propertyId}:`, error);
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

  socket.on('calculate_route', async (data: any) => {
    try {
      const { userId, x, y, floor, propertyId } = data;
      if (x === undefined || y === undefined || floor === undefined || !propertyId) return;

      const { pool } = await import('./database/connection.js');
      const client = await pool.connect();
      try {
        const activeIncidentsRes = await client.query(
          `SELECT id, latitude, longitude, description FROM incidents 
           WHERE property_id = $1 AND status = 'active'`,
          [propertyId]
        );

        const { findClosestNode, findShortestPath, generateVoiceInstructions } = await import('./utils/pathfinding.js');
        const { latLngToGodot } = await import('./utils/georef.js');

        const hazards: any[] = [];
        for (const row of activeIncidentsRes.rows) {
          const lat = Number(row.latitude);
          const lng = Number(row.longitude);
          if (!isNaN(lat) && !isNaN(lng)) {
            const godotCoords = latLngToGodot(lat, lng);
            let hazardFloor = 1;
            if (row.description.includes('floor 2') || row.description.includes('Floor 2') || row.description.includes('F2') || row.description.includes('R20')) {
              hazardFloor = 2;
            }
            hazards.push({
              x: godotCoords.x,
              y: godotCoords.y,
              floor: hazardFloor,
              radius: 5.0,
            });
          }
        }

        const startNode = findClosestNode(Number(x), Number(y), Number(floor));
        if (startNode) {
          const route = findShortestPath(startNode.id, hazards);
          if (route) {
            const instructions = await generateVoiceInstructions(route.path);
            socket.emit('route_calculated', {
              success: true,
              shelterInPlace: false,
              path: route.path,
              distance: route.distance,
              instructions,
            });
          } else {
            socket.emit('route_calculated', {
              success: true,
              shelterInPlace: true,
              path: [],
              distance: 0,
              instructions: ['ALL EXIT PATHS BLOCKED. Shelter in place immediately, seal the door, and wait for emergency responders.'],
            });
          }
        }
      } finally {
        client.release();
      }
    } catch (err) {
      logger.error('Error in calculate_route socket handler:', err);
    }
  });

  socket.on('evacuation_status_update', async (data: any) => {
    try {
      const { userId, name, status, currentWaypoint, targetExit, propertyId } = data;
      io.to(`property_${propertyId}`)
        .to('role_admin')
        .to('role_security')
        .to('role_responder')
        .emit('occupant_nav_status', {
          userId,
          name,
          status,
          currentWaypoint,
          targetExit,
          timestamp: new Date().toISOString(),
        });
    } catch (err) {
      logger.error('Error in evacuation_status_update socket handler:', err);
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