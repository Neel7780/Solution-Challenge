import { Router } from 'express';
import { body } from 'express-validator';
import {
  checkIn,
  getAllUsers,
  getProfile,
  login,
  register,
  triggerPanic,
  updateLocation,
  updateProfile,
} from '../controllers/userController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.post('/register', [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('phone').optional(),
  body('role').isIn(['guest', 'staff', 'security', 'admin']),
  body('propertyId').isInt(),
  body('roomNumber').optional(),
], register);

router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], login);

router.get('/me', authenticate, getProfile);
router.patch('/me', authenticate, updateProfile);
router.get('/', authenticate, requireRole(['admin', 'security']), getAllUsers);

router.post('/location', authenticate, [
  body('latitude').isFloat(),
  body('longitude').isFloat(),
  body('beaconId').optional(),
  body('zoneId').optional().isInt(),
], updateLocation);

router.post('/panic', authenticate, [
  body('latitude').optional().isFloat(),
  body('longitude').optional().isFloat(),
  body('message').optional(),
], triggerPanic);

router.post('/checkin', authenticate, [
  body('incidentId').isInt(),
  body('status').isIn(['safe', 'distressed', 'needs_help']),
  body('message').optional(),
  body('latitude').optional().isFloat(),
  body('longitude').optional().isFloat(),
], checkIn);

export default router;