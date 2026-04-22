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

const executeQueryWithRetry = async (queryText: string, queryParams: any[] = [], attempt = 1): Promise<any> => {
  try {
    return await pool.query(queryText, queryParams);
  } catch (error: any) {
    const isTransientError = 
      error.code === 'EAI_AGAIN' || 
      error.code === 'ETIMEDOUT' || 
      error.code === 'ECONNRESET' ||
      error.message?.includes('timeout') ||
      error.message?.includes('getaddrinfo') ||
      error.message?.includes('connection');

    if (attempt < 3 && isTransientError) {
      const delay = attempt * 1000;
      logger.warn(`Transient DB error ${error.code || error.message}, retrying in ${delay}ms (attempt ${attempt}/3)...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return executeQueryWithRetry(queryText, queryParams, attempt + 1);
    }
    throw error;
  }
};

export const query = (text: string, params?: any[]) => executeQueryWithRetry(text, params);

export const queryWithContext = async (
  user: { userId: number; propertyId: number; organizationId: number; role: string } | undefined, 
  text: string, 
  params: any[] = [],
  tableAlias?: string
) => {
  if (!user) {
    logger.error('queryWithContext called without user context');
    return executeQueryWithRetry(text, params);
  }

  const isSuperAdmin = user.role === 'super_admin';
  const isOrgAdmin = user.role === 'org_admin';

  if (isSuperAdmin) {
    return executeQueryWithRetry(text, params);
  }

  if (!user.organizationId) {
    logger.warn(`Non-super-admin user ${user.userId} has no organizationId in context`);
    return executeQueryWithRetry(text, params);
  }

  let contextualQuery = text;
  let contextualParams = [...params];

  const uppercaseQuery = text.toUpperCase();
  const hasWhere = uppercaseQuery.includes('WHERE');
  
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

  return executeQueryWithRetry(contextualQuery, contextualParams);
};
