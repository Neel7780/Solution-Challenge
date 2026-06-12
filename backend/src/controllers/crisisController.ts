import { pool, query } from '../database/connection';
import logger from '../utils/logger';
import type { Request, Response } from 'express';
import { enrichIncident } from '../services/intelligenceService';
import { verifyIncidentWithCCTV } from '../services/cctvVerificationService';

const getClientIp = (req: Request) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
};

export const autoAssignTasks = async (client: any, incidentId: number, propertyId: number, lat?: number, lon?: number) => {
  try {
    const propResult = await client.query('SELECT organization_id FROM properties WHERE id = $1', [propertyId]);
    const organizationId = propResult.rows[0]?.organization_id || null;

    const staffResult = await client.query(
      `SELECT id, name, role FROM users
       WHERE property_id = $1 AND role IN ('security', 'staff', 'responder') AND status = 'active'
       ORDER BY role ASC`,
      [propertyId]
    );

    for (const staff of staffResult.rows) {
      const locationText = (lat && lon) ? ` near coordinates (${lat}, ${lon})` : '';
      const taskDesc = staff.role === 'security'
        ? `Report to incident area${locationText} and secure evacuation routes. Ensure all guests evacuate safely.`
        : staff.role === 'responder'
        ? `Respond to crisis${locationText}. Coordinate with dispatch/first responders. Assist trapped guests.`
        : `Assist guest evacuation and guide occupants to nearest exit. Check all rooms near the affected zone.`;

      await client.query(
        `INSERT INTO tasks (incident_id, property_id, organization_id, assigned_to, task_type, priority, status, description, assigned_by_ai)
         VALUES ($1, $2, $3, $4, 'evacuation_response', 'urgent', 'pending', $5, true)`,
        [incidentId, propertyId, organizationId, staff.id, taskDesc]
      );
    }
  } catch (error) {
    logger.error('Error auto-assigning tasks:', error);
  }
};

export const notifyNearbyUsers = async (io: any, latitude: number, longitude: number, incident: any) => {
  if (!io || !latitude || !longitude) return;

  try {
    // Find users within 200 meters based on their latest recorded location in the last hour
    const radiusMeters = 200;
    const nearbyUsers = await query(
      `SELECT DISTINCT ON (user_id) user_id
       FROM location_tracking
       WHERE ST_DWithin(
         location, 
         ST_SetSRID(ST_MakePoint($1, $2), 4326), 
         $3
       )
       AND recorded_at > NOW() - INTERVAL '1 hour'
       ORDER BY user_id, recorded_at DESC`,
      [longitude, latitude, radiusMeters]
    );

    if (nearbyUsers.rows.length > 0) {
      const userIds = nearbyUsers.rows.map(r => `user_${r.user_id}`);
      io.to(userIds).emit('nearby_crisis', {
        incidentId: incident.id,
        type: incident.incident_type,
        severity: incident.severity,
        message: `An emergency has been reported near your location: ${incident.incident_type}. Please stay alert.`,
        timestamp: new Date().toISOString()
      });
      logger.info(`Notified ${userIds.length} nearby users about incident ${incident.id}`);
    }
  } catch (error) {
    logger.error('Error notifying nearby users:', error);
  }
};

