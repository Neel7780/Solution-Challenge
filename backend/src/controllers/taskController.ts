import { query } from '../database/connection';
import type { Request, Response } from 'express';
import logger from '../utils/logger';

export const getTasks = async (req: Request, res: Response) => {
  const userContext = req.user;

  if (!userContext) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    let baseQuery = `
      SELECT t.*, 
             u_to.name as assigned_to_name, 
             u_by.name as assigned_by_name,
             p.name as property_name,
             org.name as organization_name,
             i.incident_type as incident_type
      FROM tasks t
      LEFT JOIN users u_to ON t.assigned_to = u_to.id
      LEFT JOIN users u_by ON t.assigned_by = u_by.id
      LEFT JOIN properties p ON t.property_id = p.id
      LEFT JOIN organizations org ON COALESCE(t.organization_id, p.organization_id) = org.id
      LEFT JOIN incidents i ON t.incident_id = i.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (userContext.role !== 'super_admin') {
      if (userContext.role === 'org_admin') {
        params.push(userContext.organizationId);
        baseQuery += ` AND (
          t.organization_id = $${params.length}
          OR t.property_id IN (SELECT id FROM properties WHERE organization_id = $${params.length})
        )`;
      } else {
        params.push(userContext.propertyId);
        baseQuery += ` AND t.property_id = $${params.length}`;
      }
    }

    baseQuery += ` ORDER BY t.created_at DESC`;
    const result = await query(baseQuery, params);

    res.json({ success: true, count: result.rows.length, tasks: result.rows });
  } catch (error: any) {
    logger.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

export const createTask = async (req: Request, res: Response) => {
  const { incidentId, propertyId, assignedTo, taskType, priority, description } = req.body;
  const assignedBy = req.user!.userId;

  if (!propertyId || !assignedTo || !description) {
    return res.status(400).json({ error: 'propertyId, assignedTo, and description are required' });
  }

  try {
    // Verify context permission
    if (req.user!.role !== 'super_admin') {
      const propCheck = await query('SELECT organization_id FROM properties WHERE id = $1', [propertyId]);
      if (propCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Property not found' });
      }
      if (req.user!.role === 'org_admin' && propCheck.rows[0].organization_id !== req.user!.organizationId) {
        return res.status(403).json({ error: 'Access denied to this property' });
      }
      if (req.user!.role !== 'org_admin' && req.user!.propertyId !== Number(propertyId)) {
        return res.status(403).json({ error: 'Access denied to this property' });
      }
    }

    // Resolve organization_id
    const propResult = await query('SELECT organization_id FROM properties WHERE id = $1', [propertyId]);
    const organizationId = propResult.rows[0]?.organization_id || null;

    const result = await query(
      `INSERT INTO tasks (incident_id, property_id, organization_id, assigned_to, assigned_by, task_type, priority, status, description, assigned_by_ai)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, false)
       RETURNING *`,
      [incidentId || null, propertyId, organizationId, assignedTo, assignedBy, taskType || 'general', priority || 'medium', description]
    );

    // Notify assigned user if socket IO exists
    if (req.io) {
      req.io.to(`user_${assignedTo}`).emit('task_assigned', {
        taskId: result.rows[0].id,
        message: `New task assigned: ${description}`,
      });
      req.io.to(`property_${propertyId}`).emit('task_assigned_property', {
        task: result.rows[0],
      });
    }

    res.status(201).json({ success: true, task: result.rows[0] });
  } catch (error: any) {
    logger.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { assignedTo, priority, status, description } = req.body;

  try {
    // Get existing task to check permissions
    const taskCheck = await query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const task = taskCheck.rows[0];

    if (req.user!.role !== 'super_admin') {
      if (req.user!.role === 'org_admin' && task.organization_id !== req.user!.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (req.user!.role !== 'org_admin' && task.property_id !== req.user!.propertyId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const result = await query(
      `UPDATE tasks
       SET assigned_to = COALESCE($1, assigned_to),
           priority = COALESCE($2, priority),
           status = COALESCE($3, status),
           description = COALESCE($4, description),
           completed_at = CASE WHEN $3 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
       WHERE id = $5
       RETURNING *`,
      [assignedTo, priority, status, description, id]
    );

    if (req.io) {
      req.io.to(`property_${task.property_id}`).emit('task_updated_property', {
        task: result.rows[0],
      });
      if (assignedTo && assignedTo !== task.assigned_to) {
        req.io.to(`user_${assignedTo}`).emit('task_assigned', {
          taskId: id,
          message: `New task assigned: ${description || task.description}`,
        });
      }
    }

    res.json({ success: true, task: result.rows[0] });
  } catch (error: any) {
    logger.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const taskCheck = await query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const task = taskCheck.rows[0];

    if (req.user!.role !== 'super_admin') {
      if (req.user!.role === 'org_admin' && task.organization_id !== req.user!.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (req.user!.role !== 'org_admin' && task.property_id !== req.user!.propertyId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    await query('DELETE FROM tasks WHERE id = $1', [id]);

    if (req.io) {
      req.io.to(`property_${task.property_id}`).emit('task_deleted_property', {
        taskId: id,
      });
    }

    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};
