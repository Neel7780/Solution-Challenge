import twilio from 'twilio';
import type { Request, Response } from 'express';
import { pool, query } from '../database/connection';
import logger from '../utils/logger';

let twilioClient: any = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

export const sendMassNotification = async (req: Request, res: Response) => {
  const propertyId = req.user!.propertyId;
  const { message, channels = ['push'], zones } = req.body;
  const requestedChannels: string[] = Array.isArray(channels) ? channels : ['push'];
  const normalizedChannels = Array.from(new Set(
    requestedChannels
      .map((c) => String(c).trim().toLowerCase())
      .map((c) => (c === 'inapp' ? 'push' : c))
      .filter((c) => ['push', 'sms', 'email'].includes(c))
  ));

  const effectiveChannels = normalizedChannels.length > 0 ? normalizedChannels : ['push'];
  const warnings: string[] = [];

  const unsupportedChannels = requestedChannels.filter((raw) => {
    const c = String(raw).trim().toLowerCase();
    return c !== 'inapp' && !['push', 'sms', 'email'].includes(c);
  });
  if (unsupportedChannels.length > 0) {
    warnings.push(`Ignored unsupported channels: ${unsupportedChannels.join(', ')}`);
  }

  if (effectiveChannels.includes('sms') && (!twilioClient || !process.env.TWILIO_PHONE_NUMBER)) {
    warnings.push('SMS requested, but Twilio is not fully configured. Skipped SMS delivery.');
  }

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

      // Create individual records for SMS and Email
      const individualChannels = effectiveChannels.filter(c => ['sms', 'email'].includes(c));
      for (const user of usersResult.rows) {
        for (const channel of individualChannels) {
          const notifResult = await client.query(
            `INSERT INTO notifications (recipient_type, recipient_id, channel, message, status, property_id)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            ['individual', user.id, channel, message, 'pending', propertyId]
          );
          notifications.push(notifResult.rows[0]);
        }
      }

      // Create a single 'property' level record for Push/In-App
      if (effectiveChannels.includes('push')) {
        const notifResult = await client.query(
          `INSERT INTO notifications (recipient_type, recipient_id, channel, message, status, property_id)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          ['property', String(propertyId), 'push', message, 'sent', propertyId]
        );
        notifications.push(notifResult.rows[0]);
      }

      await client.query('COMMIT');

      if (effectiveChannels.includes('push') && req.io) {
        req.io.to(`property_${propertyId}`).emit('mass_notification', { message, timestamp: new Date().toISOString() });
      }

      const smsClient = twilioClient;
      if (effectiveChannels.includes('sms') && smsClient && process.env.TWILIO_PHONE_NUMBER) {
        const smsPromises = usersResult.rows
          .filter((u: any) => u.phone)
          .map((user: any) =>
            smsClient.messages.create({
              body: message,
              from: process.env.TWILIO_PHONE_NUMBER,
              to: user.phone,
            }).catch((err: any) => {
              logger.error('SMS send failed:', err);
              warnings.push(`SMS failed for user ${user.id}`);
            })
          );
        await Promise.allSettled(smsPromises);
      }

      logger.info(`Mass notification sent to property ${propertyId}`);

      res.json({
        success: true,
        message: `Notification sent to ${usersResult.rows.length} users`,
        notifications,
        warnings: warnings.length > 0 ? warnings : undefined,
      });
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
  const propertyId = req.user?.propertyId;
  try {
    const notifications: any[] = [];
    for (const userId of userIds) {
      const result = await query(
        `INSERT INTO notifications (recipient_type, recipient_id, channel, message, status, property_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        ['individual', userId, channel, message, 'sent', propertyId]
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
    const result = await query(`SELECT * FROM notifications WHERE id = $1`, [notificationId]);
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
  const propertyId = req.user!.propertyId;
  const { limit = 50 } = req.query;
  try {
    const result = await query(
      `SELECT n.*, i.incident_type
       FROM notifications n
       LEFT JOIN incidents i ON n.incident_id = i.id
       WHERE 
         n.property_id = $1 
         OR i.property_id = $1 
         OR (n.recipient_type = 'individual' AND n.recipient_id = $2::text)
         OR (n.recipient_type = 'property' AND n.recipient_id = $1::text)
       ORDER BY n.created_at DESC
       LIMIT $3`,
      [propertyId, req.user!.userId, limit]
    );
    res.json({ success: true, notifications: result.rows });
  } catch (error: any) {
    logger.error('Error fetching notification history:', error);
    res.status(500).json({ error: 'Failed to fetch notification history' });
  }
};

export const markNotificationAsRead = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await query(
      `UPDATE notifications 
       SET is_read = TRUE, 
           status = 'read', 
           read_at = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ success: true, notification: result.rows[0] });
  } catch (error: any) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};
