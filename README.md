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
```bash
cd backend
npm install
npm run db:seed  # Creates Super Admin: admin@crisisrespond.com / admin123
npm run dev
```

### 3. Web Dashboard Setup
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

- **Automated Onboarding**: Super Admin approves organization requests, which auto-provisions org records, main properties, and admin accounts.
- **Context-Aware UI**: The Web Dashboard and Mobile App dynamically adapt their menus and data based on the user's role and selected property.
- **QueryWithContext**: A critical backend safety layer that intercepts SQL queries to inject mandatory `organization_id` and `property_id` filters.
- **Organization-Wide Sockets**: Real-time alerts can be broadcast to a specific property (`property_[id]`) or an entire organization (`organization_[id]`).

## 🛡 Security & Compliance

- **Data Isolation**: Physical-layer logic ensuring one organization's data is never visible to another.
- **JWT Context**: Tokens are context-specific, requiring a secure refresh to switch properties.
- **Rate Limiting**: Protection on all public reporting endpoints to prevent spam.
- **SQL Protection**: Forced parameterization and context injection.

## 👥 Development Team

- **Backend**: Node.js/Express with PostgreSQL & PostGIS
- **Mobile**: React Native (Expo)
- **Web Dashboard**: React + Material-UI + Zustand + GSAP
- **Visualization**: Godot Engine

---
© 2025 CrisisRespond. Enterprise-Grade Emergency Coordination.
