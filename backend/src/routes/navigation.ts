import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { calculateSafeRoute } from '../controllers/navigationController';

const router = Router();

// Calculate safest path from current x, y, floor avoiding hazards
router.post('/route', authenticate, calculateSafeRoute);

export default router;
