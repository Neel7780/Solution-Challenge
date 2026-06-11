import { Request, Response } from 'express';
import { query } from '../database/connection';
import { findClosestNode, findShortestPath, generateVoiceInstructions, Hazard } from '../utils/pathfinding';
import { latLngToGodot } from '../utils/georef';
import logger from '../utils/logger';

// Calculate safe route for a guest or operator
export async function calculateSafeRoute(req: Request, res: Response) {
  try {
    const { x, y, floor, propertyId } = req.body;

    if (x === undefined || y === undefined || floor === undefined || !propertyId) {
      return res.status(400).json({ error: 'Missing x, y, floor, or propertyId' });
    }

    // 1. Fetch active incidents at this property to build active hazards
    const activeIncidentsRes = await query(
      `SELECT id, latitude, longitude, description FROM incidents 
       WHERE property_id = $1 AND status = 'active'`,
      [propertyId]
    );

    const hazards: Hazard[] = [];
    for (const row of activeIncidentsRes.rows) {
      const lat = Number(row.latitude);
      const lng = Number(row.longitude);

      if (!isNaN(lat) && !isNaN(lng)) {
        // Convert real/simulation Lat/Lng back to Godot world coordinates
        const godotCoords = latLngToGodot(lat, lng);
        
        // Check description to see if there is floor info, default to floor 1
        let hazardFloor = 1;
        if (row.description.includes('floor 2') || row.description.includes('Floor 2') || row.description.includes('F2') || row.description.includes('R20')) {
          hazardFloor = 2;
        }

        hazards.push({
          x: godotCoords.x,
          y: godotCoords.y,
          floor: hazardFloor,
          radius: 5.0, // default 5 meters radius
        });
      }
    }

    logger.debug(`Found ${hazards.length} active hazards for routing calculation on property ${propertyId}`);

    // 2. Find the closest node to the current (x, y) coordinates on the given floor
    const startNode = findClosestNode(Number(x), Number(y), Number(floor));
    if (!startNode) {
      return res.status(404).json({ error: 'No graph nodes found near current location' });
    }

    // 3. Find the shortest safe path avoiding hazards
    const route = findShortestPath(startNode.id, hazards);

    if (!route) {
      return res.json({
        success: true,
        shelterInPlace: true,
        path: [],
        distance: 0,
        instructions: ['ALL EXIT PATHS BLOCKED. Shelter in place immediately, seal the door, and wait for emergency responders.'],
      });
    }

    // Generate voice/text instructions from waypoints
    const instructions = generateVoiceInstructions(route.path);

    return res.json({
      success: true,
      shelterInPlace: false,
      path: route.path,
      distance: route.distance,
      instructions,
    });
  } catch (error) {
    logger.error('Error calculating safe route:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
