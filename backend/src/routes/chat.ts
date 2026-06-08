import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getPropertyChatHistory, sendPropertyChatMessage } from '../controllers/chatController';

const router = Router();

router.get('/property/:propertyId', authenticate, getPropertyChatHistory);
router.post('/property/:propertyId', authenticate, sendPropertyChatMessage);

export default router;
