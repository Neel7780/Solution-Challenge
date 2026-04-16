const { pool } = require('../database/connection');
const logger = require('../utils/logger');

// Twilio setup (optional - only if credentials provided)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  const twilio = require('twilio');
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

exports.sendMassNotification = async (req, res) => {
  const { propertyId, message, channels = ['push'], zones } = req.body;

  try {
    const client = await pool.connect();
    const notifications = [];

    try {
      await client.query('BEGIN');

      // Get target users
      let userQuery = `SELECT id, phone, email FROM users WHERE property_id = $1`;
      const params = [propertyId];

      if (zones && zones.length > 0) {
        params.push(zones);
        userQuery += ` AND room_number IN (SELECT name FROM zones WHERE id = ANY($2::int[]))`;
      }

      const usersResult = await client.query(userQuery, params);

      // Create notifications for each user
      for (const user of usersResult.rows) {
        for (const channel of channels) {
          const notifResult = await client.query(
            `INSERT INTO notifications (recipient_type, recipient_id, channel, message, status)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            ['individual', user.id, channel, message, 'pending']
          );

          notifications.push(notifResult.rows[0]);
        }
      }

      await client.query('COMMIT');

      // Send via WebSocket for push notifications
      if (channels.includes('push') && req.io) {
        req.io.to(`property_${propertyId}`).emit('mass_notification', {
          message,
          timestamp: new Date().toISOString()
        });
      }

      // Send SMS via Twilio if configured
      if (channels.includes('sms') && twilioClient) {
        const smsPromises = usersResult.rows
          .filter(u => u.phone)
          .map(user =>
            twilioClient.messages.create({
              body: message,
              from: process.env.TWILIO_PHONE_NUMBER,
              to: user.phone
            }).catch(err => logger.error('SMS send failed:', err))
          );
        await Promise.allSettled(smsPromises);
      }

      logger.info(`Mass notification sent to property ${propertyId}`);

      res.json({
        success: true,
        message: `Notification sent to ${usersResult.rows.length} users`,
        notifications
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Error sending mass notification:', error);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
};

exports.sendNotification = async (req, res) => {
  const { userIds, message, channel = 'push' } = req.body;

  try {
    const notifications = [];

    for (const userId of userIds) {
      const result = await pool.query(
        `INSERT INTO notifications (recipient_type, recipient_id, channel, message, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        ['individual', userId, channel, message, 'sent']
      );
      notifications.push(result.rows[0]);
    }

    // Broadcast via WebSocket
    if (channel === 'push' && req.io) {
      userIds.forEach(userId => {
        req.io.emit(`notification_${userId}`, {
          message,
          timestamp: new Date().toISOString()
        });
      });
    }

    res.json({
      success: true,
      notifications
    });

  } catch (error) {
    logger.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
};

exports.getNotificationStatus = async (req, res) => {
  const { notificationId } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM notifications WHERE id = $1`,
      [notificationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      success: true,
      notification: result.rows[0]
    });

  } catch (error) {
    logger.error('Error fetching notification status:', error);
    res.status(500).json({ error: 'Failed to fetch notification status' });
  }
};

exports.getNotificationHistory = async (req, res) => {
  const { propertyId } = req.params;
  const { limit = 50 } = req.query;

  try {
    const result = await pool.query(
      `SELECT n.*, i.incident_type
       FROM notifications n
       LEFT JOIN incidents i ON n.incident_id = i.id
       WHERE i.property_id = $1 OR n.recipient_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2`,
      [propertyId, limit]
    );

    res.json({
      success: true,
      notifications: result.rows
    });

  } catch (error) {
    logger.error('Error fetching notification history:', error);
    res.status(500).json({ error: 'Failed to fetch notification history' });
  }
};
