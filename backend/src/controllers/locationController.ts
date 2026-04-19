import { pool } from '../database/connection';
import logger from '../utils/logger';
import type { Request, Response } from 'express';

export const getZones = async (req: Request, res: Response) => {
  const propertyId = req.user!.propertyId;
  try {
    const result = await pool.query(
      `SELECT id, name, zone_type, floor_number, capacity, current_occupancy,
       ST_AsGeoJSON(coordinates) as coordinates
       FROM zones WHERE property_id = $1 ORDER BY floor_number, name`,
      [propertyId]
    );

    res.json({ success: true, count: result.rows.length, zones: result.rows });
  } catch (error: any) {
    logger.error('Error fetching zones:', error);
    res.status(500).json({ error: 'Failed to fetch zones' });
  }
};

export const getZoneDetails = async (req: Request, res: Response) => {
  const { zoneId } = req.params;
  const propertyId = req.user!.propertyId;

  try {
    const zoneResult = await pool.query(
      `SELECT z.*, ST_AsGeoJSON(z.coordinates) as coordinates,
       p.name as property_name
       FROM zones z
       JOIN properties p ON z.property_id = p.id
       WHERE z.id = $1 AND z.property_id = $2`,
      [zoneId, propertyId]
    );

    if (zoneResult.rows.length === 0) {
      return res.status(404).json({ error: 'Zone not found or access denied' });
    }

    const usersResult = await pool.query(
      `SELECT DISTINCT ON (lt.user_id) u.id, u.name, u.role, u.status,
       lt.latitude, lt.longitude, lt.recorded_at
       FROM location_tracking lt
       JOIN users u ON lt.user_id = u.id
       WHERE lt.zone_id = $1
       AND lt.recorded_at > NOW() - INTERVAL '5 minutes'
       ORDER BY lt.user_id, lt.recorded_at DESC`,
      [zoneId]
    );

    res.json({ success: true, zone: zoneResult.rows[0], currentUsers: usersResult.rows });
  } catch (error: any) {
    logger.error('Error fetching zone details:', error);
    res.status(500).json({ error: 'Failed to fetch zone details' });
  }
};

export const getOccupancy = async (req: Request, res: Response) => {
  const propertyId = req.user!.propertyId;
  try {
    const result = await pool.query(
      `SELECT zone_type, SUM(current_occupancy) as total_occupancy, SUM(capacity) as total_capacity
       FROM zones WHERE property_id = $1 GROUP BY zone_type`,
      [propertyId]
    );

    const totalResult = await pool.query(
      `SELECT SUM(current_occupancy) as total, SUM(capacity) as capacity
       FROM zones WHERE property_id = $1`,
      [propertyId]
    );

    res.json({ success: true, byType: result.rows, total: totalResult.rows[0] });
  } catch (error: any) {
    logger.error('Error fetching occupancy:', error);
    res.status(500).json({ error: 'Failed to fetch occupancy' });
  }
};

export const getUserLocationHistory = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { limit = 50 } = req.query;
  try {
    const result = await pool.query(
      `SELECT lt.*, z.name as zone_name
       FROM location_tracking lt
       LEFT JOIN zones z ON lt.zone_id = z.id
       WHERE lt.user_id = $1
       ORDER BY lt.recorded_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    res.json({ success: true, history: result.rows });
  } catch (error: any) {
    logger.error('Error fetching location history:', error);
    res.status(500).json({ error: 'Failed to fetch location history' });
  }
};

export const getUsersInZone = async (req: Request, res: Response) => {
  const { zoneId } = req.params;
  const propertyId = req.user!.propertyId;

  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (lt.user_id) u.id, u.name, u.role, u.room_number,
       lt.latitude, lt.longitude, lt.beacon_id, lt.recorded_at
       FROM location_tracking lt
       JOIN users u ON lt.user_id = u.id
       JOIN zones z ON lt.zone_id = z.id
       WHERE lt.zone_id = $1 AND z.property_id = $2
       AND lt.recorded_at > NOW() - INTERVAL '5 minutes'
       ORDER BY lt.user_id, lt.recorded_at DESC`,
      [zoneId, propertyId]
    );

    res.json({ success: true, count: result.rows.length, users: result.rows });
  } catch (error: any) {
    logger.error('Error fetching users in zone:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getAllActiveLocations = async (req: Request, res: Response) => {
  const propertyId = req.user!.propertyId;
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (lt.user_id) u.id, u.name, u.role, u.status as user_status,
       lt.latitude, lt.longitude, lt.beacon_id, lt.zone_id, z.name as zone_name,
       lt.recorded_at
       FROM location_tracking lt
       JOIN users u ON lt.user_id = u.id
       LEFT JOIN zones z ON lt.zone_id = z.id
       WHERE u.property_id = $1
       AND lt.recorded_at > NOW() - INTERVAL '5 minutes'
       ORDER BY lt.user_id, lt.recorded_at DESC`,
      [propertyId]
    );

    res.json({ success: true, count: result.rows.length, locations: result.rows });
  } catch (error: any) {
    logger.error('Error fetching active locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
};
