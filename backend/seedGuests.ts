import { query } from './src/database/connection';

async function seedGuests() {
  try {
    const propertyId = 2; // Assuming the main property
    
    // Create 5 dummy users if they don't exist
    for (let i = 1; i <= 5; i++) {
      await query(
        `INSERT INTO users (name, email, password_hash, role, property_id, status, room_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (email) DO NOTHING`,
        [`Guest ${i}`, `guest${i}@example.com`, 'hash', 'guest', propertyId, 'active', `10${i}`]
      );
    }

    // Get the users
    const usersResult = await query(`SELECT id FROM users WHERE role = 'guest' LIMIT 5`);
    const users = usersResult.rows;

    // Anchor: 40.7128, -74.0060
    const locations = [
      { lat: 40.7128, lng: -74.0060, zone_id: 1 },
      { lat: 40.71282, lng: -74.00595, zone_id: 1 },
      { lat: 40.71278, lng: -74.00605, zone_id: 2 },
      { lat: 40.71281, lng: -74.00608, zone_id: null },
      { lat: 40.71275, lng: -74.00592, zone_id: null }
    ];

    for (let i = 0; i < users.length; i++) {
      const loc = locations[i];
      await query(
        `INSERT INTO location_tracking (user_id, zone_id, latitude, longitude)
         VALUES ($1, $2, $3, $4)`,
        [users[i].id, loc.zone_id, loc.lat, loc.lng]
      );
      console.log(`Seeded location for user ${users[i].id}`);
    }

    console.log("Seeding complete.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seedGuests();
