const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate, requireRole } = require('../middleware/auth');

// Send mass notification (admin only)
router.post('/mass',
  authenticate,
  requireRole(['admin', 'security']),
  [
    body('propertyId').isInt(),
    body('message').notEmpty(),
    body('channels').isArray().optional(),
    body('zones').optional().isArray(),
  ],
  notificationController.sendMassNotification
);

// Send notification to specific users
router.post('/send',
  authenticate,
  [
    body('userIds').isArray(),
    body('message').notEmpty(),
    body('channel').optional().isIn(['push', 'sms', 'email']),
  ],
  notificationController.sendNotification
);

// Get notification status
router.get('/status/:notificationId', authenticate, notificationController.getNotificationStatus);

// Get notification history
router.get('/history/:propertyId', authenticate, notificationController.getNotificationHistory);

module.exports = router;
