import { query } from './database/connection';

async function main() {
  try {
    const columns = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'zones'");
    console.log('\n=== ZONES COLUMNS ===');
    console.table(columns.rows);

    const zones = await query('SELECT * FROM zones WHERE property_id = 2');
    console.log('\n=== ZONES FOR PROPERTY 2 ===');
    console.table(zones.rows);

    const properties = await query('SELECT id, name, floor_plan_data FROM properties WHERE id = 2');
    console.log('\n=== FLOOR PLAN DATA FOR PROPERTY 2 ===');
    console.log(JSON.stringify(properties.rows[0], null, 2));
  } catch (err) {
    console.error('Diagnostic error:', err);
  }
}

main();
