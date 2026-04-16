# Godot Visualization Module

This directory is reserved for the Godot Engine visualization component.

## Overview

The Godot module acts as a "Digital Twin" command center visualizer that displays:
- 2D floor plans of the property
- Real-time room status updates
- Staff/guest location tracking
- Active incident visualization

## Integration Points

The Godot module should connect to the Node.js backend via:

### REST API Endpoints
- `GET /api/locations/zones/:propertyId` - Get zone coordinates
- `GET /api/locations/active-users/:propertyId` - Get user positions
- `GET /api/crisis/active` - Get active incidents

### WebSocket Events (Socket.io)
Connect to: `ws://localhost:3000`

**Listen for:**
- `crisis_reported` - New crisis alert with location
- `user_location_update` - User position update
- `incident_status_update` - Incident status change
- `user_checkin` - User checked in

**Emit:**
- `join_property` - Subscribe to property updates

## Expected Data Format

### Zone Data
```json
{
  "id": 1,
  "name": "Lobby",
  "zone_type": "common_area",
  "coordinates": {
    "type": "Polygon",
    "coordinates": [[[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]]
  },
  "current_occupancy": 45,
  "capacity": 200
}
```

### User Position
```json
{
  "userId": 1,
  "latitude": 40.7128,
  "longitude": -74.0060,
  "zoneId": 1,
  "beaconId": "beacon-001"
}
```

### Incident Alert
```json
{
  "incident": {
    "id": 1,
    "incident_type": "fire",
    "severity": "critical",
    "zone_id": 3,
    "status": "active"
  }
}
```

## Visual Mapping

| Status | Color |
|--------|-------|
| Safe | Green |
| Distressed | Orange |
| Needs Help | Red |
| Missing | Gray |
| Active Incident Zone | Flashing Red |
| Normal Zone | White/Blue |

## Setup Instructions

1. Install Godot Engine 4.x
2. Create a new project in this directory
3. Add HTTPRequest node for REST API calls
4. Configure Socket.io client for WebSocket connection
5. Create Area2D nodes for zones
6. Implement sprite updates based on WebSocket events

## Notes

- This module is maintained by the designated Godot development team
- Ensure coordinate system matches between database and Godot
- Consider implementing camera controls for floor plan navigation
- Add sound alerts for critical incidents
