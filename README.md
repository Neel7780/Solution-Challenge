# CrisisRespond: Enterprise Crisis Management Platform

A high-performance, multi-tenant crisis management ecosystem designed for global organizations (hotel chains, mall networks, hospital systems). CrisisRespond synchronizes real-time data across mobile and web platforms to eliminate information silos during high-stakes emergencies.

**🔗 Project Links:**
- **GitHub Repository**: [Neel7780/Solution-Challenge](https://github.com/Neel7780/Solution-Challenge)
- **Working Prototype**: [solution-challenge-nu.vercel.app](https://solution-challenge-nu.vercel.app/)

## 🚀 Enterprise Multi-Tenant Architecture

CrisisRespond has transitioned from a single-property application to a robust enterprise platform:
- **Hierarchical Scoping**: `Organizations` → `Properties` → `Zones`.
- **Global Super Admin**: Platform-wide oversight and organization onboarding.
- **Organization Admin**: Manage multiple properties, personnel, and analytics within a single organization.
- **Automatic Data Isolation**: Every database query is automatically scoped by the `queryWithContext` helper, preventing cross-tenant data leaks.

## 🏗 System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Mobile App     │    │  Web Dashboard  │    │  Godot Sim      │
│  (React Native) │    │  (React/MUI)    │    │  (Visualizer)   │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                        │                        │
         │         ┌──────────────┴────────────────────────┘
         │         │
         │    ┌────┴────┐      Query Safety Layer
         │    │         │      (Auto-Scoping)
         └────┤ Node.js ├───────────┐
              │ Express │           │
              │   API   │           ▼
              └────┬────┘    ┌───────────┐
                   │         │ PostgreSQL│
              ┌────┴────┐    │ + PostGIS │
              │  Neon   │    └───────────┘
              │ Database│
              └─────────┘
```

## 🛠 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ with PostGIS extension (Neon recommended)
- Expo development environment (for mobile)

### 1. Database Setup
The database schema is expected to already exist in your PostgreSQL instance. If you are recreating the database from scratch, apply the schema manually before starting the backend.

### 2. Backend Setup
For detailed setup instructions, PostGIS database details, WebSocket channels, and Gemini AI integration pipelines, see the [Backend README](file:///home/godllike/Documents/Soln-Challenge/backend/README.md).
```bash
cd backend
npm install
npm run dev
```

### 3. Web Dashboard Setup
For detailed UI architecture, pages description, theme controls, and Zustand state stores, see the [Web Dashboard README](file:///home/godllike/Documents/Soln-Challenge/web-dashboard/README.md).
```bash
cd web-dashboard
npm install
npm run dev
```

## 🔐 Role Hierarchy & Access

| Role | Scope | Key Capability |
| :--- | :--- | :--- |
| **Super Admin** | Global | Onboard organizations, platform monitoring |
| **Org Admin** | Organization | Manage all properties, analytics, global staff |
| **Property Admin**| Property | Local incident command, property settings |
| **Security/Staff**| Property | Incident response, triage tracking |
| **Guest** | Individual | SOS panic button, safety check-ins |

## 📡 API Endpoints (Enterprise)

### Platform Onboarding (Super Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/platform/request-access` | Public: Apply for platform access |
| GET | `/api/platform/requests` | Admin: View onboarding queue |
| PATCH | `/api/platform/requests/:id` | Admin: Approve/Reject request |

### Enterprise Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/login` | Login with context selection support |
| POST | `/api/users/switch-context` | Switch between authorized properties |
| GET | `/api/users/me` | Get profile with org/property context |

### Crisis & Location (Scoped)
All endpoints below are **automatically filtered** by the active `property_id` in your JWT.
- `/api/crisis/active` - Active incidents in your current property.
- `/api/locations/active-users` - Live tracking for your current property.
- `/api/dashboard/triage` - Real-time safety counters.

## 🌟 Key Enterprise Features

- **Automated CCTV AI Verification**: Integrates Google Gemini Vision to autonomously analyze security camera snapshots in reported zones, actively confirming threats (fire/smoke/intruders) and filtering out false alarms before triggering a mass panic.
- **Multi-Agent Emergency Council**: A Groq-powered AI pipeline (Llama-3.3-70b & Mixtral-8x7b) splitting crisis logic into dedicated agents (Spatial, Synthesizer, and Task Prioritizer) to autonomously generate verdicts and dispatch security staff in milliseconds.
- **Adaptive AI Voice Evacuation**: Calculates a dynamic Dijkstra shortest-path across the 3D Mappedin environment to route guests away from physical hazards, feeding the vectors into Google Gemini 3.5 Flash to generate near-instant, calm voice navigation instructions.
- **Haptic Mobile Alarms & SOS Triage**: Bypasses passive text messages by triggering native mobile sirens and vibrations during critical calamities. Pressing the SOS button instantly drops the user onto the admin's tactical map in a "Distressed" state.
- **Proximity-Based Alerting (PostGIS)**: Uses spatial geometry to identify and notify only users within a specific "danger radius" (e.g., 200m) of an incident, preventing platform-wide notification fatigue.
- **Spatial Digital Twin & Shadow Mode**: A bi-directional Godot engine simulation syncing live occupant coordinates. Admins can run "What-If" crisis simulations alongside real operations to identify architectural bottlenecks.
- **Enterprise 3D Indoor Wayfinding**: Integrates Mappedin’s SDK to replace flat 2D maps with fully interactive, vector-based 3D models of the property for a unified, high-performance spatial view.
- **Public Crisis Reporting Pipeline**: A secure portal for non-registered visitors to report incidents, placing them in a verification queue validated by AI or security.
- **Architectural Data Isolation (QueryWithContext)**: An enterprise-grade security layer that intercepts SQL queries to inject mandatory `organization_id` and `property_id` filters, ensuring strict multi-tenant data privacy on shared servers.
- **Automated Onboarding**: Super Admin approves organization requests, which auto-provisions org records, main properties, and admin accounts.
- **Context-Aware UI**: The Web Dashboard and Mobile App dynamically adapt their menus and data based on the user's role and selected property.
- **Organization-Wide Sockets**: Real-time alerts can be broadcast to a specific property (`property_[id]`) or an entire organization (`organization_[id]`).

## 🤖 Google Technologies & Services Used

CrisisRespond is deeply integrated with Google's ecosystem to provide high-performance, intelligence-driven emergency orchestration:

1. **Google AI Studio & Gemini API (`@google/generative-ai`)**:
   - **Gemini 3.5 Flash (Voice Evacuation Routing)**: Feeds raw Dijkstra pathfinding vectors (avoiding active physical hazards) into a highly restricted Gemini 3.5 Flash model (0.2 temperature, 100 max tokens) to generate near-instant, calm voice navigation instructions dynamically.
   - **Gemini Vision (Automated CCTV Verification)**: When an incident is reported, the system pipes base64 security camera snapshots into Gemini Vision. The model autonomously confirms real threats (smoke/intruders) and filters out false alarms, updating the database automatically.
   - **Gemini 2.0 Flash (Incident Intelligence)**: Used in the backend pipeline to instantly enrich emergency telemetry data—calculating severity scores, estimating potential casualties, and identifying architectural bottlenecks during live simulations.
2. **Google Material Design (via Material UI)**: The entire Web Dashboard architecture is built using Google’s Material Design principles. We heavily utilized MUI components (DataGrids, thematic buttons, navigation drawers, and typography) to ensure the interface remains clean, accessible, and highly legible during high-stress emergency situations.
3. **Android Native Architecture (via Expo/React Native)**: Our mobile field application leverages core Android OS integrations. During a critical calamity, the app hooks into the Android hardware layer to bypass silent modes, triggering native haptic vibrations and siren audio loops to seize the user's immediate physical attention.
4. **Google Fonts**: Integrated fonts (such as Inter and Roboto) to guarantee high legibility and a premium aesthetic across both mobile and web platforms.

## 🆕 Recent Session Upgrades

- **Crisis Task Auto-Assignment & Management Console**: Integrated automated task assignment during simulated/manual emergencies to active responders (security/staff/responders) with automatic `assigned_by_ai = true` flags in the DB. Created `/api/tasks` REST endpoints with tenant-scoped CRUD operations, an interactive **Tasks Management Tab** on the Org Admin dashboard for task assignments and edits, and a global read-only **All Assigned Tasks** tab on the Super Admin console.
- **Incident History & Retention**: Added a dedicated "Incident History" tab to the Incident Management page so that contained or resolved incidents remain accessible and filterable. The backend `/api/crisis/active` route was updated to support a dynamic `status` query parameter (`active`, `history`, `all`) to query non-active incidents.
- **Super Admin & Org Admin Notification Context**: Resolved a critical context scoping issue where Super Admins and Org Admins had no property notifications/real-time alerts due to null `property_id` fields in database profiles. We now automatically populate user contexts list (all properties for Super Admin, organization properties for Org Admin) on login, override active context on `/api/users/me`, and include `role_org_admin` and `role_super_admin` in critical socket broadcast targets to ensure all administrator roles receive real-time crisis alerts.
- **Floor Plan Image Layouts**: Updated rotated global GIS map overlays and isolated CAD schematic mode image overlays to reference `.png` extensions to match the actual high-resolution files `floor1.png` and `floor2.png` located inside `/assets/maps`.
- **Dual-View GIS & Schematic Mode**: Integrated a dynamic view switcher to toggle between **Global GIS Mode** (Georeferenced floor plan overlays aligned with CartoDB Voyager basemap) and **Isolated Schematic Mode** (Flat 1-to-1 coordinate layout with L.CRS.Simple for CAD-focused tracking), featuring key-based MapContainer remounting and automatic viewport fitting.
- **Georeferenced Map Sync (GIS / Godot)**: Establishes a mathematical coordinate translation bridge (`godotToLatLng`) with real-world anchor GPS points, rotation, and scaling. It renders rotated, high-resolution indoor floor plans onto the CartoDB Voyager basemap via a custom `RotatedImageOverlay` React component, aligning simulated occupants and fire incidents with city streets in real-time.
- **Toggleable Dark Mode**: Added a toggleable dark mode (sun/moon switch) on the dashboard header bar, using a Zustand `themeStore` with localStorage persistence, CSS-in-JS MUI theme wrappers, and custom CSS variables.
- **Landing Page Navigation**: Added a "Back to Home Page" option to the login page for improved user flow navigation.

## 🛡 Security & Compliance

- **Data Isolation**: Physical-layer logic ensuring one organization's data is never visible to another.
- **JWT Context**: Tokens are context-specific, requiring a secure refresh to switch properties.
- **Rate Limiting**: Protection on all public reporting endpoints to prevent spam.
- **SQL Protection**: Forced parameterization and context injection.

## 🔮 Future Development

We are continuously evolving CrisisRespond to be the ultimate safety ecosystem. Our roadmap includes:

- **CAD-Driven Navigation**: Integration with original property CAD designs to generate dynamic, optimized exit paths for guests, significantly reducing evacuation times.
- **AI-Enhanced Surveillance**: Real-time synchronization with live CCTV footage, utilizing AI for automated monitoring, incident detection, and visual verification.
- **Multi-Hazard Crisis Management**: Expanding crisis control beyond fire to include comprehensive scenarios such as medical emergencies, security breaches, and natural disasters.
- **Automated Compliance & Reporting**: Automated post-incident report generation and compliance exports to meet regulatory and insurance requirements seamlessly.
- **Hyper-Realistic Simulations**: Enhanced simulation fidelity with support for simultaneous multi-hazard scenarios and complex environmental interactions.
- **Predictive Risk Analytics**: Advanced heatmaps and intelligent resource allocation recommendations powered by historical data and predictive modeling.
- **Inclusive Emergency Guidance**: Multilingual emergency instructions and guidance tailored for diverse occupants to ensure no one is left behind.
- **Resilient Offline Operations**: Offline-first support to maintain mission-critical functionality in low-connectivity or compromised network environments.
- **Deep Ecosystem Integration**: Pilot integrations with Building Management Systems (BMS) and direct communication protocols with emergency response agencies.

## 👥 Development Team

### 👥 Team Details
- **Team Name**: Quadruple
- **Team Leader**: Vedant Shah
- **Problem Statement**: [Rapid Crisis Response] Accelerated Emergency Response and Crisis Coordination in Hospitality

### 🛠 Tech Stack Details
- **Backend**: Node.js, Express.js, TypeScript, and Socket.io (for low-latency, bidirectional real-time telemetry)
- **Frontend (Web Dashboard)**: React (Vite), TypeScript, Material UI (MUI), Zustand (State Management), GSAP (Micro-animations), React Leaflet, and Mappedin 3D SDK
- **Frontend (Mobile App)**: React Native, Expo, React Navigation, Expo Speech & Audio (for voice navigation and siren alarms), React Native Maps, and Mappedin 3D SDK
- **Database**: PostgreSQL with PostGIS spatial extensions (for geolocation filtering and boundary checking)
- **AI Engine & Models**:
  - **Google Gemini 3.5 Flash**: For generating near-instant, adaptive voice evacuation instructions
  - **Google Gemini Vision**: For autonomous CCTV snapshot analysis to verify fire/intruder threats
  - **Google Gemini 2.0 Flash**: For incident intelligence and simulation telemetry enrichment
  - **Groq API (Llama-3.3-70b & Mixtral-8x7b)**: Powering the Multi-Agent Emergency Council (Spatial, Synthesizer, and Prioritizer agents)
- **Simulation/Digital Twin**: Godot Engine 4 (compiled to HTML5/WebAssembly via JavaScriptBridge) for scenario modeling and telemetry generation
- **DevOps/Deployment**: Render (Node.js Backend & PostgreSQL Database hosting) and Vercel (Frontend Web application hosting)

---
© 2025 CrisisRespond. Enterprise-Grade Emergency Coordination.
