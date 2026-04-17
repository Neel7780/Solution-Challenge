import { Router } from 'express';
import { body } from 'express-validator';
import {
  getActiveIncidents,
  getIncident,
  getIncidentDetails,
  reportCrisis,
  resolveIncident,
  updateIncidentStatus,
} from '../controllers/crisisController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/report', [
  body('propertyId').isInt().withMessage('Property ID is required'),
  body('type').isIn(['fire', 'medical', 'security', 'natural_disaster', 'evacuation', 'other']),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('latitude').optional().isFloat(),
  body('longitude').optional().isFloat(),
  body('zoneId').optional().isInt(),
  body('description').optional().isString()
], reportCrisis);

router.get('/active', getActiveIncidents);
router.get('/:id', getIncident);
router.patch('/:id/status', authenticate, [body('status').isIn(['active', 'contained', 'resolved', 'false_alarm'])], updateIncidentStatus);
router.get('/:id/full', authenticate, getIncidentDetails);
router.post('/:id/resolve', authenticate, resolveIncident);

export default router;