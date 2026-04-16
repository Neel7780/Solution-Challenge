const { pool } = require('../database/connection');
const logger = require('../utils/logger');

exports.getOverview = async (req, res) => {
  const { propertyId } = req.params;

  try {
    const client = await pool.connect();

    try {
      // Active incidents
      const incidentsResult = await client.query(
        `SELECT COUNT(*) as active_incidents,
         COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
         COUNT(*) FILTER (WHERE severity = 'high') as high_count
         FROM incidents WHERE property_id = $1 AND status = 'active'`,
        [propertyId]
      );

      // User status
      const usersResult = await client.query(
        `SELECT
         COUNT(*) FILTER (WHERE status = 'active') as active_users,
         COUNT(*) FILTER (WHERE status = 'evacuated') as evacuated_users
         FROM users WHERE property_id = $1`,
        [propertyId]
      );

      // Recent check-ins for active incidents
      const checkInsResult = await client.query(
        `SELECT c.status, COUNT(*) as count
         FROM check_ins c
         JOIN incidents i ON c.incident_id = i.id
         WHERE i.property_id = $1 AND i.status = 'active'
         AND c.created_at > NOW() - INTERVAL '1 hour'
         GROUP BY c.status`,
        [propertyId]
      );

      // Zone occupancy
      const occupancyResult = await client.query(
        `SELECT SUM(current_occupancy) as total FROM zones WHERE property_id = $1`,
        [propertyId]
      );

      res.json({
        success: true,
        overview: {
          incidents: incidentsResult.rows[0],
          users: usersResult.rows[0],
          checkIns: checkInsResult.rows,
          currentOccupancy: parseInt(occupancyResult.rows[0].total) || 0
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Error fetching overview:', error);
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
};

exports.getTriageData = async (req, res) => {
  const { propertyId } = req.params;

  try {
    const client = await pool.connect();

    try {
      // Triage by status for active incidents
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

      // Users who haven't checked in for active incidents
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
          unchecked: parseInt(missingResult.rows[0].unchecked_count)
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Error fetching triage data:', error);
    res.status(500).json({ error: 'Failed to fetch triage data' });
  }
};

exports.getStats = async (req, res) => {
  const { propertyId } = req.params;
  const { period = '24h' } = req.query;

  try {
    let interval = '24 hours';
    if (period === '7d') interval = '7 days';
    if (period === '30d') interval = '30 days';

    const statsResult = await pool.query(
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

    const avgResponseResult = await pool.query(
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
        avgResponseTime: avgResponseResult.rows[0].avg_response_seconds
      }
    });

  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

exports.getTimeline = async (req, res) => {
  const { propertyId } = req.params;
  const { limit = 50 } = req.query;

  try {
    const result = await pool.query(
      `SELECT i.*, u.name as reported_by_name
       FROM incidents i
       LEFT JOIN users u ON i.reported_by = u.id
       WHERE i.property_id = $1
       ORDER BY i.created_at DESC
       LIMIT $2`,
      [propertyId, limit]
    );

    res.json({
      success: true,
      timeline: result.rows
    });

  } catch (error) {
    logger.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
};

exports.getHeatmap = async (req, res) => {
  const { propertyId } = req.params;

  try {
    const result = await pool.query(
      `SELECT z.id, z.name, z.current_occupancy, z.capacity, z.zone_type,
       COUNT(i.id) as incident_count
       FROM zones z
       LEFT JOIN incidents i ON z.id = i.zone_id AND i.status = 'active'
       WHERE z.property_id = $1
       GROUP BY z.id
       ORDER BY incident_count DESC, z.current_occupancy DESC`,
      [propertyId]
    );

    res.json({
      success: true,
      heatmap: result.rows
    });

  } catch (error) {
    logger.error('Error fetching heatmap:', error);
    res.status(500).json({ error: 'Failed to fetch heatmap' });
  }
};
