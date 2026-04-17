import { initDatabase } from './connection';
import logger from '../utils/logger';

async function runMigration() {
  try {
    await initDatabase();
    logger.info('Migration completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();