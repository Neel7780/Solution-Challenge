import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { analyzeSnapshot, getHistory, feedToDashboard } from '../controllers/simulationController';

const router = Router();

// All simulation routes require authentication
router.use(authenticate);

// POST /api/simulation/analyze — Submit snapshot for AI analysis
router.post('/analyze', analyzeSnapshot);

// GET /api/simulation/history — Past analysis results
router.get('/history', getHistory);

// POST /api/simulation/feed-to-dashboard — Push analysis as real incident
router.post('/feed-to-dashboard', feedToDashboard);

export default router;
