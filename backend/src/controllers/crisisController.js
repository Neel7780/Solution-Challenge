const { pool } = require('../database/connection');
const logger = require('../utils/logger');

exports.reportCrisis = async (req, res) => {
  const { propertyId, type, severity = 'high', latitude, longitude, zoneId, description, userId } = req.body;

  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Create incident
      const incidentResult = await client.query(
        `INSERT INTO incidents (property_id, reported_by, incident_type, severity, status, zone_id, description, latitude, longitude, location)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ST_SetSRID(ST_MakePoint($9, $8), 4326))
         RETURNING *`,
        [propertyId, userId || null, type, severity, 'active', zoneId, description, latitude, longitude]
      );

      const incident = incidentResult.rows[0];

      // Create initial check-in if userId provided
      if (userId) {
        await client.query(
          `INSERT INTO check_ins (user_id, incident_id, status, latitude, longitude, location)
           VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($5, $4), 4326))`,
          [userId, incident.id, 'distressed', latitude, longitude]
        );
      }

      // Create mass notification
      await client.query(
        `INSERT INTO notifications (incident_id, recipient_type, recipient_id, channel, message, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [incident.id, 'property', propertyId, 'push', `EMERGENCY: ${type.toUpperCase()} reported. Please check in immediately.`, 'pending']
      );

      await client.query('COMMIT');

      // Broadcast to connected clients via WebSocket
      if (req.io) {
        req.io.to(`property_${propertyId}`).emit('crisis_reported', {
          incident,
          timestamp: new Date().toISOString()
        });

        // Also notify security and responders
        req.io.to('role_security').to('role_responder').to('role_admin').emit('new_crisis', {
          incident,
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`Crisis reported: ${type} at property ${propertyId}, incident ID: ${incident.id}`);

      res.status(201).json({
        success: true,
        incident,
        message: 'Crisis reported successfully. Emergency services have been notified.'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Error reporting crisis:', error);
    res.status(500).json({ error: 'Failed to report crisis' });
  }
};

exports.getActiveIncidents = async (req, res) => {
  const { propertyId, type } = req.query;

  try {
    let query = `
      SELECT i.*, u.name as reported_by_name, z.name as zone_name
      FROM incidents i
      LEFT JOIN users u ON i.reported_by = u.id
      LEFT JOIN zones z ON i.zone_id = z.id
      WHERE i.status = 'active'
    `;
    const params = [];

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

    res.json({
      success: true,
      count: result.rows.length,
      incidents: result.rows
    });

  } catch (error) {
    logger.error('Error fetching active incidents:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
};

exports.getIncident = async (req, res) => {
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

    res.json({
      success: true,
      incident: result.rows[0]
    });

  } catch (error) {
    logger.error('Error fetching incident:', error);
    res.status(500).json({ error: 'Failed to fetch incident' });
  }
};

exports.getIncidentDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const client = await pool.connect();

    try {
      // Get incident
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

      // Get check-ins
      const checkInsResult = await client.query(
        `SELECT c.*, u.name, u.room_number, u.role
         FROM check_ins c
         JOIN users u ON c.user_id = u.id
         WHERE c.incident_id = $1
         ORDER BY c.created_at DESC`,
        [id]
      );

      // Get tasks
      const tasksResult = await client.query(
        `SELECT t.*, u1.name as assigned_to_name, u2.name as assigned_by_name
         FROM tasks t
         LEFT JOIN users u1 ON t.assigned_to = u1.id
         LEFT JOIN users u2 ON t.assigned_by = u2.id
         WHERE t.incident_id = $1
         ORDER BY t.created_at DESC`,
        [id]
      );

      // Get notifications
      const notificationsResult = await client.query(
        `SELECT * FROM notifications WHERE incident_id = $1 ORDER BY created_at DESC`,
        [id]
      );

      res.json({
        success: true,
        incident: incidentResult.rows[0],
        checkIns: checkInsResult.rows,
        tasks: tasksResult.rows,
        notifications: notificationsResult.rows
      });

    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Error fetching incident details:', error);
    res.status(500).json({ error: 'Failed to fetch incident details' });
  }
};

exports.updateIncidentStatus = async (req, res) => {
  const { id } = req.params;
  const { status, resolvedBy } = req.body;

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

      // Broadcast status update
      if (req.io) {
        req.io.emit('incident_status_update', {
          incidentId: id,
          status,
          resolvedAt,
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`Incident ${id} status updated to: ${status}`);

      res.json({
        success: true,
        incident: result.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Error updating incident status:', error);
    res.status(500).json({ error: 'Failed to update incident status' });
  }
};

exports.resolveIncident = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE incidents SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Broadcast resolution
    if (req.io) {
      req.io.emit('incident_resolved', {
        incidentId: id,
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`Incident ${id} resolved`);

    res.json({
      success: true,
      incident: result.rows[0]
    });

  } catch (error) {
    logger.error('Error resolving incident:', error);
    res.status(500).json({ error: 'Failed to resolve incident' });
  }
};
