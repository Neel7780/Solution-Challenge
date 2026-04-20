import { Router } from 'express';
import {
	getAllActiveLocations,
	getOccupancy,
	getUserLocationHistory,
	getUsersInZone,
	getZoneDetails,
	getZones,
} from '../controllers/locationController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/zones/:propertyId', authenticate, getZones);
router.get('/zones/detail/:zoneId', authenticate, getZoneDetails);
router.get('/occupancy/:propertyId', authenticate, getOccupancy);
router.get('/history/:userId', authenticate, getUserLocationHistory);
router.get('/zone-users/:zoneId', authenticate, requireRole(['admin', 'security', 'staff', 'responder', 'org_admin', 'super_admin']), getUsersInZone);
router.get('/active-users/:propertyId', authenticate, requireRole(['admin', 'security', 'staff', 'responder', 'org_admin', 'super_admin']), getAllActiveLocations);

export default router;