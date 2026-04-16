const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const crisisController = require('../controllers/crisisController');
const { authenticate } = require('../middleware/auth');

// Report a crisis/panic
router.post('/report',
  [
    body('propertyId').isInt().withMessage('Property ID is required'),
    body('type').isIn(['fire', 'medical', 'security', 'natural_disaster', 'evacuation', 'other']),
    body('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
    body('latitude').optional().isFloat(),
    body('longitude').optional().isFloat(),
    body('zoneId').optional().isInt(),
    body('description').optional().isString()
  ],
  crisisController.reportCrisis
);

// Get all active incidents
router.get('/active', crisisController.getActiveIncidents);

// Get specific incident
router.get('/:id', crisisController.getIncident);

// Update incident status
router.patch('/:id/status',
  authenticate,
  [body('status').isIn(['active', 'contained', 'resolved', 'false_alarm'])],
  crisisController.updateIncidentStatus
);

// Get incident with full details (check-ins, tasks, notifications)
router.get('/:id/full', authenticate, crisisController.getIncidentDetails);

// Resolve incident
router.post('/:id/resolve', authenticate, crisisController.resolveIncident);

module.exports = router;
