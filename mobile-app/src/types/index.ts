export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  status: string;
  department?: string;
  property_id?: string;
  room_number?: string;
  [key: string]: any;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, password: string, propertyId?: number) => Promise<{ success: boolean; error?: string; requiresContextSelection?: boolean; contexts?: any[] }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: string;
}

export interface LocationContextType {
  location: LocationData | null;
  errorMsg: string | null;
  tracking: boolean;
  getCurrentLocation: () => Promise<{ success: boolean; coords?: { latitude: number; longitude: number }; error?: string }>;
}

export interface SocketContextType {
  socket: any | null; // using any for socket to avoid generic socket.io types import issues for now
  connected: boolean;
  alarmActive: boolean;
  alarmTitle: string;
  alarmMessage: string;
  silenceAlarm: () => void;
}

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Panic: undefined;
  EmergencyContacts: undefined;
  SafetyGuide: undefined;
  IncidentDetails: { incidentId: number };
  Navigation: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Status: undefined;
  Triage: undefined;
  Map: undefined;
  Profile: undefined;
  Alerts: undefined;
  Chat: undefined;
};
