# CrisisRespond: Enterprise Crisis Management Platform

A high-performance, multi-tenant crisis management ecosystem designed for global organizations (hotel chains, mall networks, hospital systems). CrisisRespond synchronizes real-time data across mobile and web platforms to eliminate information silos during high-stakes emergencies.

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

- **Gemini Intelligence Integration**: Advanced, robust integration with Google's Gemini API for real-time crisis analysis and simulation predictions, featuring built-in auto-retry logic for enterprise reliability.
- **Automated Onboarding**: Super Admin approves organization requests, which auto-provisions org records, main properties, and admin accounts.
- **Context-Aware UI**: The Web Dashboard and Mobile App dynamically adapt their menus and data based on the user's role and selected property.
- **QueryWithContext**: A critical backend safety layer that intercepts SQL queries to inject mandatory `organization_id` and `property_id` filters.
- **Organization-Wide Sockets**: Real-time alerts can be broadcast to a specific property (`property_[id]`) or an entire organization (`organization_[id]`).

## 🆕 Recent Session Upgrades

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

- **Backend**: Node.js/Express with PostgreSQL & PostGIS
- **Mobile**: React Native (Expo)
- **Web Dashboard**: React + Material-UI + Zustand + GSAP
- **Visualization**: Godot Engine

---
© 2025 CrisisRespond. Enterprise-Grade Emergency Coordination.
