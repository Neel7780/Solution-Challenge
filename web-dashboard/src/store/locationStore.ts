import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ─── Types ───

export interface LocationEntry {
  userId: number;
  name: string;
  role: string;
  status: string;
  latitude: number;
  longitude: number;
  prevLatitude?: number;
  prevLongitude?: number;
  recordedAt: string;
  zoneName?: string;
  zoneId?: number;
  roomNumber?: string;
  beaconId?: string;
}

export interface NavStatus {
  name: string;
  status: string;          // 'safe' | 'reached_exit' | 'distressed' | 'trapped' | 'needs_help' | 'evacuating'
  currentWaypoint?: string;
  targetExit?: string;
  timestamp: string;
}

interface LocationState {
  // Core data
  locations: Map<number, LocationEntry>;
  navStatuses: Map<string, NavStatus>;
  lastFetchTime: number;
  isSocketDriven: boolean;

  // Computed getters (as actions)
  getAll: () => LocationEntry[];
  getPersonnel: () => LocationEntry[];
  getGuests: () => LocationEntry[];
  getByRole: (role: string) => LocationEntry[];
  getNavStatus: (userId: number | string) => NavStatus | undefined;
  getTrackedCount: () => number;
  getAlertCount: () => number;
  getSafeCount: () => number;

  // Mutations
  updateLocation: (data: {
    userId: number;
    latitude: number;
    longitude: number;
    beaconId?: string;
    zoneId?: number;
    timestamp?: string;
    name?: string;
    role?: string;
    status?: string;
  }) => void;

  updateNavStatus: (data: {
    userId: number | string;
    name: string;
    status: string;
    currentWaypoint?: string;
    targetExit?: string;
    timestamp: string;
  }) => void;

  // Bulk load from REST API
  loadFromAPI: (propertyId: number) => Promise<void>;

  // Set full batch (from REST polling)
  setBatch: (users: any[]) => void;

  // Clear
  clear: () => void;
}

// ─── Store ───

export const useLocationStore = create<LocationState>((set, get) => ({
  locations: new Map(),
  navStatuses: new Map(),
  lastFetchTime: 0,
  isSocketDriven: false,

  // ─── Computed Getters ───

  getAll: () => {
    return Array.from(get().locations.values());
  },

  getPersonnel: () => {
    return Array.from(get().locations.values()).filter(
      (l) => l.role !== 'guest'
    );
  },

  getGuests: () => {
    return Array.from(get().locations.values()).filter(
      (l) => l.role === 'guest'
    );
  },

  getByRole: (role: string) => {
    return Array.from(get().locations.values()).filter(
      (l) => l.role === role
    );
  },

  getNavStatus: (userId: number | string) => {
    return get().navStatuses.get(String(userId));
  },

  getTrackedCount: () => {
    return get().locations.size;
  },

  getAlertCount: () => {
    const navStatuses = get().navStatuses;
    let count = 0;
    navStatuses.forEach((ns) => {
      if (['trapped', 'distressed', 'needs_help'].includes(ns.status)) {
        count++;
      }
    });
    return count;
  },

  getSafeCount: () => {
    const navStatuses = get().navStatuses;
    let count = 0;
    navStatuses.forEach((ns) => {
      if (['safe', 'reached_exit'].includes(ns.status)) {
        count++;
      }
    });
    return count;
  },

  // ─── Mutations ───

  updateLocation: (data) => {
    set((state) => {
      const newMap = new Map(state.locations);
      const existing = newMap.get(data.userId);

      const entry: LocationEntry = {
        userId: data.userId,
        name: data.name || existing?.name || `Occupant #${data.userId}`,
        role: data.role || existing?.role || 'guest',
        status: data.status || existing?.status || 'active',
        latitude: data.latitude,
        longitude: data.longitude,
        // Store previous position for smooth animation
        prevLatitude: existing?.latitude,
        prevLongitude: existing?.longitude,
        recordedAt: data.timestamp || new Date().toISOString(),
        zoneName: existing?.zoneName,
        zoneId: data.zoneId || existing?.zoneId,
        roomNumber: existing?.roomNumber,
        beaconId: data.beaconId || existing?.beaconId,
      };

      newMap.set(data.userId, entry);
      return { locations: newMap, isSocketDriven: true };
    });
  },

  updateNavStatus: (data) => {
    set((state) => {
      const newMap = new Map(state.navStatuses);
      newMap.set(String(data.userId), {
        name: data.name,
        status: data.status,
        currentWaypoint: data.currentWaypoint,
        targetExit: data.targetExit,
        timestamp: data.timestamp,
      });
      return { navStatuses: newMap };
    });
  },

  // ─── Bulk Load from REST API ───

  loadFromAPI: async (propertyId: number) => {
    try {
      const res = await axios.get(`${API_URL}/locations/active-users/${propertyId}`);
      const users = res.data.locations || res.data.users || [];
      get().setBatch(users);
      set({ lastFetchTime: Date.now() });
    } catch (err) {
      console.error('[LocationStore] Failed to fetch active locations:', err);
    }
  },

  setBatch: (users: any[]) => {
    set((state) => {
      const newMap = new Map(state.locations);

      for (const user of users) {
        const userId = Number(user.user_id || user.id);
        if (!userId || isNaN(userId)) continue;

        const existing = newMap.get(userId);
        const lat = Number(user.latitude);
        const lng = Number(user.longitude);

        if (isNaN(lat) || isNaN(lng)) continue;

        newMap.set(userId, {
          userId,
          name: user.name || existing?.name || `Occupant #${userId}`,
          role: user.role || existing?.role || 'guest',
          status: user.user_status || user.status || existing?.status || 'active',
          latitude: lat,
          longitude: lng,
          prevLatitude: existing?.latitude,
          prevLongitude: existing?.longitude,
          recordedAt: user.recorded_at || new Date().toISOString(),
          zoneName: user.zone_name || existing?.zoneName,
          zoneId: user.zone_id || existing?.zoneId,
          roomNumber: user.room_number || existing?.roomNumber,
          beaconId: user.beacon_id || existing?.beaconId,
        });
      }

      return { locations: newMap, lastFetchTime: Date.now() };
    });
  },

  clear: () => {
    set({
      locations: new Map(),
      navStatuses: new Map(),
      lastFetchTime: 0,
      isSocketDriven: false,
    });
  },
}));
