import { pool } from '../database/connection';
import logger from '../utils/logger';
import type { Request, Response } from 'express';

const getClientIp = (req: Request) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
};

export const reportCrisis = async (req: Request, res: Response) => {
  const { propertyId, type, severity = 'high', latitude, longitude, zoneId, description } = req.body;
  const reportedByUserId = req.user?.userId || null;
  const resolvedPropertyId = propertyId || req.user?.propertyId;

  if (!resolvedPropertyId) {
    return res.status(400).json({ error: 'Property ID is required' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const incidentResult = await client.query(
        `WITH coords AS (
           SELECT $8::double precision AS lat, $9::double precision AS lon
         )
         INSERT INTO incidents (property_id, reported_by, incident_type, severity, status, zone_id, description, latitude, longitude, location)
         SELECT $1, $2, $3, $4, $5, $6, $7, coords.lat::numeric, coords.lon::numeric, ST_SetSRID(ST_MakePoint(coords.lon, coords.lat), 4326)
         FROM coords
         RETURNING *`,
        [resolvedPropertyId, reportedByUserId, type, severity, 'active', zoneId, description, latitude, longitude]
      );

      const incident = incidentResult.rows[0];

      if (reportedByUserId) {
        await client.query(
          `WITH coords AS (
             SELECT $4::double precision AS lat, $5::double precision AS lon
           )
           INSERT INTO check_ins (user_id, incident_id, status, latitude, longitude, location)
           SELECT $1, $2, $3, coords.lat::numeric, coords.lon::numeric, ST_SetSRID(ST_MakePoint(coords.lon, coords.lat), 4326)
           FROM coords`,
          [reportedByUserId, incident.id, 'distressed', latitude, longitude]
        );
      }

      await client.query(
        `INSERT INTO notifications (incident_id, recipient_type, recipient_id, channel, message, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [incident.id, 'property', resolvedPropertyId, 'push', `EMERGENCY: ${type.toUpperCase()} reported. Please check in immediately.`, 'pending']
      );

      await client.query('COMMIT');

      if (req.io) {
        req.io.to(`property_${resolvedPropertyId}`).emit('crisis_reported', { incident, timestamp: new Date().toISOString() });
        req.io.to('role_security').to('role_responder').to('role_admin').emit('new_crisis', { incident, timestamp: new Date().toISOString() });
      }

      logger.info(`Crisis reported: ${type} at property ${resolvedPropertyId}, incident ID: ${incident.id}`);

      res.status(201).json({ success: true, incident, message: 'Crisis reported successfully. Emergency services have been notified.' });
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error reporting crisis:', error);
    res.status(500).json({ error: 'Failed to report crisis' });
  }
};

export const reportPublicCrisis = async (req: Request, res: Response) => {
  const {
    propertyId,
    type,
    severity = 'high',
    latitude,
    longitude,
    zoneId,
    description,
    reporterName,
    reporterContact,
  } = req.body;

  const ipAddress = getClientIp(req);
  const userAgent = req.get('user-agent') || 'unknown';

  try {
    const result = await pool.query(
      `INSERT INTO public_crisis_reports (
         property_id, incident_type, severity, zone_id, description,
         latitude, longitude, location, reporter_name, reporter_contact,
         source_ip, user_agent, status
       )
       SELECT
         $1, $2, $3, $4, $5,
         coords.lat::numeric, coords.lon::numeric,
         CASE WHEN coords.lat IS NOT NULL AND coords.lon IS NOT NULL THEN ST_SetSRID(ST_MakePoint(coords.lon, coords.lat), 4326) ELSE NULL END,
         $8, $9, $10, $11, 'pending_review'
       FROM (SELECT $6::double precision AS lat, $7::double precision AS lon) coords
       RETURNING *`,
      [
        propertyId,
        type,
        severity,
        zoneId || null,
        description || null,
        latitude ?? null,
        longitude ?? null,
        reporterName || null,
        reporterContact || null,
        ipAddress,
        userAgent,
      ]
    );

    const report = result.rows[0];

    if (req.io) {
      req.io.to('role_security').to('role_responder').to('role_admin').emit('public_crisis_reported', {
        reportId: report.id,
        propertyId: report.property_id,
        type: report.incident_type,
        severity: report.severity,
        status: report.status,
        timestamp: new Date().toISOString(),
      });
    }

    logger.warn(`Public crisis report received: property ${propertyId}, type ${type}, source ${ipAddress}`);

    res.status(201).json({
      success: true,
      reportId: report.id,
      message: 'Report submitted successfully. It is pending security review.',
    });
  } catch (error: any) {
    logger.error('Error submitting public crisis report:', error);
    res.status(500).json({ error: 'Failed to submit public crisis report' });
  }
};

export const getPublicCrisisReports = async (req: Request, res: Response) => {
  const { status = 'pending_review', propertyId } = req.query;

  try {
    let query = `SELECT * FROM public_crisis_reports WHERE 1=1`;
    const params: any[] = [];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (propertyId) {
      params.push(propertyId);
      query += ` AND property_id = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, reports: result.rows, count: result.rows.length });
  } catch (error: any) {
    logger.error('Error fetching public crisis reports:', error);
    res.status(500).json({ error: 'Failed to fetch public crisis reports' });
  }
};

export const reviewPublicCrisisReport = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, severity = 'high' } = req.body;

  if (!['escalate', 'dismiss'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Use escalate or dismiss.' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const reportResult = await client.query(
        `SELECT * FROM public_crisis_reports WHERE id = $1 FOR UPDATE`,
        [id]
      );

      if (reportResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Public report not found' });
      }

      const report = reportResult.rows[0];

      if (report.status !== 'pending_review') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Report already reviewed' });
      }

      if (action === 'dismiss') {
        const dismissResult = await client.query(
          `UPDATE public_crisis_reports
           SET status = 'dismissed', reviewed_at = CURRENT_TIMESTAMP
           WHERE id = $1
           RETURNING *`,
          [id]
        );

        await client.query('COMMIT');
        return res.json({ success: true, report: dismissResult.rows[0], message: 'Report dismissed' });
      }

      const incidentResult = await client.query(
        `WITH coords AS (
           SELECT $6::double precision AS lat, $7::double precision AS lon
         )
         INSERT INTO incidents (property_id, reported_by, incident_type, severity, status, zone_id, description, latitude, longitude, location)
         SELECT
           $1,
           NULL,
           $2,
           $3,
           'active',
           $4,
           $5,
           coords.lat::numeric,
           coords.lon::numeric,
           ST_SetSRID(ST_MakePoint(coords.lon, coords.lat), 4326)
         FROM coords
         RETURNING *`,
        [
          report.property_id,
          report.incident_type,
          severity,
          report.zone_id,
          report.description || `Escalated from public report #${report.id}`,
          report.latitude,
          report.longitude,
        ]
      );

      const reviewResult = await client.query(
        `UPDATE public_crisis_reports
         SET status = 'escalated', reviewed_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      await client.query('COMMIT');

      const incident = incidentResult.rows[0];

      if (req.io) {
        req.io.to(`property_${incident.property_id}`).emit('crisis_reported', { incident, timestamp: new Date().toISOString() });
        req.io.to('role_security').to('role_responder').to('role_admin').emit('new_crisis', { incident, timestamp: new Date().toISOString() });
      }

      return res.json({
        success: true,
        report: reviewResult.rows[0],
        incident,
        message: 'Public report escalated to active incident',
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error reviewing public crisis report:', error);
    res.status(500).json({ error: 'Failed to review public crisis report' });
  }
};

export const getActiveIncidents = async (req: Request, res: Response) => {
  const { propertyId, type } = req.query;
  try {
    let query = `
      SELECT i.*, u.name as reported_by_name, z.name as zone_name
      FROM incidents i
      LEFT JOIN users u ON i.reported_by = u.id
      LEFT JOIN zones z ON i.zone_id = z.id
      WHERE i.status = 'active'
    `;
    const params: any[] = [];

    if (propertyId) {
      params.push(propertyId);
      query += ` AND i.property_id = $${params.length}`;
    }
    if (type) {
      params.push(type);
      query += ` AND i.incident_type = $${params.length}`;
    }

    query += ` ORDER BY i.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({ success: true, count: result.rows.length, incidents: result.rows });
  } catch (error: any) {
    logger.error('Error fetching active incidents:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
};

export const getIncident = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT i.*, u.name as reported_by_name, z.name as zone_name
       FROM incidents i
       LEFT JOIN users u ON i.reported_by = u.id
       LEFT JOIN zones z ON i.zone_id = z.id
       WHERE i.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    res.json({ success: true, incident: result.rows[0] });
  } catch (error: any) {
    logger.error('Error fetching incident:', error);
    res.status(500).json({ error: 'Failed to fetch incident' });
  }
};

