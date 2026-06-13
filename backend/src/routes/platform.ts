import { Router } from 'express';
import { validateRequest } from '../middleware/validate';
import { body } from 'express-validator';
import {
  submitOnboardingRequest,
  getOnboardingRequests,
  reviewOnboardingRequest,
  getOrganizations,
} from '../controllers/platformController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Public onboarding request
router.post('/request-access', [
  body('orgName').notEmpty(),
  body('orgType').notEmpty(),
  body('contactName').notEmpty(),
  body('contactEmail').isEmail(),
  body('contactPhone').notEmpty(),
], validateRequest, submitOnboardingRequest);

// Admin-only management
router.get('/requests', authenticate, requireRole(['super_admin']), getOnboardingRequests);
router.get('/organizations', authenticate, requireRole(['super_admin']), getOrganizations);
router.patch('/requests/:id', authenticate, requireRole(['super_admin']), [
  body('action').isIn(['approved', 'rejected']),
], validateRequest, reviewOnboardingRequest);


export default router;
