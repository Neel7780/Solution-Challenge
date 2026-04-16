const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { authenticate, requireRole } = require('../middleware/auth');

// Get all zones for a property
router.get('/zones/:propertyId', authenticate, locationController.getZones);

// Get zone by ID with occupancy
router.get('/zones/detail/:zoneId', authenticate, locationController.getZoneDetails);

// Get real-time occupancy for property
router.get('/occupancy/:propertyId', authenticate, locationController.getOccupancy);

// Get user location history
router.get('/history/:userId', authenticate, locationController.getUserLocationHistory);

// Get active users in zone
router.get('/zone-users/:zoneId', authenticate, requireRole(['admin', 'security', 'responder']), locationController.getUsersInZone);

// Get all active user locations (for command center)
router.get('/active-users/:propertyId', authenticate, requireRole(['admin', 'security', 'responder']), locationController.getAllActiveLocations);

module.exports = router;
