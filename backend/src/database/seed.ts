import bcrypt from 'bcryptjs';
import { initDatabase, pool } from './connection';
import logger from '../utils/logger';

async function seedDatabase() {
  try {
    await initDatabase();

    const passwordHash = await bcrypt.hash('password', 10);

    await pool.query(
      `INSERT INTO users (property_id, name, email, phone, role, room_number, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO NOTHING`,
      [1, 'Admin User', 'admin@hotel.com', '+10000000000', 'admin', null, passwordHash]
    );

    await pool.query(
      `INSERT INTO users (property_id, name, email, phone, role, room_number, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO NOTHING`,
      [1, 'Guest User', 'guest@hotel.com', '+10000000001', 'guest', '101', passwordHash]
    );

    logger.info('Seed completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Seed failed:', error);
    process.exit(1);
  }
}

seedDatabase();