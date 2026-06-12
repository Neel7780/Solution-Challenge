import { pool, query, queryWithContext } from '../database/connection';

import logger from '../utils/logger';
import type { Request, Response } from 'express';

export const getPropertySettings = async (req: Request, res: Response) => {
  const propertyId = req.params.propertyId ? parseInt(req.params.propertyId as string) : req.user!.propertyId;

  try {
    const result = await query(
      `SELECT id, name, address, floor_plan_data, created_at, updated_at
       FROM properties WHERE id = $1`,
      [propertyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json({ success: true, property: result.rows[0] });
  } catch (error: any) {
    logger.error('Error fetching property settings:', error);
    res.status(500).json({ error: 'Failed to fetch property settings' });
  }
};

export const updatePropertySettings = async (req: Request, res: Response) => {
  const propertyId = req.params.propertyId ? parseInt(req.params.propertyId as string) : req.user!.propertyId;
  const { name, address, floorPlanData } = req.body;

  try {
    const result = await query(
      `UPDATE properties
       SET name = COALESCE($1, name),
           address = COALESCE($2, address),
           floor_plan_data = COALESCE($3::jsonb, floor_plan_data),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, name, address, floor_plan_data, created_at, updated_at`,
      [name || null, address || null, floorPlanData ? JSON.stringify(floorPlanData) : null, propertyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json({ success: true, property: result.rows[0], message: 'Property settings updated successfully' });
  } catch (error: any) {
    logger.error('Error updating property settings:', error);
    res.status(500).json({ error: 'Failed to update property settings' });
  }
};

export const getOverview = async (req: Request, res: Response) => {
  const propertyId = req.params.propertyId ? parseInt(req.params.propertyId as string) : req.user!.propertyId;
  try {
    const client = await pool.connect();
    try {
      const statusColumnCheck = await client.query(
        `SELECT 1
         FROM information_schema.columns
         WHERE table_name = 'properties' AND column_name = 'status'
         LIMIT 1`
      );
      const hasPropertyStatusColumn = statusColumnCheck.rows.length > 0;

      const propertyResult = await client.query(
        hasPropertyStatusColumn
          ? `SELECT id, name, status, updated_at FROM properties WHERE id = $1 LIMIT 1`
          : `SELECT id, name, NULL::text as status, updated_at FROM properties WHERE id = $1 LIMIT 1`,
        [propertyId]
      );

      const incidentsResult = await client.query(
        `SELECT COUNT(*) as active_incidents,
         COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
         COUNT(*) FILTER (WHERE severity = 'high') as high_count
         FROM incidents WHERE property_id = $1 AND status = 'active'`,
        [propertyId]
      );

      const usersResult = await client.query(
        `SELECT
         COUNT(*) FILTER (WHERE status = 'active') as active_users,
         COUNT(*) FILTER (WHERE status = 'evacuated') as evacuated_users
         FROM users WHERE property_id = $1`,
        [propertyId]
      );

      const checkInsResult = await client.query(
        `SELECT c.status, COUNT(*) as count
         FROM check_ins c
         JOIN incidents i ON c.incident_id = i.id
         WHERE i.property_id = $1 AND i.status = 'active'
         AND c.created_at > NOW() - INTERVAL '1 hour'
         GROUP BY c.status`,
        [propertyId]
      );

      const occupancyResult = await client.query(`SELECT SUM(current_occupancy) as total FROM zones WHERE property_id = $1`, [propertyId]);

      res.json({
        success: true,
        overview: {
          property: propertyResult.rows[0] || null,
          incidents: incidentsResult.rows[0],
          users: usersResult.rows[0],
          checkIns: checkInsResult.rows,
          currentOccupancy: parseInt(occupancyResult.rows[0].total) || 0,
        },
        warning: hasPropertyStatusColumn ? undefined : 'properties.status column is missing in DB; property status is returned as null until migration is applied.',
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error fetching overview:', error);
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
};

export const getTriageData = async (req: Request, res: Response) => {
  const propertyId = req.params.propertyId ? parseInt(req.params.propertyId as string) : req.user!.propertyId;
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT
         COUNT(*) FILTER (WHERE c.status = 'safe') as safe_count,
         COUNT(*) FILTER (WHERE c.status = 'distressed') as distressed_count,
         COUNT(*) FILTER (WHERE c.status = 'needs_help') as needs_help_count,
         COUNT(*) FILTER (WHERE c.status = 'missing') as missing_count,
         COUNT(DISTINCT c.user_id) as total_unique_users
         FROM check_ins c
         JOIN incidents i ON c.incident_id = i.id
         WHERE i.property_id = $1 AND i.status = 'active'
         AND c.created_at = (
           SELECT MAX(created_at) FROM check_ins c2
           WHERE c2.user_id = c.user_id AND c2.incident_id = c.incident_id
         )`,
        [propertyId]
      );

      const missingResult = await client.query(
        `SELECT COUNT(DISTINCT u.id) as unchecked_count
         FROM users u
         WHERE u.property_id = $1
         AND u.id NOT IN (
           SELECT DISTINCT c.user_id
           FROM check_ins c
           JOIN incidents i ON c.incident_id = i.id
           WHERE i.property_id = $1 AND i.status = 'active'
         )`,
        [propertyId]
      );

      res.json({
        success: true,
        triage: {
          ...result.rows[0],
          unchecked: parseInt(missingResult.rows[0].unchecked_count),
        },
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error fetching triage data:', error);
    res.status(500).json({ error: 'Failed to fetch triage data' });
  }
};

export const getStats = async (req: Request, res: Response) => {
  const propertyId = req.params.propertyId ? parseInt(req.params.propertyId as string) : req.user!.propertyId;
  const { period = '24h' } = req.query;

  try {
    let interval = '24 hours';
    if (period === '7d') interval = '7 days';
    if (period === '30d') interval = '30 days';

    const statsResult = await query(
      `SELECT
       COUNT(*) as total_incidents,
       COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
       COUNT(*) FILTER (WHERE status = 'false_alarm') as false_alarms,
       COUNT(DISTINCT incident_type) as incident_types,
       incident_type,
       COUNT(*) as count
       FROM incidents
       WHERE property_id = $1 AND created_at > NOW() - INTERVAL '${interval}'
       GROUP BY incident_type`,
      [propertyId]
    );

    const avgResponseResult = await query(
      `SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) as avg_response_seconds
       FROM incidents
       WHERE property_id = $1 AND status = 'resolved'
       AND created_at > NOW() - INTERVAL '${interval}'`,
      [propertyId]
    );

    res.json({
      success: true,
      period,
      stats: {
        summary: statsResult.rows,
        avgResponseTime: avgResponseResult.rows[0].avg_response_seconds,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

export const getTimeline = async (req: Request, res: Response) => {
  const propertyId = req.params.propertyId ? parseInt(req.params.propertyId as string) : req.user!.propertyId;
  const { limit = 50 } = req.query;

  try {
    const result = await query(
      `SELECT i.*, u.name as reported_by_name
       FROM incidents i
       LEFT JOIN users u ON i.reported_by = u.id
       WHERE i.property_id = $1
       ORDER BY i.created_at DESC
       LIMIT $2`,
      [propertyId, limit]
    );

    res.json({ success: true, timeline: result.rows });
  } catch (error: any) {
    logger.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
};

export const getHeatmap = async (req: Request, res: Response) => {
  const propertyId = req.params.propertyId ? parseInt(req.params.propertyId as string) : req.user!.propertyId;
  try {
    const result = await query(
      `SELECT z.id, z.name, z.current_occupancy, z.capacity, z.zone_type,
       COUNT(i.id) as incident_count
       FROM zones z
       LEFT JOIN incidents i ON z.id = i.zone_id AND i.status = 'active'
       WHERE z.property_id = $1
       GROUP BY z.id
       ORDER BY incident_count DESC, z.current_occupancy DESC`,
      [propertyId]
    );

    res.json({ success: true, heatmap: result.rows });
  } catch (error: any) {
    logger.error('Error fetching heatmap:', error);
    res.status(500).json({ error: 'Failed to fetch heatmap' });
  }
};

export const getOrganizationProperties = async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;

  try {
    const result = await query(
      `SELECT p.*, 
       (SELECT COUNT(*) FROM incidents i WHERE i.property_id = p.id AND i.status = 'active') as active_incidents,
       (SELECT COUNT(*) FROM users u WHERE u.property_id = p.id AND u.role != 'guest') as staff_count
       FROM properties p
       WHERE p.organization_id = $1
       ORDER BY p.name ASC`,
      [organizationId]
    );

    res.json({ success: true, properties: result.rows });
  } catch (error: any) {
    logger.error('Error fetching organization properties:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
};

export const createProperty = async (req: Request, res: Response) => {
  const { name, address } = req.body;
  const organizationId = req.user!.organizationId;
  const userId = req.user!.userId;

  if (!name) {
    return res.status(400).json({ error: 'Property name is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO properties (organization_id, name, address)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [organizationId, name, address]
    );

    const property = result.rows[0];



    await client.query('COMMIT');
    res.status(201).json({ success: true, property, message: 'Property created successfully' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Error creating property:', error);
    res.status(500).json({ error: 'Failed to create property' });
  } finally {
    client.release();
  }
};

