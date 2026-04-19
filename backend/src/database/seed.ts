import bcrypt from 'bcryptjs';
import { pool } from './connection';
import logger from '../utils/logger';

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash('password', 10);
    const adminPasswordHash = await bcrypt.hash('admin123', 10);

    // 1. Create Super Admin
    const superAdminCheck = await client.query('SELECT id FROM users WHERE role = $1', ['super_admin']);
    if (superAdminCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO users (name, email, role, password_hash, status)
         VALUES ($1, $2, $3, $4, $5)`,
        ['Super Admin', 'admin@crisisrespond.com', 'super_admin', adminPasswordHash, 'active']
      );
      logger.info('Super Admin created: admin@crisisrespond.com / admin123');
    }

    // 2. Create/Get Demo Organization
    let orgId: number;
    const orgCheck = await client.query('SELECT id FROM organizations WHERE name = $1', ['Demo Enterprise']);
    if (orgCheck.rows.length === 0) {
      const orgResult = await client.query(
        `INSERT INTO organizations (name, contact_email) VALUES ($1, $2) RETURNING id`,
        ['Demo Enterprise', 'demo@enterprise.com']
      );
      orgId = orgResult.rows[0].id;
    } else {
      orgId = orgCheck.rows[0].id;
    }

    // 3. Create/Get Demo Property
    let propertyId: number;
    const propCheck = await client.query('SELECT id FROM properties WHERE organization_id = $1', [orgId]);
    if (propCheck.rows.length === 0) {
      const propResult = await client.query(
        `INSERT INTO properties (organization_id, name, address) VALUES ($1, $2, $3) RETURNING id`,
        [orgId, 'Grand Horizon Hotel', '123 Hospitality Way, New York, NY']
      );
      propertyId = propResult.rows[0].id;
    } else {
      propertyId = propCheck.rows[0].id;
    }

    // 4. Create Demo Users for this Org
    const usersToCreate = [
      { name: 'Org Admin', email: 'orgadmin@enterprise.com', role: 'org_admin' },
      { name: 'Hotel Security', email: 'security@enterprise.com', role: 'security' },
      { name: 'Demo Guest', email: 'guest@enterprise.com', role: 'guest', room: '302' }
    ];

    for (const u of usersToCreate) {
      const userCheck = await client.query('SELECT id FROM users WHERE email = $1', [u.email]);
      if (userCheck.rows.length === 0) {
        const userResult = await client.query(
          `INSERT INTO users (organization_id, property_id, name, email, role, password_hash, room_number, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'active') RETURNING id`,
          [orgId, propertyId, u.name, u.email, u.role, passwordHash, u.room || null]
        );
        
        // Link to mapping table
        await client.query(
          `INSERT INTO user_properties (user_id, property_id, role) VALUES ($1, $2, $3)`,
          [userResult.rows[0].id, propertyId, u.role === 'org_admin' ? 'admin' : u.role]
        );
        logger.info(`User created: ${u.email} / password`);
      }
    }

    await client.query('COMMIT');
    logger.info('Seeding completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();
