import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useNotificationStore } from './notificationStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

interface SocketState {
  socket: Socket | null;
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
  joinProperty: (propertyId: number) => void;
  joinRole: (role: string) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  connected: false,

  connect: () => {
    const token = localStorage.getItem('token');
    const socket = io(SOCKET_URL, {
      auth: { token },
    });

    const addNotif = useNotificationStore.getState().addNotification;

    socket.on('connect', () => {
      console.log('Socket connected');
      set({ connected: true });

      // Join default rooms
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          socket.emit('join_property', user.property_id || 1);
          socket.emit('join_role', user.role || 'guest');
        } catch {
          socket.emit('join_property', 1);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      set({ connected: false });
    });

    socket.on('crisis_reported', (data) => {
      addNotif({
        type: 'crisis',
        title: 'New Crisis Reported',
        message: data.description || `${data.incident_type} incident reported — Severity: ${data.severity}`,
        severity: data.severity === 'critical' ? 'critical' : 'high',
      });
    });

    socket.on('panic_triggered', (data) => {
      addNotif({
        type: 'panic',
        title: 'Panic Alert!',
        message: data.message || `Panic triggered by ${data.user_name || 'a guest'}`,
        severity: 'critical',
      });
    });

    socket.on('user_checkin', (data) => {
      addNotif({
        type: 'checkin',
        title: 'User Check-In',
        message: `${data.user_name || 'A user'} checked in as ${data.status}`,
        severity: data.status === 'safe' ? 'info' : 'high',
      });
    });

    socket.on('mass_notification', (data) => {
      addNotif({
        type: 'mass',
        title: 'Mass Notification',
        message: data.message,
        severity: 'high',
      });
    });

    socket.on('incident_status_update', (data) => {
      addNotif({
        type: 'status',
        title: 'Incident Updated',
        message: `Incident #${data.incident_id} status changed to ${data.status}`,
        severity: 'medium',
      });
    });

    socket.on('user_location_update', (data) => {
      // Silently handle — no notification needed
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, connected: false });
    }
  },

  joinProperty: (propertyId: number) => {
    const { socket } = get();
    if (socket) {
      socket.emit('join_property', propertyId);
    }
  },

  joinRole: (role: string) => {
    const { socket } = get();
    if (socket) {
      socket.emit('join_role', role);
    }
  },
}));
