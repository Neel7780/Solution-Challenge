import { Router } from 'express';
import {
	getHeatmap,
	getOverview,
	getOrganizationProperties,
	getPropertySettings,
	getStats,
	getTimeline,
	getTriageData,
	updatePropertySettings,
	createProperty,
} from '../controllers/dashboardController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/overview/:propertyId', authenticate, requireRole(['admin', 'security', 'staff', 'responder', 'org_admin', 'super_admin']), getOverview);
router.get('/triage/:propertyId', authenticate, requireRole(['admin', 'security', 'staff', 'responder', 'org_admin', 'super_admin']), getTriageData);
router.get('/stats/:propertyId', authenticate, requireRole(['admin', 'security', 'staff', 'responder', 'org_admin', 'super_admin']), getStats);
router.get('/timeline/:propertyId', authenticate, requireRole(['admin', 'security', 'staff', 'responder', 'org_admin', 'super_admin']), getTimeline);
router.get('/heatmap', authenticate, requireRole(['admin', 'security', 'staff', 'responder', 'org_admin', 'super_admin']), getHeatmap);
router.get('/organization/properties', authenticate, requireRole(['org_admin', 'super_admin']), getOrganizationProperties);
router.post('/organization/properties', authenticate, requireRole(['org_admin', 'super_admin']), createProperty);
router.get('/settings/:propertyId', authenticate, getPropertySettings);


router.patch('/settings/:propertyId', authenticate, updatePropertySettings);

export default router;