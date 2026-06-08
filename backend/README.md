# CrisisRespond: Express API & Real-Time Intelligence Backend

This is the backend service for **CrisisRespond**—an enterprise crisis coordination and multi-tenant emergency dispatch system. The service is written in Node.js, Express, and TypeScript, utilizing a **PostgreSQL** database with **PostGIS** spatial extensions, **Socket.io** for real-time bi-directional streams, and **Google Gemini API** for automated crisis analytics.

---

## 🏗 Backend Architecture

```
                       ┌──────────────────────┐
                       │   Socket.io Engine   │
                       └──────────┬───────────┘
                                  │ (Real-Time Streams)
┌────────────────┐     ┌──────────▼───────────┐     ┌────────────────┐
│  REST API      ├────►│  Express Router      │◄────┤ Gemini API     │
│  (Controllers) │     └──────────┬───────────┘     │ (Intelligence) │
└────────────────┘                │                 └────────────────┘
                                  │ (SQL Queries / PostGIS)
                       ┌──────────▼───────────┐
                       │  PostgreSQL Database │
                       └──────────────────────┘
```

---

## 📡 WebSockets & Event Namespaces

Real-time streaming is scoped by organization, property, and user roles to ensure tight multi-tenant data isolation:
- **`property_[id]`**: Rooms dedicated to a specific physical building. Receives live fire positions, check-in updates, and evacuation notices.
- **`user_[id]`**: Direct channel targeting a specific responder or guest (e.g. dynamic task dispatch).
- **`role_admin`, `role_security`, `role_responder`, `role_org_admin`, `role_super_admin`**: Global channels for personnel and platform command/administration roles to synchronize tactical maps and receive real-time crisis alerts.

### Core WebSocket Triggers
1. **`simulation:fire_crisis`**: Fired when a fire is placed in the simulator. The server creates a critical incident database record, sets the property status to `'evacuating'`, auto-assigns responder duties, and broadcasts a mass alert.
2. **`simulation:telemetry`**: A periodic heartbeat containing simulated agent details. The server maps agent coordinates back to active database users, translates them to Latitude/Longitude, and records the tracks in the PostGIS spatial table (`location_tracking`).
3. **`simulation:request_analysis`**: Triggers the AI pipeline to analyze simulation state snapshot metrics, returning casualty risk, structural bottlenecks, and evacuation planning guidelines.

---

## 📡 API Endpoints

### Emergency Tasks API (`/api/tasks`)
All task endpoints are fully protected, role-scoped, and audit-logged:
- **`GET /api/tasks`**: Retrieve active tasks. Scoped automatically by organization (for Org Admins) or property (for local admins/personnel). Super Admins see all tasks.
- **`POST /api/tasks`**: Create a new emergency task. Assigns priorities (`urgent`, `high`, `medium`, `low`) and tasks description.
- **`PATCH /api/tasks/:id`**: Update task state (`pending`, `in_progress`, `completed`, `cancelled`) or modify task description, priority, and assignees.
- **`DELETE /api/tasks/:id`**: Delete tasks from the system (restricted to authorized roles).

---

## 🤖 Gemini AI Intelligence Pipelines

The backend utilizes **Google Gemini** to act as a digital emergency management assistant:
1. **Critical Incident Enrichment (`intelligenceService.ts`)**:
   - Takes a newly reported incident and combines it with the property's floor plan design metadata.
   - Automatically generates a detailed **Responder Action Plan** and a clear **Mass Alert Message** optimized for guests.
2. **Simulation Safety Analysis (`simulationAnalysisService.ts`)**:
   - Compares current fire spreads against agent health states and exit points.
   - Computes structural risks, predicts potential bottlenecks (e.g., stairs, exits), estimates casualties, and gives strategic emergency advice.

---

## 🗄 Database Design & Security Scoping

We leverage PostgreSQL + PostGIS to perform spatial queries (e.g. check-ins, distance calculations, boundary intersections):
- **PostGIS Point Mapping**: Coordinates are logged using `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)`, permitting geographical calculations.
- **Hierarchical Layout**:
  - `Organizations`: Top-level clients (e.g., hotel groups).
  - `Properties`: Scoped locations (e.g., specific hotels).
  - `Zones`: Physical rooms, stairwells, and assembly areas.
  - `Users`: Guests and emergency responders.
  - `Location Tracking`: Live coordinates history.
  - `Incidents` & `Tasks`: Active crisis logs and task lists.
- **Data Isolation**: Database queries use the **`queryWithContext`** utility. This checks the user's role and JWT context to automatically apply `WHERE property_id = $1` filters to prevent cross-tenant leakage.

---

## 🛠 Directory Layout

```
backend/
├── dist/                   # Compiled Javascript files
├── src/
│   ├── controllers/        # Route logic handlers (auth, locations, etc.)
│   ├── database/           # Pool configuration and postgis helpers
│   ├── middleware/         # Auth verification and security layers
│   ├── routes/             # API route endpoint definitions
│   ├── services/           # Gemini LLM and enrichments integrations
│   ├── types/              # Typescript interface maps
│   ├── utils/              # Loggers and helper scripts
│   └── server.ts           # WebSocket initialization and socket events
├── package.json
└── tsconfig.json
```

---

## ⚡ Setup & Commands

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment `.env`
Create a `.env` file in the root of `/backend`:
```env
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=your-database-name
DB_USER=your-database-user
DB_PASSWORD=your-database-password

PORT=3001
NODE_ENV=development
JWT_SECRET=your-secure-jwt-key
GEMINI_API_KEY=your-google-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
SIMULATION_MODE=true
WS_CORS_ORIGIN=*
LOG_LEVEL=info
```

### 3. Run Server (Development Mode)
```bash
npm run dev
```

### 4. Build and Start (Production Mode)
```bash
npm run build
npm start
```
The backend API server will run at [http://localhost:3001](http://localhost:3001).
