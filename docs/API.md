# Crisis Response API Documentation

## Base URL
```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication
All endpoints (except login/register) require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints Reference

### Users

#### POST `/users/login`
Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "user@hotel.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "John Smith",
    "email": "user@hotel.com",
    "role": "staff",
    "property_id": 1
  }
}
```

#### POST `/users/register`
Register a new user (admin only for most roles).

**Request:**
```json
{
  "name": "New User",
  "email": "new@hotel.com",
  "phone": "+1234567890",
  "role": "guest",
  "propertyId": 1,
  "roomNumber": "301",
  "password": "password123"
}
```

#### GET `/users/me`
Get current authenticated user profile.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "John Smith",
    "email": "user@hotel.com",
    "role": "staff",
    "room_number": "101"
  }
}
```

#### POST `/users/panic`
Trigger panic button alert.

**Request:**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "message": "Emergency in room 301"
}
```

#### POST `/users/checkin`
Check-in during active incident.

**Request:**
```json
{
  "incidentId": 1,
  "status": "safe",
  "message": "I am safe in the lobby",
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

**Status options:** `safe`, `distressed`, `needs_help`

---

### Crisis Management

#### POST `/crisis/report`
Report a new crisis incident.

**Request:**
```json
{
  "propertyId": 1,
  "type": "fire",
  "severity": "critical",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "zoneId": 3,
  "description": "Fire detected in kitchen",
  "userId": 1
}
```

**Types:** `fire`, `medical`, `security`, `natural_disaster`, `evacuation`, `other`

**Severity levels:** `low`, `medium`, `high`, `critical`

**Response:**
```json
{
  "success": true,
  "incident": {
    "id": 1,
    "incident_type": "fire",
    "severity": "critical",
    "status": "active",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "message": "Crisis reported successfully. Emergency services have been notified."
}
```

#### GET `/crisis/active`
Get all active incidents.

**Query Parameters:**
- `propertyId` (optional): Filter by property
- `type` (optional): Filter by incident type

**Response:**
```json
{
  "success": true,
  "count": 2,
  "incidents": [
    {
      "id": 1,
      "incident_type": "fire",
      "severity": "critical",
      "status": "active",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "description": "Kitchen fire",
      "reported_by_name": "John Smith",
      "zone_name": "Kitchen"
    }
  ]
}
```

#### GET `/crisis/:id`
Get specific incident details.

#### GET `/crisis/:id/full`
Get incident with all related data (check-ins, tasks, notifications).

#### PATCH `/crisis/:id/status`
Update incident status.

**Request:**
```json
{
  "status": "contained"
}
```

**Status options:** `active`, `contained`, `resolved`, `false_alarm`

#### POST `/crisis/:id/resolve`
Mark incident as resolved.

---

### Location Tracking

#### GET `/locations/zones/:propertyId`
Get all zones for a property.

**Response:**
```json
{
  "success": true,
  "count": 5,
  "zones": [
    {
      "id": 1,
      "name": "Lobby",
      "zone_type": "common_area",
      "floor_number": 1,
      "capacity": 200,
      "current_occupancy": 45
    }
  ]
}
```

#### GET `/locations/occupancy/:propertyId`
Get occupancy statistics.

**Response:**
```json
{
  "success": true,
  "byType": [
    { "zone_type": "room", "total_occupancy": 80, "total_capacity": 100 }
  ],
  "total": {
    "total": 145,
    "capacity": 500
  }
}
```

#### GET `/locations/active-users/:propertyId`
Get current locations of all active users.

**Response:**
```json
{
  "success": true,
  "count": 45,
  "locations": [
    {
      "user_id": 1,
      "name": "John Smith",
      "role": "staff",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "zone_name": "Lobby",
      "recorded_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### Dashboard

#### GET `/dashboard/overview/:propertyId`
Get dashboard overview statistics.

**Response:**
```json
{
  "success": true,
  "overview": {
    "incidents": {
      "active_incidents": 2,
      "critical_count": 1,
      "high_count": 1
    },
    "users": {
      "active_users": 145,
      "evacuated_users": 20
    },
    "currentOccupancy": 145
  }
}
```

#### GET `/dashboard/triage/:propertyId`
Get triage counter data.

**Response:**
```json
{
  "success": true,
  "triage": {
    "safe_count": 85,
    "distressed_count": 10,
    "needs_help_count": 5,
    "missing_count": 20,
    "unchecked": 25
  }
}
```

#### GET `/dashboard/stats/:propertyId`
Get incident statistics.

**Query Parameters:**
- `period`: `24h`, `7d`, `30d` (default: 24h)

**Response:**
```json
{
  "success": true,
  "period": "24h",
  "stats": {
    "summary": [
      { "incident_type": "fire", "count": 2 }
    ],
    "avgResponseTime": 180
  }
}
```

---

### Notifications

#### POST `/notifications/mass`
Send mass notification (admin/security only).

**Request:**
```json
{
  "propertyId": 1,
  "message": "Evacuate building immediately via nearest exit",
  "channels": ["push", "sms"],
  "zones": [1, 2, 3]
}
```

**Channels:** `push`, `sms`, `email`, `websocket`

#### GET `/notifications/history/:propertyId`
Get notification history.

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## Rate Limiting

Crisis endpoints are rate limited:
- Crisis reporting: 10 requests per minute
- Panic button: 5 requests per minute
- General endpoints: 100 requests per 15 minutes

## WebSocket Connection

Connect to Socket.io at:
```
ws://localhost:3000
```

Authenticate by passing token in auth:
```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'your_jwt_token' }
});
```
