# CrisisRespond: Web Dashboard & Tactical Command Center

The **CrisisRespond Web Dashboard** is a real-time, premium analytical dashboard built using React 19, TypeScript, Material-UI (MUI), Zustand, Leaflet, and GSAP. It functions as the central command center for property administrators, organization managers, and emergency responders to visualize, orchestrate, and resolve high-stakes building emergencies.

---

## 🎨 Design System & Visual Aesthetics

The dashboard is built to mimic the look and feel of modern enterprise GIS platforms (like Esri ArcGIS/Command Centers):
- **Glassmorphism**: Glass panels (`glass-panel`) with blur filters, subtle gradients, and reactive hover effects.
- **Dynamic Theme Mode**: Complete light and dark mode styling utilizing CSS variables (`--bg-primary`, `--bg-card`, `--bg-glass`, `--border-medium`, etc.) linked to a persistent Zustand `themeStore`.
- **Micro-Animations**: Smooth, lightweight UI transitions powered by GSAP (`@gsap/react`).
- **Responsive Layout**: Fluid grids and lists optimized for desktop displays and wall-mounted command center screens.

---

## 🕹 Core Features & Modules

### 1. Live Map & Tracking GIS (`Locations.tsx`)
A hybrid visual mapping interface that supports two viewing modes dynamically toggleable via a floating control panel:
- **Global GIS Mode (Approach B)**: Georeferences Godot coordinate systems using an affine transformation matrix (`godotToLatLng`). WARPs and rotates floor plans onto a high-performance `CartoDB Voyager` street basemap using `leaflet-imageoverlay-rotated`. Aligning real-time occupants and fire markers with city street layouts.
- **Isolated Schematic Mode (Approach A)**: Unmounts standard basemaps to use a flat grid coordinate system (`L.CRS.Simple`). It stretches the active level floor plan tightly from `[[0, 0], [godotMaxY, godotMaxX]]` (800x600 grid pixels) for CAD-like precision and maps incoming coordinates 1-to-1.
- **Tactical Layer Selector**: Toggle visibility of **Alert Zones (Fires)**, **Staff Tracking**, **Assembly Areas**, and **Evacuation Paths**.
- **Level Focus Toggle**: Swaps map overlays instantly (Level L1, L2, L3) and filters markers accordingly.

### 2. Interactive Simulator Canvas (`Simulation.tsx`)
Renders the embedded Godot WebGL simulation (`hotel_fire_simulation.html`) with absolute control:
- **Telemetry Heartbeat**: Emits occupant counts, health statistics, and positions via WebSocket channels.
- **Tool Palette**: Place fires, spawn agents, move/navigate selected personnel, or extinguish fires directly.
- **AI Analytics**: Triggers the PostGIS/Gemini analysis pipeline, returning real-time risk scores, bottleneck summaries, casualty estimates, and evacuation guidance.
- **Simulation Controls**: Adjust simulation speed multiplier (0.5x, 1x, 2x, 4x), play/pause execution, or perform hot resets.

### 3. Incident Hub (`Incidents.tsx`)
- Manage reported emergencies, fire alerts, or SOS panics.
- **Incident History Tab**: Filter and view past, contained, or resolved incidents so that completed incidents remain visible for audit and historical review.
- Broadcast mass evacuation orders or assign individual duties to responder teams.
- Review AI-enriched Action Plans and hazard descriptions.

### 4. Triage Command (`Triage.tsx`)
- Real-time census checks displaying Safe, Evacuating, Trapped, and Casualty counts.
- Dynamic list of safety checks, guest check-in statuses, and action logs.

### 5. Multi-Tenant Roles & Admin Panels
- **Platform Admin (`PlatformAdmin.tsx`)**: Super Admin overview to approve or reject organization requests, manage platform capacity, and monitor all assigned emergency tasks across properties globally via the "All Assigned Tasks" tab.
- **Organization Admin (`OrganizationAdmin.tsx`)**: Scoped to a specific hotel or mall organization. Manage properties, onboard buildings, view staff lists, and assign/edit/modify tasks on the "Tasks" panel (including tasks auto-assigned by AI/simulation).
- **Users Panel (`Users.tsx`)**: Manage local property users, credentials, roles (responder, security, staff, guest), and activation statuses.

---

## 💾 State Management Stores (`src/store/`)

We utilize **Zustand** for lightweight, centralized state management:
1. `authStore.ts`: Tracks authentication status, user role, selected tenant context, and active authorization tokens.
2. `crisisStore.ts`: Manages active incidents, tasks assigned to staff, and historical incident logs.
3. `socketStore.ts`: Coordinates the socket.io client subscription scopes, room triggers, and event handlers.
4. `simulationStore.ts`: Syncs local and remote simulation states, agent stats, active fire positions, and analytical charts.
5. `themeStore.ts`: Controls light/dark mode configuration, saving preferences to `localStorage`.
6. `notificationStore.ts`: Manages system banners and live toast alerts.

---

## 🛠 Directory Layout

```
web-dashboard/
├── public/                 # Static assets (maps, Godot WebGL compilation)
│   ├── assets/maps/        # High-res floor plan images (escapes Vite hashing)
│   └── simulation/         # hotel_fire_simulation.html/js/wasm
├── src/
│   ├── components/         # Reusable widgets (Layout, ProtectedRoute, etc.)
│   ├── pages/              # Main view screens (Locations, Simulation, etc.)
│   ├── store/              # Zustand global state stores
│   ├── theme.ts            # Material-UI custom theme engine
│   ├── index.css           # Core styling tokens, grids, and dark theme variables
│   └── main.tsx            # Application entry point
├── package.json
└── vite.config.ts          # Vite asset bundling rules and proxy definitions
```

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment `.env`
Create a `.env` file in the root of `/web-dashboard`:
```env
VITE_API_URL=http://localhost:3001/api
```

### 3. Run Development Server
```bash
npm run dev
```
The dashboard will start locally at [http://localhost:3000](http://localhost:3000).

### 4. Build Production Bundle
To compile typescript types and bundle the assets into optimized minified assets:
```bash
npm run build
```
Compiled production files will be placed inside `/dist`.
