# Crisis Response System

A decentralized crisis management ecosystem for hospitality venues that synchronizes real-time data across multiple platforms to eliminate information silos during high-stakes emergencies (fire, medical, security threats).

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Mobile App     │    │  Web Dashboard  │    │  Godot Sim      │
│  (React Native) │    │  (React/MUI)    │    │  (Visualizer)   │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                        │                        │
         │         ┌──────────────┴────────────────────────┘
         │         │
         │    ┌────┴────┐
         │    │         │
         └────┤ Node.js │
              │ Express │
              │   API   │
              └────┬────┘
                   │
              ┌────┴────┐
              │PostgreSQL│
              │+ PostGIS │
              └─────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ with PostGIS extension
- React Native development environment (for mobile)

### 1. Database Setup

```bash
# Create database
createdb crisis_response

# Enable PostGIS
psql crisis_response -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Run schema
psql crisis_response -f database/schema.sql
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials

npm install
npm run dev
```

### 3. Mobile App Setup

```bash
cd mobile-app

# Update API_URL in src/context/AuthContext.js
# Replace YOUR_SERVER_IP with your computer's IP

npm install
npx expo start
```

### 4. Web Dashboard Setup

```bash
cd web-dashboard

# Create .env file
echo "REACT_APP_API_URL=http://localhost:3000/api" > .env
echo "REACT_APP_SOCKET_URL=http://localhost:3000" >> .env

npm install
npm start
```

## Project Structure

```
crisis-response/
├── backend/              # Node.js Express API
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── routes/       # API route definitions
│   │   ├── database/     # Database connection & schema
│   │   ├── middleware/   # Auth, validation
│   │   └── utils/        # Logger, helpers
│   └── package.json
│
├── mobile-app/           # React Native (Expo)
│   ├── src/
│   │   ├── screens/      # UI screens
│   │   ├── context/      # Auth, Socket, Location contexts
│   │   └── navigation/   # Tab navigator
│   └── package.json
│
├── web-dashboard/        # React Admin Dashboard
│   ├── src/
│   │   ├── pages/        # Dashboard pages
│   │   ├── components/   # Layout, shared components
│   │   └── store/        # Zustand state management
│   └── package.json
│
├── godot-simulation/     # Godot Engine visualizer
│   └── (placeholder for your team)
│
└── database/             # SQL schemas
    └── schema.sql
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/login` | User login |
| POST | `/api/users/register` | Register new user |
| GET | `/api/users/me` | Get current user |

### Crisis Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/crisis/report` | Report a crisis |
| GET | `/api/crisis/active` | Get active incidents |
| GET | `/api/crisis/:id` | Get incident details |
| PATCH | `/api/crisis/:id/status` | Update incident status |
| POST | `/api/crisis/:id/resolve` | Resolve incident |

### Location Tracking
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/locations/zones/:propertyId` | Get all zones |
| GET | `/api/locations/occupancy/:propertyId` | Get occupancy stats |
| GET | `/api/locations/active-users/:propertyId` | Get active user locations |
| POST | `/api/users/location` | Update user location |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/overview/:propertyId` | Get overview stats |
| GET | `/api/dashboard/triage/:propertyId` | Get triage data |
| GET | `/api/dashboard/stats/:propertyId` | Get incident stats |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/notifications/mass` | Send mass notification |
| GET | `/api/notifications/history/:propertyId` | Get notification history |

### User Actions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/panic` | Trigger panic alert |
| POST | `/api/users/checkin` | Check-in (I'm Safe) |

## WebSocket Events

### Client → Server
- `join_property` - Subscribe to property updates
- `join_role` - Subscribe to role-based updates
- `location_update` - Send location update

### Server → Client
- `crisis_reported` - New crisis alert
- `panic_triggered` - Panic button pressed
- `user_checkin` - User checked in
- `mass_notification` - Mass notification sent
- `user_location_update` - Location update received
- `incident_status_update` - Incident status changed

## Key Features

### Mobile App
- One-tap panic button with countdown
- Real-time check-in (I'm Safe / Needs Help)
- Location tracking with beacon support
- Push notifications for emergencies
- Offline mode support

### Web Dashboard
- Real-time triage counter
- Incident management
- Zone occupancy tracking
- User location visualization
- Mass notification sending
- Settings & configuration

### Backend
- RESTful API
- WebSocket real-time updates
- PostGIS spatial queries
- JWT authentication
- Twilio SMS integration
- Rate limiting for crisis endpoints

## Environment Variables

### Backend (.env)
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crisis_response
DB_USER=postgres
DB_PASSWORD=your_password
PORT=3000
JWT_SECRET=your_secret_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

### Web Dashboard (.env)
```
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_SOCKET_URL=http://localhost:3000
```

## Data Flow

1. **Crisis Detection**: User triggers panic via mobile app
2. **API Processing**: Node.js receives alert, updates PostgreSQL
3. **Real-time Sync**: WebSocket broadcasts to all connected clients
4. **Visualization**: Godot sim/Godot visualization updates floor plan
5. **Response**: Staff receives notifications, triage updates in real-time

## Security Considerations

- JWT token authentication
- Rate limiting on crisis endpoints
- Helmet.js security headers
- CORS configuration
- Input validation (express-validator)
- SQL injection prevention (parameterized queries)

## Development Team

- **Backend**: Node.js/Express with PostgreSQL
- **Mobile**: React Native (Expo)
- **Web Dashboard**: React + Material-UI
- **Visualization**: Godot Engine (handled by your team)

## License

MIT
