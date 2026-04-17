import { Pool } from 'pg';
import 'dotenv/config';
import logger from '../utils/logger';

const isSslEnabled = process.env.DB_SSL === 'true' || process.env.DATABASE_URL?.includes('sslmode=require');

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: isSslEnabled ? { rejectUnauthorized: false } : undefined,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'crisis_response',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: isSslEnabled ? { rejectUnauthorized: false } : undefined,
    };

export const pool = new Pool({
  ...poolConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err: unknown) => {
  logger.error('Unexpected database error:', err);
});

export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis');

    await client.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        floor_plan_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(50),
        role VARCHAR(50) CHECK (role IN ('guest', 'staff', 'security', 'admin', 'responder')),
        password_hash VARCHAR(255),
        beacon_id VARCHAR(100),
        room_number VARCHAR(50),
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'evacuated')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS zones (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id),
        name VARCHAR(255) NOT NULL,
        zone_type VARCHAR(50) CHECK (zone_type IN ('room', 'corridor', 'exit', 'stairwell', 'common_area')),
        floor_number INTEGER DEFAULT 1,
        coordinates GEOMETRY(POLYGON, 4326),
        beacon_ids TEXT[],
        capacity INTEGER DEFAULT 0,
        current_occupancy INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id),
        reported_by INTEGER REFERENCES users(id),
        incident_type VARCHAR(50) CHECK (incident_type IN ('fire', 'medical', 'security', 'natural_disaster', 'evacuation', 'other')),
        severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'contained', 'resolved', 'false_alarm')),
        location GEOMETRY(POINT, 4326),
        zone_id INTEGER REFERENCES zones(id),
        description TEXT,
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS check_ins (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        incident_id INTEGER REFERENCES incidents(id),
        status VARCHAR(50) CHECK (status IN ('safe', 'distressed', 'missing', 'needs_help')),
        message TEXT,
        location GEOMETRY(POINT, 4326),
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS location_tracking (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        zone_id INTEGER REFERENCES zones(id),
        beacon_id VARCHAR(100),
        location GEOMETRY(POINT, 4326),
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        accuracy DECIMAL(10,2),
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        incident_id INTEGER REFERENCES incidents(id),
        recipient_type VARCHAR(50) CHECK (recipient_type IN ('individual', 'zone', 'property', 'role')),
        recipient_id VARCHAR(255),
        channel VARCHAR(50) CHECK (channel IN ('push', 'sms', 'email', 'websocket')),
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        incident_id INTEGER REFERENCES incidents(id),
        assigned_to INTEGER REFERENCES users(id),
        assigned_by INTEGER REFERENCES users(id),
        task_type VARCHAR(50),
        priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
        description TEXT,
        due_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_incidents_property ON incidents(property_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_check_ins_incident ON check_ins(incident_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_location_tracking_user ON location_tracking(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_location_tracking_time ON location_tracking(recorded_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_zones_property ON zones(property_id)');

    logger.info('Database initialized successfully');
  } finally {
    client.release();
  }
}

export const query = (text: string, params?: unknown[]) => pool.query(text, params);