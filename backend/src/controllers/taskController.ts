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

export const aiPrioritizeTasks = async (req: Request, res: Response) => {
  const userContext = req.user;
  if (!userContext) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // 1. Fetch all pending/in_progress tasks for the user's scope
    let baseQuery = `SELECT * FROM tasks WHERE status IN ('pending', 'in_progress')`;
    const params: any[] = [];

    if (userContext.role !== 'super_admin') {
      if (userContext.role === 'org_admin') {
        params.push(userContext.organizationId);
        baseQuery += ` AND (organization_id = $${params.length} OR property_id IN (SELECT id FROM properties WHERE organization_id = $${params.length}))`;
      } else {
        params.push(userContext.propertyId);
        baseQuery += ` AND property_id = $${params.length}`;
      }
    }

    const tasksResult = await query(baseQuery, params);
    const tasks = tasksResult.rows;

    if (tasks.length === 0) {
      return res.json({ success: true, message: 'No active tasks to prioritize.' });
    }

    // 2. Call the new AI Model (mixtral-8x7b-32768) to sort and prioritize
    const prompt = `
    You are an emergency management AI. Your job is to analyze a list of active tasks and reassign their priority based on urgency and risk to human life.
    Priority levels allowed: 'low', 'medium', 'high', 'urgent'.
    Always prioritize tasks involving "fire", "trapped", "medical", or "evacuation" as 'urgent'.
    
    Here are the tasks:
    ${JSON.stringify(tasks.map(t => ({ id: t.id, description: t.description, current_priority: t.priority })))}
    
    Output ONLY a JSON array of objects with the structure: [{"id": 1, "priority": "urgent"}, ...]. Do NOT include any markdown formatting or explanation.
    `;

    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    const data = await aiResponse.json();
    let content = data.choices[0].message.content;
    
    let updates = [];
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) updates = parsed;
      else if (parsed.tasks) updates = parsed.tasks;
      else updates = Object.values(parsed)[0] as any[];
    } catch (e) {
      logger.error('Failed to parse AI priority JSON', e);
      return res.status(500).json({ error: 'AI failed to format priorities correctly.' });
    }

    // 3. Update the tasks in the database
    for (const update of updates) {
      if (update.id && update.priority) {
        await query('UPDATE tasks SET priority = $1 WHERE id = $2', [update.priority, update.id]);
        
        // Broadcast the update to the specific property via Socket IO
        const taskRow = tasks.find(t => t.id === update.id);
        if (taskRow && req.io) {
          req.io.to(`property_${taskRow.property_id}`).emit('task_updated_property', {
            task: { ...taskRow, priority: update.priority }
          });
        }
      }
    }

    res.json({ success: true, message: 'Tasks prioritized successfully by AI.' });
  } catch (error: any) {
    logger.error('Error in aiPrioritizeTasks:', error);
    res.status(500).json({ error: 'Failed to prioritize tasks' });
  }
};
