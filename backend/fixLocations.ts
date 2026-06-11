import { query } from './src/database/connection';

export const PROPERTY_CONFIG = {
  ANCHOR_LAT: 40.7128,
  ANCHOR_LNG: -74.0060,
  SCALE_LAT: 0.000008983,
  SCALE_LNG: 0.000011831,
  ROTATION_RAD: 0.25,
};

export function godotToLatLng(x: number, y: number) {
  const theta = PROPERTY_CONFIG.ROTATION_RAD;
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const eastOffset = x * cosTheta - y * sinTheta;
  const northOffset = -x * sinTheta - y * cosTheta;
  const lat = PROPERTY_CONFIG.ANCHOR_LAT + northOffset * PROPERTY_CONFIG.SCALE_LAT;
  const lng = PROPERTY_CONFIG.ANCHOR_LNG + eastOffset * PROPERTY_CONFIG.SCALE_LNG;
  return [lat, lng];
}

async function fixLocations() {
  const usersResult = await query(`SELECT id FROM location_tracking`);
  const locations = usersResult.rows;

  console.log(`Fixing ${locations.length} rows...`);
  
  // Use a transaction
  await query('BEGIN');
  for (let i = 0; i < locations.length; i++) {
    const rx = (Math.random() * 12) - 8;
    const ry = (Math.random() * 20) - 12;
    const [lat, lng] = godotToLatLng(rx, ry);

    await query(
      `UPDATE location_tracking SET latitude = $1, longitude = $2 WHERE id = $3`,
      [lat, lng, locations[i].id]
    );
  }
  await query('COMMIT');
  console.log("Fixed all bad locations in DB.");
  process.exit(0);
}

fixLocations();
