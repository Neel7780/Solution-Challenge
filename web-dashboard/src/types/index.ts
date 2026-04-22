export interface User {
  id: number;
  name: string;
  email: string;
  role: 'guest' | 'staff' | 'security' | 'admin' | 'responder';
  property_id: number;
  room_number?: string;
}

export interface Incident {
  id: number;
  incident_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'resolving' | 'resolved';
  created_at: string;
  description: string;
  reported_by_name: string;
  zone_name: string;
  latitude?: number;
  longitude?: number;
}

export interface OverviewData {
  property?: {
    id: number;
    name?: string;
    status?: 'operational' | 'evacuating' | 'closed' | string;
    updated_at?: string;
  };
  incidents?: {
    active_incidents: number;
    critical_count: number;
  };
  currentOccupancy?: number;
}

export interface TriageData {
  safe_count: number;
  distressed_count: number;
  needs_help_count: number;
  missing_count: number;
  unchecked: number;
}

export interface Zone {
  id: number;
  name: string;
  property_id: number;
  occupancy_count: number;
  capacity: number;
}

export interface LocationUpdate {
  userId: number;
  latitude: number;
  longitude: number;
  beaconId?: string;
  zoneId?: number;
  timestamp: string;
}
