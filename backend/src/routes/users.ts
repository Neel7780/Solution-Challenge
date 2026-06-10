import { Router } from 'express';
import { body } from 'express-validator';
import {
  changePassword,
  createGuestAccount,
  checkIn,
  getAllUsers,
  getProfile,
  login,
  register,
  triggerPanic,
  updateLocation,
  updateProfile,
  switchContext,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, requireRole(['org_admin', 'super_admin', 'admin']), [
  body('name').notEmpty(),
  body('email').optional().isEmail(),
  body('role').isIn(['staff', 'security', 'admin', 'responder', 'org_admin']),
  body('password').isLength({ min: 8 }),
], createUser);

router.patch('/:id', authenticate, requireRole(['org_admin', 'super_admin', 'admin']), updateUser);
router.delete('/:id', authenticate, requireRole(['org_admin', 'super_admin', 'admin']), deleteUser);

router.post('/register', [
  body('name').notEmpty(),
  body('email').optional().isEmail(),
  body('phone').optional().isString(),
  body('password').isLength({ min: 8 }),
  body('propertyId').optional().isInt(),
  body('roomNumber').optional(),
], register);

router.post('/guests', authenticate, requireRole(['admin', 'staff', 'security']), [
  body('name').notEmpty(),
  body('email').optional().isEmail(),
  body('phone').optional().isString(),
  body('password').isLength({ min: 8 }),
  body('propertyId').optional().isInt(),
  body('roomNumber').optional(),
], createGuestAccount);

router.post('/login', [
  body('identifier').optional().isString(),
  body('email').optional().isEmail(),
  body('password').notEmpty(),
  body('propertyId').optional().isInt(),
], login);

router.post('/switch-context', authenticate, [
  body('propertyId').isInt(),
], switchContext);

router.get('/me', authenticate, getProfile);
router.patch('/me', authenticate, updateProfile);
router.patch('/me/password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
], changePassword);
router.get('/', authenticate, requireRole(['admin', 'security', 'staff', 'org_admin', 'super_admin']), getAllUsers);


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
  body('userId').optional().isInt(),
  body('message').optional(),
  body('latitude').optional().isFloat(),
  body('longitude').optional().isFloat(),
], checkIn);

export default router;