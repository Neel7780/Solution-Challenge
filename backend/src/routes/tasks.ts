import { Router } from 'express';
import { getTasks, createTask, updateTask, deleteTask } from '../controllers/taskController';
import { authenticate, requireRole } from '../middleware/auth';
import { body } from 'express-validator';

const router = Router();

router.get('/', authenticate, getTasks);

router.post('/', authenticate, requireRole(['super_admin', 'org_admin', 'admin']), [
  body('propertyId').isInt().withMessage('Property ID must be an integer'),
  body('assignedTo').isInt().withMessage('Assigned To User ID must be an integer'),
  body('description').notEmpty().withMessage('Description is required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('taskType').optional().isString(),
  body('incidentId').optional().isInt(),
], createTask);

router.patch('/:id', authenticate, requireRole(['super_admin', 'org_admin', 'admin']), [
  body('assignedTo').optional().isInt(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled']),
  body('description').optional().isString(),
], updateTask);

router.delete('/:id', authenticate, requireRole(['super_admin', 'org_admin', 'admin']), deleteTask);

export default router;
