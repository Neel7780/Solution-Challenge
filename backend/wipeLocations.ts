import { query } from './src/database/connection';

async function wipeLocations() {
  await query('TRUNCATE TABLE location_tracking;');
  console.log("Wiped location_tracking table.");
  process.exit(0);
}

wipeLocations();
