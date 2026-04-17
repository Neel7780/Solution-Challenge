import twilio from 'twilio';
import type { Request, Response } from 'express';
import { pool } from '../database/connection';
import logger from '../utils/logger';

let twilioClient: any = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

export const sendMassNotification = async (req: Request, res: Response) => {
  const { propertyId, message, channels = ['push'], zones } = req.body;
  try {
    const client = await pool.connect();
    const notifications: any[] = [];

    try {
      await client.query('BEGIN');

      let userQuery = `SELECT id, phone, email FROM users WHERE property_id = $1`;
      const params: any[] = [propertyId];

      if (zones && zones.length > 0) {
        params.push(zones);
        userQuery += ` AND room_number IN (SELECT name FROM zones WHERE id = ANY($2::int[]))`;
      }

      const usersResult = await client.query(userQuery, params);

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

      if (channels.includes('push') && req.io) {
        req.io.to(`property_${propertyId}`).emit('mass_notification', { message, timestamp: new Date().toISOString() });
      }

      const smsClient = twilioClient;
      if (channels.includes('sms') && smsClient) {
        const smsPromises = usersResult.rows
          .filter((u: any) => u.phone)
          .map((user: any) =>
            smsClient.messages.create({
              body: message,
              from: process.env.TWILIO_PHONE_NUMBER,
              to: user.phone,
            }).catch((err: any) => logger.error('SMS send failed:', err))
          );
        await Promise.allSettled(smsPromises);
      }

      logger.info(`Mass notification sent to property ${propertyId}`);

      res.json({ success: true, message: `Notification sent to ${usersResult.rows.length} users`, notifications });
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error sending mass notification:', error);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
};

export const sendNotification = async (req: Request, res: Response) => {
  const { userIds, message, channel = 'push' } = req.body;
  try {
    const notifications: any[] = [];
    for (const userId of userIds) {
      const result = await pool.query(
        `INSERT INTO notifications (recipient_type, recipient_id, channel, message, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        ['individual', userId, channel, message, 'sent']
      );
      notifications.push(result.rows[0]);
    }

    if (channel === 'push' && req.io) {
      userIds.forEach((userId: any) => {
        req.io?.emit(`notification_${userId}`, { message, timestamp: new Date().toISOString() });
      });
    }

    res.json({ success: true, notifications });
  } catch (error: any) {
    logger.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
};

export const getNotificationStatus = async (req: Request, res: Response) => {
  const { notificationId } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM notifications WHERE id = $1`, [notificationId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ success: true, notification: result.rows[0] });
  } catch (error: any) {
    logger.error('Error fetching notification status:', error);
    res.status(500).json({ error: 'Failed to fetch notification status' });
  }
};

export const getNotificationHistory = async (req: Request, res: Response) => {
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
    res.json({ success: true, notifications: result.rows });
  } catch (error: any) {
    logger.error('Error fetching notification history:', error);
    res.status(500).json({ error: 'Failed to fetch notification history' });
  }
};
