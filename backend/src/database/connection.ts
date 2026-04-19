import { Pool } from 'pg';
import 'dotenv/config';
import logger from '../utils/logger';

const normalizeDatabaseUrl = (databaseUrl?: string) => {
  if (!databaseUrl) {
    return databaseUrl;
  }

  try {
    const url = new URL(databaseUrl);
    const sslMode = url.searchParams.get('sslmode');
    const hasLibpqCompat = url.searchParams.has('uselibpqcompat');

    if (!hasLibpqCompat && ['prefer', 'require', 'verify-ca'].includes(sslMode || '')) {
      // Keep strong TLS behavior and avoid pg warning for deprecated alias modes.
      url.searchParams.set('sslmode', 'verify-full');
      return url.toString();
    }

    return databaseUrl;
  } catch {
    return databaseUrl;
  }
};

const resolvedDatabaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
const isSslEnabled =
  process.env.DB_SSL === 'true' ||
  resolvedDatabaseUrl?.includes('sslmode=require') ||
  resolvedDatabaseUrl?.includes('sslmode=verify-full');

const poolConfig = resolvedDatabaseUrl
  ? {
      connectionString: resolvedDatabaseUrl,
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
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err: unknown) => {
  logger.error('Unexpected database error:', err);
});

export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis');

    await client.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_email VARCHAR(255),
        subscription_tier VARCHAR(50) DEFAULT 'standard',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id),
        name VARCHAR(255) NOT NULL,
        address TEXT,
        floor_plan_data JSONB,
        status VARCHAR(50) DEFAULT 'operational' CHECK (status IN ('operational', 'evacuating', 'closed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);


    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id),
        property_id INTEGER REFERENCES properties(id),
        last_property_id INTEGER REFERENCES properties(id),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(50),
        role VARCHAR(50) CHECK (role IN ('guest', 'staff', 'security', 'admin', 'responder', 'super_admin', 'org_admin')),
        password_hash VARCHAR(255),
        beacon_id VARCHAR(100),
        room_number VARCHAR(50),
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'evacuated')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_properties (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        PRIMARY KEY (user_id, property_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS zones (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id),
        organization_id INTEGER REFERENCES organizations(id),
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
        organization_id INTEGER REFERENCES organizations(id),
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
        property_id INTEGER REFERENCES properties(id),
        organization_id INTEGER REFERENCES organizations(id),
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
        property_id INTEGER REFERENCES properties(id),
        organization_id INTEGER REFERENCES organizations(id),
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
        property_id INTEGER REFERENCES properties(id),
        organization_id INTEGER REFERENCES organizations(id),
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
        property_id INTEGER REFERENCES properties(id),
        organization_id INTEGER REFERENCES organizations(id),
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS public_crisis_reports (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id),
        organization_id INTEGER REFERENCES organizations(id),
        incident_type VARCHAR(50) CHECK (incident_type IN ('fire', 'medical', 'security', 'natural_disaster', 'evacuation', 'other')),
        severity VARCHAR(20) DEFAULT 'high' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        zone_id INTEGER REFERENCES zones(id),
        description TEXT,
        location GEOMETRY(POINT, 4326),
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        reporter_name VARCHAR(255),
        reporter_contact VARCHAR(255),
        source_ip VARCHAR(255) NOT NULL,
        user_agent TEXT,
        status VARCHAR(50) DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'escalated', 'dismissed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP
      )
    `);

    await client.query('CREATE INDEX IF NOT EXISTS idx_properties_org ON properties(organization_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_incidents_property ON incidents(property_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_incidents_org ON incidents(organization_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_check_ins_incident ON check_ins(incident_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_check_ins_org ON check_ins(organization_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_location_tracking_user ON location_tracking(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_location_tracking_org ON location_tracking(organization_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_location_tracking_time ON location_tracking(recorded_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_zones_property ON zones(property_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_zones_org ON zones(organization_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_public_reports_property ON public_crisis_reports(property_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_public_reports_org ON public_crisis_reports(organization_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_public_reports_status ON public_crisis_reports(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_public_reports_created ON public_crisis_reports(created_at)');

    logger.info('Database initialized successfully');
  } finally {
    client.release();
  }
}

export const query = (text: string, params?: unknown[]) => pool.query(text, params);

/**
 * Multi-tenant query wrapper to ensure property/org scoping.
 * Automatically injects property_id and organization_id into queries.
 */
export const queryWithContext = async (
  user: { userId: number; propertyId: number; organizationId: number; role: string } | undefined, 
  text: string, 
  params: any[] = [],
  tableAlias?: string
) => {
  const executeQuery = async (queryText: string, queryParams: any[], attempt = 1): Promise<any> => {
    try {
      return await pool.query(queryText, queryParams);
    } catch (error: any) {
      // Retry transient connection errors (e.g., DNS, timeout) once
      if (attempt < 2 && (error.code === 'EAI_AGAIN' || error.code === 'ETIMEDOUT' || error.message?.includes('timeout'))) {
        logger.warn(`Transient DB error ${error.code}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return executeQuery(queryText, queryParams, attempt + 1);
      }
      throw error;
    }
  };

  if (!user) {
    logger.error('queryWithContext called without user context');
    return executeQuery(text, params);
  }

  const isSuperAdmin = user.role === 'super_admin';
  const isOrgAdmin = user.role === 'org_admin';

  // Super Admins see everything. 
  if (isSuperAdmin) {
    return executeQuery(text, params);
  }

  // If we don't have an organization ID, we can't filter correctly for non-super admins.
  if (!user.organizationId) {
    logger.warn(`Non-super-admin user ${user.userId} has no organizationId in context`);
    return executeQuery(text, params);
  }

  let contextualQuery = text;
  let contextualParams = [...params];

  const uppercaseQuery = text.toUpperCase();
  const hasWhere = uppercaseQuery.includes('WHERE');
  
  // Find injection point (before ORDER BY, GROUP BY, or LIMIT)
  let injectionPoint = text.length;
  const modifiers = ['ORDER BY', 'GROUP BY', 'LIMIT'];
  
  for (const mod of modifiers) {
    const index = uppercaseQuery.indexOf(mod);
    if (index !== -1 && index < injectionPoint) {
      injectionPoint = index;
    }
  }

  const beforeModifier = text.slice(0, injectionPoint);
  const afterModifier = text.slice(injectionPoint);

  const prefix = tableAlias ? `${tableAlias}.` : '';
  
  // Scoping logic: Org Admin sees all properties in Org, others see only their Property in Org.
  const condition = (isOrgAdmin || !user.propertyId)
    ? `${prefix}organization_id = $${contextualParams.length + 1}`
    : `${prefix}property_id = $${contextualParams.length + 1} AND ${prefix}organization_id = $${contextualParams.length + 2}`;

  const joinedQuery = hasWhere 
    ? `${beforeModifier} AND ${condition} `
    : `${beforeModifier} WHERE ${condition} `;

  contextualQuery = joinedQuery + afterModifier;

  if (isOrgAdmin || !user.propertyId) {
    contextualParams.push(user.organizationId);
  } else {
    contextualParams.push(user.propertyId, user.organizationId);
  }

  return executeQuery(contextualQuery, contextualParams);
};