export const getIncidentDetails = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const client = await pool.connect();
    try {
      const incidentResult = await client.query(
        `SELECT i.*, u.name as reported_by_name, z.name as zone_name
         FROM incidents i
         LEFT JOIN users u ON i.reported_by = u.id
         LEFT JOIN zones z ON i.zone_id = z.id
         WHERE i.id = $1`,
        [id]
      );

      if (incidentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Incident not found' });
      }

      const checkInsResult = await client.query(
        `SELECT c.*, u.name, u.room_number, u.role
         FROM check_ins c
         JOIN users u ON c.user_id = u.id
         WHERE c.incident_id = $1
         ORDER BY c.created_at DESC`,
        [id]
      );

      const tasksResult = await client.query(
        `SELECT t.*, u1.name as assigned_to_name, u2.name as assigned_by_name
         FROM tasks t
         LEFT JOIN users u1 ON t.assigned_to = u1.id
         LEFT JOIN users u2 ON t.assigned_by = u2.id
         WHERE t.incident_id = $1
         ORDER BY t.created_at DESC`,
        [id]
      );

      const notificationsResult = await client.query(
        `SELECT * FROM notifications WHERE incident_id = $1 ORDER BY created_at DESC`,
        [id]
      );

      res.json({
        success: true,
        incident: incidentResult.rows[0],
        checkIns: checkInsResult.rows,
        tasks: tasksResult.rows,
        notifications: notificationsResult.rows,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error fetching incident details:', error);
    res.status(500).json({ error: 'Failed to fetch incident details' });
  }
};

export const updateIncidentStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const resolvedAt = status === 'resolved' || status === 'false_alarm' ? new Date() : null;

      const result = await client.query(
        `UPDATE incidents SET status = $1, resolved_at = $2 WHERE id = $3 RETURNING *`,
        [status, resolvedAt, id]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Incident not found' });
      }

      await client.query('COMMIT');

      if (req.io) {
        req.io.emit('incident_status_update', {
          incidentId: id,
          status,
          resolvedAt,
          timestamp: new Date().toISOString(),
        });
      }

      logger.info(`Incident ${id} status updated to: ${status}`);

      res.json({ success: true, incident: result.rows[0] });
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error updating incident status:', error);
    res.status(500).json({ error: 'Failed to update incident status' });
  }
};

export const resolveIncident = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE incidents SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    if (req.io) {
      req.io.emit('incident_resolved', { incidentId: id, timestamp: new Date().toISOString() });
    }

    logger.info(`Incident ${id} resolved`);

    res.json({ success: true, incident: result.rows[0] });
  } catch (error: any) {
    logger.error('Error resolving incident:', error);
    res.status(500).json({ error: 'Failed to resolve incident' });
  }
};