export const reportCrisis = async (req: Request, res: Response) => {
  const { propertyId, type, severity: requestedSeverity = 'high', latitude, longitude, zoneId, description } = req.body;
  const reportedByUserId = req.user?.userId || null;
  const resolvedPropertyId = propertyId || req.user?.propertyId;

  if (!resolvedPropertyId) {
    return res.status(400).json({ error: 'Property ID is required' });
  }

  // AI-lite Triage: Auto-escalate severity based on keywords
  let finalSeverity = requestedSeverity;
  const criticalKeywords = ['fire', 'explosion', 'gunshot', 'shooter', 'bomb', 'smoke', 'heart attack', 'choking'];
  if (description && criticalKeywords.some(word => description.toLowerCase().includes(word))) {
    finalSeverity = 'critical';
    logger.warn(`AI Triage: Auto-escalated incident at property ${resolvedPropertyId} to CRITICAL based on description.`);
  }

  // Security check: Ensure user has access to this property
  if (req.user?.role !== 'super_admin' && req.user?.propertyId !== Number(resolvedPropertyId)) {
    return res.status(403).json({ error: 'Access denied for this property context' });
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
        [resolvedPropertyId, reportedByUserId, type, finalSeverity, 'active', zoneId, description, latitude, longitude]
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
        `INSERT INTO notifications (incident_id, property_id, recipient_type, recipient_id, channel, message, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [incident.id, resolvedPropertyId, 'property', String(resolvedPropertyId), 'push', `EMERGENCY: ${type.toUpperCase()} reported. Please check in immediately.`, 'pending']
      );

      // Auto-assign tasks to active staff/security/responders
      await autoAssignTasks(client, incident.id, resolvedPropertyId, latitude, longitude);

      await client.query('COMMIT');

      // Fetch organization ID and Property data for enrichment
      const propertyResult = await client.query('SELECT organization_id, floor_plan_data FROM properties WHERE id = $1', [resolvedPropertyId]);
      const orgId = propertyResult.rows[0]?.organization_id;
      const floorPlanData = propertyResult.rows[0]?.floor_plan_data;

      if (req.io) {
        req.io.to(`property_${resolvedPropertyId}`).emit('crisis_reported', { incident, timestamp: new Date().toISOString() });
        
        req.io.to('role_security')
          .to('role_responder')
          .to('role_admin')
          .to('role_org_admin')
          .to('role_super_admin')
          .to(`organization_${orgId}`)
          .emit('new_crisis', { incident, timestamp: new Date().toISOString() });

        // Proximity-based notification
        if (latitude && longitude) {
          notifyNearbyUsers(req.io, latitude, longitude, incident);
        }
      }

      // SLOW PATH: Asynchronous LLM Enrichment for Manual Reports
      const activeUsersResult = await query('SELECT COUNT(*) FROM users WHERE property_id = $1 AND status = $2', [resolvedPropertyId, 'active']);
      const aggregatedState = {
        propertyContext: floorPlanData,
        activeUsersCount: parseInt(activeUsersResult.rows[0]?.count || '0'),
        lastEvents: [{ type, description, latitude, longitude }],
        description: description || `Manual report of ${type}`
      };

      enrichIncident(incident.id, aggregatedState).then((enrichment) => {
        if (enrichment && req.io) {
          req.io.to(`property_${resolvedPropertyId}`).emit('incident_enriched', { 
            incidentId: incident.id, 
            enrichment, 
            timestamp: new Date().toISOString() 
          });
        }
      });

      logger.info(`Crisis reported: ${type} at property ${resolvedPropertyId}, incident ID: ${incident.id}`);

      res.status(201).json({ success: true, incident, message: 'Crisis reported successfully. AI is generating an evacuation plan.' });
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
    const result = await query(
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
      req.io.to('role_security')
        .to('role_responder')
        .to('role_admin')
        .to('role_org_admin')
        .to('role_super_admin')
        .emit('public_crisis_reported', {
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
  const { status = 'pending_review' } = req.query;
  const propertyId = req.user!.propertyId;

  try {
    let queryStr = `SELECT * FROM public_crisis_reports WHERE property_id = $1`;
    const params: any[] = [propertyId];

    if (status) {
      params.push(status);
      queryStr += ` AND status = $${params.length}`;
    }

    if (propertyId) {
      params.push(propertyId);
      queryStr += ` AND property_id = $${params.length}`;
    }

    queryStr += ' ORDER BY created_at DESC';

    const result = await query(queryStr, params);
    res.json({ success: true, reports: result.rows, count: result.rows.length });
  } catch (error: any) {
    logger.error('Error fetching public crisis reports:', error);
    res.status(500).json({ error: 'Failed to fetch public crisis reports' });
  }
};

export const reviewPublicCrisisReport = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, severity = 'high' } = req.body;
  const propertyId = req.user!.propertyId;

  if (!['escalate', 'dismiss'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Use escalate or dismiss.' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const reportResult = await client.query(
        `SELECT * FROM public_crisis_reports WHERE id = $1 AND property_id = $2 FOR UPDATE`,
        [id, propertyId]
      );

      if (reportResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Public report not found or access denied' });
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

      const incident = incidentResult.rows[0];

      const reviewResult = await client.query(
        `UPDATE public_crisis_reports
         SET status = 'escalated', reviewed_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      // Auto-assign tasks to active staff/security/responders
      await autoAssignTasks(client, incident.id, report.property_id, report.latitude, report.longitude);

      await client.query('COMMIT');

      if (req.io) {
        req.io.to(`property_${incident.property_id}`).emit('crisis_reported', { incident, timestamp: new Date().toISOString() });
        req.io.to('role_security')
          .to('role_responder')
          .to('role_admin')
          .to('role_org_admin')
          .to('role_super_admin')
          .emit('new_crisis', { incident, timestamp: new Date().toISOString() });
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
  const { type, status } = req.query;
  const userContext = req.user;

  if (!userContext) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    let baseQuery = `
      SELECT i.*, u.name as reported_by_name, z.name as zone_name
      FROM incidents i
      LEFT JOIN users u ON i.reported_by = u.id
      LEFT JOIN zones z ON i.zone_id = z.id
      WHERE 1=1
    `;
    
    if (status === 'history') {
      baseQuery += ` AND i.status IN ('contained', 'resolved', 'false_alarm')`;
    } else if (status === 'all') {
      // no status filter
    } else {
      baseQuery += ` AND i.status = 'active'`;
    }
    const params: any[] = [];

    // Scope by access context without requiring incidents.organization_id,
    // because many prototype incidents were created before that field was populated.
    if (userContext.role !== 'super_admin') {
      if (userContext.role === 'org_admin') {
        params.push(userContext.organizationId);
        baseQuery += ` AND (
          i.organization_id = $${params.length}
          OR i.property_id IN (SELECT id FROM properties WHERE organization_id = $${params.length})
        )`;
      } else {
        params.push(userContext.propertyId);
        baseQuery += ` AND i.property_id = $${params.length}`;
      }
    }

    if (type) {
      params.push(type);
      baseQuery += ` AND i.incident_type = $${params.length}`;
    }

    baseQuery += ` ORDER BY i.created_at DESC`;
    const result = await query(baseQuery, params);

    res.json({ success: true, count: result.rows.length, incidents: result.rows });
  } catch (error: any) {
    logger.error('Error fetching active incidents:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
};

export const getIncident = async (req: Request, res: Response) => {
  const { id } = req.params;
  const propertyId = req.user!.propertyId;

  try {
    const result = await query(
      `SELECT i.*, u.name as reported_by_name, z.name as zone_name
       FROM incidents i
       LEFT JOIN users u ON i.reported_by = u.id
       LEFT JOIN zones z ON i.zone_id = z.id
       WHERE i.id = $1 AND i.property_id = $2`,
      [id, propertyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found or access denied' });
    }

    res.json({ success: true, incident: result.rows[0] });
  } catch (error: any) {
    logger.error('Error fetching incident:', error);
    res.status(500).json({ error: 'Failed to fetch incident' });
  }
};

export const getIncidentDetails = async (req: Request, res: Response) => {
  const { id } = req.params;
  const propertyId = req.user!.propertyId;

  try {
    const client = await pool.connect();
    try {
      const incidentResult = await client.query(
        `SELECT i.*, u.name as reported_by_name, z.name as zone_name
         FROM incidents i
         LEFT JOIN users u ON i.reported_by = u.id
         LEFT JOIN zones z ON i.zone_id = z.id
         WHERE i.id = $1 AND i.property_id = $2`,
        [id, propertyId]
      );

      if (incidentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Incident not found or access denied' });
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
  const { status, resolutionReportText } = req.body;
  const user = req.user!;

  if (status === 'resolved' && !['org_admin', 'admin', 'super_admin'].includes(user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions to mark incidents as resolved.' });
  }

  if (status === 'resolved' && (!resolutionReportText || String(resolutionReportText).trim().length < 10)) {
    return res.status(400).json({ error: 'A resolution report (minimum 10 characters) is required to resolve an incident.' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // First, fetch the incident to check ownership/permissions
      const incidentCheck = await client.query(
        `SELECT i.*, p.organization_id 
         FROM incidents i 
         JOIN properties p ON i.property_id = p.id 
         WHERE i.id = $1`,
        [id]
      );

      if (incidentCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Incident not found' });
      }

      const incident = incidentCheck.rows[0];

      // Permission check based on role
      if (user.role !== 'super_admin') {
        if (user.role === 'org_admin') {
          if (incident.organization_id !== user.organizationId) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Access denied: Incident belongs to another organization' });
          }
        } else {
          // admin, security, responder, staff etc. must match propertyId
          if (incident.property_id !== user.propertyId) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Access denied for this property' });
          }
        }
      }

      const resolvedAt = status === 'resolved' || status === 'false_alarm' ? new Date() : null;

      const result = await client.query(
        `UPDATE incidents SET status = $1, resolved_at = $2 WHERE id = $3 RETURNING *`,
        [status, resolvedAt, id]
      );

      if (status === 'resolved') {
        await client.query(
          `INSERT INTO incident_resolution_reports (
             incident_id, property_id, organization_id, created_by, report_text, published, published_at
           ) VALUES ($1, $2, $3, $4, $5, TRUE, CURRENT_TIMESTAMP)
           ON CONFLICT (incident_id)
           DO UPDATE SET
             report_text = EXCLUDED.report_text,
             created_by = EXCLUDED.created_by,
             published = TRUE,
             published_at = CURRENT_TIMESTAMP`,
          [incident.id, incident.property_id, incident.organization_id, user.userId, String(resolutionReportText).trim()]
        );
      }

      await client.query('COMMIT');

      if (req.io) {
        req.io.to(`property_${incident.property_id}`)
          .to('role_security')
          .to('role_responder')
          .to('role_admin')
          .to('role_org_admin')
          .to('role_super_admin')
          .to(`organization_${incident.organization_id}`)
          .emit('incident_status_update', {
            incidentId: id,
            status,
            resolvedAt,
            timestamp: new Date().toISOString(),
          });
      }

      logger.info(`Incident ${id} status updated to: ${status} by user ${user.userId} (${user.role})`);

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

export const getPublishedResolutionReports = async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  try {
    const result = await query(
      `SELECT
         rr.id,
         rr.incident_id,
         rr.report_text,
         rr.published_at,
         i.incident_type,
         i.severity,
         i.created_at AS incident_created_at,
         p.name AS property_name,
         o.name AS organization_name
       FROM incident_resolution_reports rr
       JOIN incidents i ON rr.incident_id = i.id
       LEFT JOIN properties p ON rr.property_id = p.id
       LEFT JOIN organizations o ON rr.organization_id = o.id
       WHERE rr.published = TRUE
       ORDER BY rr.published_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json({ success: true, count: result.rows.length, reports: result.rows });
  } catch (error: any) {
    logger.error('Error fetching published resolution reports:', error);
    res.status(500).json({ error: 'Failed to fetch published reports' });
  }
};

export const resolveIncident = async (req: Request, res: Response) => {
  const { id } = req.params;
  const propertyId = req.user!.propertyId;

  try {
    const result = await query(
      `UPDATE incidents SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP WHERE id = $1 AND property_id = $2 RETURNING *`,
      [id, propertyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found or access denied' });
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

export const verifyCCTVFeed = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { cameraType = 'kitchen_fire' } = req.body;
  const numericIncidentId = Number(id);

  if (!['kitchen_fire', 'hallway_intruder', 'normal_lobby'].includes(cameraType)) {
    return res.status(400).json({ error: 'Invalid cameraType' });
  }

  try {
    const analysisResult = await verifyIncidentWithCCTV(numericIncidentId, cameraType);

    // Fetch updated incident to broadcast
    const incidentResult = await query(
      `SELECT * FROM incidents WHERE id = $1`,
      [numericIncidentId]
    );
    const incident = incidentResult.rows[0];

    if (req.io && incident) {
      const payload = {
        incidentId: numericIncidentId,
        incident,
        analysis: analysisResult,
        timestamp: new Date().toISOString(),
      };

      // Broadcast to property room and admin rooms
      req.io.to(`property_${incident.property_id}`).emit('incident_verified', payload);
      req.io.to('role_admin').to('role_org_admin').to('role_super_admin').emit('incident_verified', payload);
    }

    res.json({ success: true, analysis: analysisResult });
  } catch (error: any) {
    logger.error('Error in verifyCCTVFeed controller:', error);
    res.status(500).json({ error: 'Failed to verify CCTV feed' });
  }
};

export const updatePropertyStatus = async (req: Request, res: Response) => {
  const { propertyId } = req.params;
  const { status } = req.body;
  const user = req.user!;
  const numericPropertyId = Number(propertyId);

  if (!['operational', 'evacuating', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  if (
    user.role !== 'super_admin' &&
    user.role !== 'org_admin' &&
    user.propertyId !== numericPropertyId
  ) {
    return res.status(403).json({ error: 'Access denied for this property context' });
  }

  const defaultEvacuationRoutes = {
    guestEmergencyPlan: [
      'Stay calm and move toward the nearest marked exit.',
      'Avoid elevators and use stairwells only.',
      'Follow responder and staff instructions immediately.',
      'Proceed to the outdoor assembly point and check in.',
    ],
    staffEvacuationPlan: [
      'Open and secure evacuation corridors for guests.',
      'Perform room-by-room sweep for your assigned sector.',
      'Report trapped or distressed occupants to responders.',
      'Complete roll call at the assembly point.',
    ],
    safeExits: ['Main Entrance', 'North Stairwell', 'South Fire Escape'],
    tips: [
      'Stay low if smoke is present.',
      'Do not return for belongings.',
      'Assist children and elderly occupants first.',
    ],
  };

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const statusColumnCheck = await client.query(
        `SELECT 1
         FROM information_schema.columns
         WHERE table_name = 'properties' AND column_name = 'status'
         LIMIT 1`
      );
      const hasStatusColumn = statusColumnCheck.rows.length > 0;

      const propertyResult = hasStatusColumn
        ? await client.query(
            `UPDATE properties SET status = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 RETURNING *`,
            [status, numericPropertyId]
          )
        : await client.query(
            `UPDATE properties SET updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 RETURNING *`,
            [numericPropertyId]
          );

      if (propertyResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Property not found' });
      }

      let activeIncident: any = null;
      let statusChangedIncidents: Array<{ id: number; status: string; resolved_at: string | null }> = [];

      if (status === 'evacuating') {
        const activeIncidentResult = await client.query(
          `SELECT *
           FROM incidents
           WHERE property_id = $1 AND status = 'active'
           ORDER BY
             CASE WHEN incident_type = 'evacuation' THEN 0 ELSE 1 END,
             created_at DESC
           LIMIT 1`,
          [numericPropertyId]
        );

        if (activeIncidentResult.rows.length > 0) {
          activeIncident = activeIncidentResult.rows[0];

          if (!activeIncident.mass_alert_message || !activeIncident.evacuation_routes) {
            const patchedIncident = await client.query(
              `UPDATE incidents
               SET mass_alert_message = COALESCE(mass_alert_message, $1),
                   responder_action_plan = COALESCE(responder_action_plan, $2),
                   evacuation_routes = COALESCE(evacuation_routes, $3)
               WHERE id = $4
               RETURNING *`,
              [
                'EMERGENCY: Immediate evacuation ordered. Proceed to nearest safe exit and check in.',
                'Responders and staff: execute evacuation protocol, secure exits, and complete sweep.',
                JSON.stringify(defaultEvacuationRoutes),
                activeIncident.id,
              ]
            );
            activeIncident = patchedIncident.rows[0];
          }
        } else {
          const createdIncidentResult = await client.query(
            `INSERT INTO incidents (
              property_id, organization_id, reported_by, incident_type, severity, status, description,
              mass_alert_message, responder_action_plan, evacuation_routes
            )
            SELECT
              p.id,
              p.organization_id,
              $2,
              'evacuation',
              'critical',
              'active',
              'Manual evacuation initiated from command center.',
              $3,
              $4,
              $5
            FROM properties p
            WHERE p.id = $1
            RETURNING *`,
            [
              numericPropertyId,
              user.userId,
              'EMERGENCY: Immediate evacuation ordered. Proceed to nearest safe exit and check in.',
              'Responders and staff: execute evacuation protocol, secure exits, and complete sweep.',
              JSON.stringify(defaultEvacuationRoutes),
            ]
          );

          activeIncident = createdIncidentResult.rows[0];
        }
      }

      if (status === 'operational') {
        const closeResult = await client.query(
          `UPDATE incidents
           SET status = 'contained', resolved_at = CURRENT_TIMESTAMP
           WHERE property_id = $1
             AND status = 'active'
             AND incident_type IN ('evacuation', 'fire')
           RETURNING id, status, resolved_at`,
          [numericPropertyId]
        );
        statusChangedIncidents = closeResult.rows;
      }

      const notificationMessage = status === 'evacuating'
        ? 'EMERGENCY: Evacuation is in progress. Follow the safety plan and nearest safe exit.'
        : status === 'operational'
        ? 'UPDATE: Evacuation alert has been cleared. Continue monitoring official instructions.'
        : 'Property status updated.';

      await client.query(
        `INSERT INTO notifications (
          incident_id, property_id, organization_id, recipient_type, recipient_id, channel, message, status, sent_at
        ) VALUES ($1, $2, $3, 'property', $4, 'websocket', $5, 'sent', CURRENT_TIMESTAMP)`,
        [
          activeIncident?.id || null,
          numericPropertyId,
          propertyResult.rows[0].organization_id || null,
          String(numericPropertyId),
          notificationMessage,
        ]
      );

      await client.query('COMMIT');

      if (req.io) {
        req.io.to(`property_${numericPropertyId}`).emit('property_status_update', {
          propertyId: numericPropertyId,
          status,
          incidentId: activeIncident?.id || null,
          timestamp: new Date().toISOString(),
        });

        if (status === 'evacuating') {
          if (activeIncident) {
            req.io.to(`property_${numericPropertyId}`).emit('crisis_reported', {
              incident: activeIncident,
              fromCommandCenter: true,
              timestamp: new Date().toISOString(),
            });

            req.io.to(`property_${numericPropertyId}`).emit('incident_enriched', {
              incidentId: activeIncident.id,
              enrichment: {
                severity: activeIncident.severity,
                massAlertMessage: activeIncident.mass_alert_message,
                responderActionPlan: activeIncident.responder_action_plan,
                evacuationRoutes: activeIncident.evacuation_routes || defaultEvacuationRoutes,
              },
              timestamp: new Date().toISOString(),
            });
          }

          req.io.to(`property_${numericPropertyId}`).emit('evacuation_triggered', {
            propertyId: numericPropertyId,
            incidentId: activeIncident?.id || null,
            message: 'EMERGENCY: Immediate evacuation ordered. Proceed to nearest exit.',
            timestamp: new Date().toISOString(),
          });
        }

        if (statusChangedIncidents.length > 0) {
          for (const incident of statusChangedIncidents) {
            req.io.to(`property_${numericPropertyId}`).emit('incident_status_update', {
              incidentId: incident.id,
              status: incident.status,
              resolvedAt: incident.resolved_at,
              timestamp: new Date().toISOString(),
            });
          }
        }

        req.io.to(`property_${numericPropertyId}`).emit('mass_notification', {
          title: status === 'evacuating' ? 'EVACUATION ORDER' : 'STATUS UPDATE',
          message: notificationMessage,
          severity: status === 'evacuating' ? 'critical' : 'info',
          timestamp: new Date().toISOString(),
        });
      }

      const propertyPayload = hasStatusColumn
        ? propertyResult.rows[0]
        : { ...propertyResult.rows[0], status };

      res.json({
        success: true,
        property: propertyPayload,
        incident: activeIncident || null,
        affectedIncidents: statusChangedIncidents,
        warning: hasStatusColumn ? undefined : 'properties.status column is missing in DB; status change was broadcast in real time but not persisted.',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error updating property status:', error);
    res.status(500).json({ error: 'Failed to update property status' });
  }
};

export const getSafetyRoster = async (req: Request, res: Response) => {
  const { propertyId } = req.params;
  const incidentIdQuery = req.query.incidentId;

  try {
    const resolvedPropertyId = parseInt(propertyId as string);

    // Resolve active incident if not provided
    let resolvedIncidentId = parseInt(incidentIdQuery as string);
    if (isNaN(resolvedIncidentId)) {
      const activeIncRes = await query(
        `SELECT id FROM incidents WHERE property_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
        [resolvedPropertyId]
      );
      if (activeIncRes.rows.length > 0) {
        resolvedIncidentId = activeIncRes.rows[0].id;
      } else {
        // Fallback to most recent incident
        const lastIncRes = await query(
          `SELECT id FROM incidents WHERE property_id = $1 ORDER BY created_at DESC LIMIT 1`,
          [resolvedPropertyId]
        );
        resolvedIncidentId = lastIncRes.rows.length > 0 ? lastIncRes.rows[0].id : 1;
      }
    }

    // Get all users currently registered at this property with their latest status and coordinates
    const occupants = await query(
      `SELECT u.id, u.name, u.role, u.room_number,
              coalesce(ci.status, 'missing') as safety_status,
              coalesce(ci.created_at, lt.recorded_at) as last_seen,
              coalesce(ci.latitude, lt.latitude) as latitude,
              coalesce(ci.longitude, lt.longitude) as longitude,
              ci.message as checkin_message,
              z.name as zone_name
       FROM users u
       LEFT JOIN LATERAL (
         SELECT status, latitude, longitude, created_at, message
         FROM check_ins
         WHERE user_id = u.id AND incident_id = $1
         ORDER BY created_at DESC
         LIMIT 1
       ) ci ON true
       LEFT JOIN LATERAL (
         SELECT latitude, longitude, recorded_at, zone_id
         FROM location_tracking
         WHERE user_id = u.id
         ORDER BY recorded_at DESC
         LIMIT 1
       ) lt ON true
       LEFT JOIN zones z ON lt.zone_id = z.id
       WHERE u.property_id = $2
       ORDER BY 
         CASE coalesce(ci.status, 'missing')
           WHEN 'needs_help' THEN 1
           WHEN 'distressed' THEN 2
           WHEN 'missing' THEN 3
           WHEN 'safe' THEN 4
           ELSE 5
         END,
         u.name ASC`,
      [resolvedIncidentId, resolvedPropertyId]
    );

    res.json({ 
      success: true, 
      incidentId: resolvedIncidentId,
      occupants: occupants.rows,
      stats: {
        total: occupants.rows.length,
        safe: occupants.rows.filter(o => o.safety_status === 'safe').length,
        needs_help: occupants.rows.filter(o => o.safety_status === 'needs_help').length,
        distressed: occupants.rows.filter(o => o.safety_status === 'distressed').length,
        unaccounted: occupants.rows.filter(o => !o.safety_status || o.safety_status === 'missing').length
      }
    });
  } catch (error: any) {
    logger.error('Error fetching safety roster:', error);
    res.status(500).json({ error: 'Failed to fetch safety roster' });
  }
};

export const createAutomatedIncident = async (io: any, data: any) => {
  const { propertyId, type, zoneId, description, latitude, longitude, confidence } = data;

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. FAST PATH: Immediate Persistence
      const incidentResult = await client.query(
        `WITH coords AS (
           SELECT $6::double precision AS lat, $7::double precision AS lon
         )
         INSERT INTO incidents (property_id, incident_type, severity, status, zone_id, description, latitude, longitude, location)
         SELECT $1, $2, $3, 'active', $4, $5, coords.lat::numeric, coords.lon::numeric, ST_SetSRID(ST_MakePoint(coords.lon, coords.lat), 4326)
         FROM coords
         RETURNING *`,
        [propertyId, type, 'high', zoneId, `[SIMULATION] ${description}`, latitude, longitude]
      );

      const incident = incidentResult.rows[0];

      // Auto-assign tasks to active staff/security/responders
      await autoAssignTasks(client, incident.id, propertyId, latitude, longitude);

      await client.query('COMMIT');

      // 3. FAST PATH: Immediate Broadcast
      const propertyResult = await client.query('SELECT organization_id, floor_plan_data FROM properties WHERE id = $1', [propertyId]);
      const orgId = propertyResult.rows[0]?.organization_id;
      const floorPlanData = propertyResult.rows[0]?.floor_plan_data;

      if (io) {
        io.to(`property_${propertyId}`).emit('crisis_reported', { incident, timestamp: new Date().toISOString() });
        io.to('role_security')
          .to('role_responder')
          .to('role_admin')
          .to('role_org_admin')
          .to('role_super_admin')
          .to(`organization_${orgId}`)
          .emit('new_crisis', { incident, timestamp: new Date().toISOString() });
      }

      logger.info(`Automated incident created for property ${propertyId}, ID: ${incident.id} (Confidence: ${confidence})`);

      // 4. SLOW PATH: Asynchronous LLM Enrichment
      const activeUsersResult = await query('SELECT COUNT(*) FROM users WHERE property_id = $1 AND status = $2', [propertyId, 'active']);

      const aggregatedState = {
        propertyContext: floorPlanData,
        activeUsersCount: parseInt(activeUsersResult.rows[0]?.count || '0'),
        lastEvents: [data],
        description: description
      };

      // Trigger enrichment without awaiting (async)
      enrichIncident(incident.id, aggregatedState).then((enrichment) => {
        if (enrichment && io) {
          io.to(`property_${propertyId}`).emit('incident_enriched', { 
            incidentId: incident.id, 
            enrichment, 
            timestamp: new Date().toISOString() 
          });
        }
      });

      return incident;
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error creating automated incident:', error);
  }
};


