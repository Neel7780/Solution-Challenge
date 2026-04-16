const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, requireRole } = require('../middleware/auth');

// Get dashboard overview for property
router.get('/overview/:propertyId', authenticate, dashboardController.getOverview);

// Get triage counter data
router.get('/triage/:propertyId', authenticate, dashboardController.getTriageData);

// Get real-time statistics
router.get('/stats/:propertyId', authenticate, dashboardController.getStats);

// Get incident timeline
router.get('/timeline/:propertyId', authenticate, dashboardController.getTimeline);

// Get zone status heatmap
router.get('/heatmap/:propertyId', authenticate, dashboardController.getHeatmap);

module.exports = router;
