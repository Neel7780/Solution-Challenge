import { query } from '../database/connection';
import type { Request, Response } from 'express';
import logger from '../utils/logger';

export const getPropertyChatHistory = async (req: Request, res: Response) => {
  const { propertyId } = req.params;
  const userContext = req.user!;

  try {
    // 1. Permission checks
    if (userContext.role !== 'super_admin') {
      const propCheck = await query('SELECT organization_id FROM properties WHERE id = $1', [propertyId]);
      if (propCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Property not found' });
      }

      if (userContext.role === 'org_admin') {
        if (propCheck.rows[0].organization_id !== userContext.organizationId) {
          return res.status(403).json({ error: 'Access denied: Property does not belong to your organization' });
        }
      } else {
        if (userContext.propertyId !== Number(propertyId)) {
          return res.status(403).json({ error: 'Access denied: You are not assigned to this property' });
        }
      }
    }

    // 2. Fetch history
    const history = await query(
      `SELECT c.id, c.property_id, c.user_id, c.message, c.created_at,
              u.name as user_name, u.role as user_role
       FROM property_chats c
       JOIN users u ON c.user_id = u.id
       WHERE c.property_id = $1
       ORDER BY c.created_at ASC
       LIMIT 100`,
      [propertyId]
    );

    res.json({ success: true, chat: history.rows });
  } catch (error: any) {
    logger.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
};

export const sendPropertyChatMessage = async (req: Request, res: Response) => {
  const { propertyId } = req.params;
  const { message } = req.body;
  const userContext = req.user!;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message content cannot be empty' });
  }

  try {
    // 1. Permission checks
    if (userContext.role !== 'super_admin') {
      const propCheck = await query('SELECT organization_id FROM properties WHERE id = $1', [propertyId]);
      if (propCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Property not found' });
      }

      if (userContext.role === 'org_admin') {
        if (propCheck.rows[0].organization_id !== userContext.organizationId) {
          return res.status(403).json({ error: 'Access denied: Property does not belong to your organization' });
        }
      } else {
        if (userContext.propertyId !== Number(propertyId)) {
          return res.status(403).json({ error: 'Access denied: You are not assigned to this property' });
        }
      }
    }

    // 2. Insert message
    const insertRes = await query(
      `INSERT INTO property_chats (property_id, user_id, message)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [propertyId, userContext.userId, message]
    );

    const messageId = insertRes.rows[0].id;

    // 3. Fetch newly created message with user context
    const fullMessageRes = await query(
      `SELECT c.id, c.property_id, c.user_id, c.message, c.created_at,
              u.name as user_name, u.role as user_role
       FROM property_chats c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [messageId]
    );

    const messageRow = fullMessageRes.rows[0];

    // 4. Emit through Socket.io to the property room
    if (req.io) {
      req.io.to(`property_${propertyId}`).emit('new_chat_message', messageRow);
      logger.debug(`Chat socket broadcast: Property ${propertyId} User ${userContext.userId}`);
    }

    res.status(201).json({ success: true, message: messageRow });
  } catch (error: any) {
    logger.error('Error sending chat message:', error);
    res.status(500).json({ error: 'Failed to send chat message' });
  }
};
