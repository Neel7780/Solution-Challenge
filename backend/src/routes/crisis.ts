import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import {
  getActiveIncidents,
  getIncident,
  getIncidentDetails,
  getPublishedResolutionReports,
  getPublicCrisisReports,
  reportPublicCrisis,
  reportCrisis,
  reviewPublicCrisisReport,
  resolveIncident,
  updateIncidentStatus,
  updatePropertyStatus,
  getSafetyRoster,
  verifyCCTVFeed,
} from '../controllers/crisisController';

import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

const publicReportLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { error: 'Too many public reports from this source. Please try again later.' },
});

router.post('/report', authenticate, [
  body('propertyId').isInt().withMessage('Property ID is required'),
  body('type').isIn(['fire', 'medical', 'security', 'natural_disaster', 'evacuation', 'other']),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('latitude').optional().isFloat(),
  body('longitude').optional().isFloat(),
  body('zoneId').optional().isInt(),
  body('description').optional().isString()
], reportCrisis);

router.post('/public-report', publicReportLimiter, [
  body('propertyId').isInt().withMessage('Property ID is required'),
  body('type').isIn(['fire', 'medical', 'security', 'natural_disaster', 'evacuation', 'other']),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('latitude').optional().isFloat(),
  body('longitude').optional().isFloat(),
  body('zoneId').optional().isInt(),
  body('description').optional().isString(),
  body('reporterName').optional().isString(),
  body('reporterContact').optional().isString(),
], reportPublicCrisis);

// Public endpoint (no auth) for published post-incident org-admin reports
router.get('/public-resolution-reports', getPublishedResolutionReports);

router.get('/public-reports', authenticate, requireRole(['admin', 'security', 'responder']), getPublicCrisisReports);
router.patch('/public-reports/:id', authenticate, requireRole(['admin', 'security', 'responder']), [
  body('action').isIn(['escalate', 'dismiss']),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
], reviewPublicCrisisReport);

router.get('/active', authenticate, getActiveIncidents);
router.get('/:id', authenticate, getIncident);
router.patch('/:id/status', authenticate, [body('status').isIn(['active', 'contained', 'resolved', 'false_alarm'])], updateIncidentStatus);
router.get('/:id/full', authenticate, getIncidentDetails);
router.post('/:id/resolve', authenticate, resolveIncident);
router.post('/:id/verify-cctv', authenticate, requireRole(['admin', 'security', 'responder', 'org_admin', 'super_admin']), verifyCCTVFeed);

router.post('/property/:propertyId/status', authenticate, requireRole(['admin', 'security', 'staff', 'responder', 'org_admin', 'super_admin']), updatePropertyStatus);
router.get('/property/:propertyId/safety-roster', authenticate, requireRole(['admin', 'security', 'org_admin', 'super_admin', 'responder']), getSafetyRoster);

export default router;