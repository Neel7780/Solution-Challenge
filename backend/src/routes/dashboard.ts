import { Router } from 'express';
import { getHeatmap, getOverview, getStats, getTimeline, getTriageData } from '../controllers/dashboardController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/overview/:propertyId', authenticate, getOverview);
router.get('/triage/:propertyId', authenticate, getTriageData);
router.get('/stats/:propertyId', authenticate, getStats);
router.get('/timeline/:propertyId', authenticate, getTimeline);
router.get('/heatmap/:propertyId', authenticate, getHeatmap);

export default router;