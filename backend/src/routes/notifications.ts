import { Router } from 'express';
import { body } from 'express-validator';
import {
  getNotificationHistory,
  getNotificationStatus,
  markNotificationAsRead,
  sendMassNotification,
  sendNotification,
} from '../controllers/notificationController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.post('/:id/read', authenticate, markNotificationAsRead);

router.post('/mass', authenticate, requireRole(['admin', 'security', 'staff', 'org_admin', 'super_admin']), [
  body('propertyId').isInt(),
  body('message').notEmpty(),
  body('channels').isArray().optional(),
  body('zones').optional().isArray(),
], sendMassNotification);

router.post('/send', authenticate, [
  body('userIds').isArray(),
  body('message').notEmpty(),
  body('channel').optional().isIn(['push', 'sms', 'email']),
], sendNotification);

router.get('/status/:notificationId', authenticate, getNotificationStatus);
router.get('/history/:propertyId', authenticate, getNotificationHistory);

export default router;