const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, requireRole } = require('../middleware/auth');

// Register new user
router.post('/register', [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('phone').optional(),
  body('role').isIn(['guest', 'staff', 'security', 'admin']),
  body('propertyId').isInt(),
  body('roomNumber').optional(),
], userController.register);

// Login
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], userController.login);

// Get current user profile
router.get('/me', authenticate, userController.getProfile);

// Update user profile
router.patch('/me', authenticate, userController.updateProfile);

// Get all users (admin only)
router.get('/', authenticate, requireRole(['admin', 'security']), userController.getAllUsers);

// Update user location
router.post('/location', authenticate, [
  body('latitude').isFloat(),
  body('longitude').isFloat(),
  body('beaconId').optional(),
  body('zoneId').optional().isInt(),
], userController.updateLocation);

// Panic button trigger
router.post('/panic', authenticate, [
  body('latitude').optional().isFloat(),
  body('longitude').optional().isFloat(),
  body('message').optional(),
], userController.triggerPanic);

// Check-in (I'm Safe)
router.post('/checkin', authenticate, [
  body('incidentId').isInt(),
  body('status').isIn(['safe', 'distressed', 'needs_help']),
  body('message').optional(),
  body('latitude').optional().isFloat(),
  body('longitude').optional().isFloat(),
], userController.checkIn);

module.exports = router;
