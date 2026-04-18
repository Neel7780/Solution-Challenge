import { Router } from 'express';
import {
	getHeatmap,
	getOverview,
	getPropertySettings,
	getStats,
	getTimeline,
	getTriageData,
	updatePropertySettings,
} from '../controllers/dashboardController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/overview/:propertyId', authenticate, requireRole(['admin', 'security', 'staff', 'responder']), getOverview);
router.get('/triage/:propertyId', authenticate, requireRole(['admin', 'security', 'staff', 'responder']), getTriageData);
router.get('/stats/:propertyId', authenticate, requireRole(['admin', 'security', 'staff', 'responder']), getStats);
router.get('/timeline/:propertyId', authenticate, requireRole(['admin', 'security', 'staff', 'responder']), getTimeline);
router.get('/heatmap/:propertyId', authenticate, requireRole(['admin', 'security', 'staff', 'responder']), getHeatmap);
router.get('/settings/:propertyId', authenticate, getPropertySettings);
router.patch('/settings/:propertyId', authenticate, updatePropertySettings);

export default router;