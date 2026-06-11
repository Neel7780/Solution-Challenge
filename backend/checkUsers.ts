import { query } from './src/database/connection';

async function checkUsers() {
  const usersResult = await query(`
    SELECT u.id, u.role, lt.latitude, lt.longitude 
    FROM users u 
    JOIN location_tracking lt ON u.id = lt.user_id 
  `);
  console.log("Users and Locations:", usersResult.rows);
  process.exit(0);
}

checkUsers();
