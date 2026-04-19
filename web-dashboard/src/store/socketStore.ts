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
  joinOrganization: (organizationId: number) => void;
  joinRole: (role: string) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  connected: false,

  connect: () => {
    const existingSocket = get().socket;
    if (existingSocket) {
      return;
    }

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
          if (user.id) socket.emit('join_user', user.id);
          if (user.property_id) socket.emit('join_property', user.property_id);
          if (user.organization_id) socket.emit('join_organization', user.organization_id);
          if (user.role) socket.emit('join_role', user.role);
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
      const incident = data?.incident;
      const incidentType = incident?.incident_type || data?.incident_type || 'incident';
      const severity = incident?.severity || data?.severity || 'high';
      const description = incident?.description || data?.description;

      addNotif({
        type: 'crisis',
        title: 'New Crisis Reported',
        message: description || `${incidentType} incident reported - Severity: ${severity}`,
        severity: severity === 'critical' ? 'critical' : 'high',
      });
    });

    socket.on('incident_enriched', (data) => {
      const enrichment = data?.enrichment;
      if (enrichment) {
        addNotif({
          type: 'mass',
          title: 'Intelligence Brief Received',
          message: enrichment.massAlertMessage || 'New incident enrichment data available',
          severity: enrichment.severity === 'critical' ? 'critical' : 'high',
        });
      }
    });

    socket.on('panic_triggered', (data) => {
      const userName = data?.user_name || data?.userName;
      addNotif({
        type: 'panic',
        title: 'Panic Alert!',
        message: data.message || `Panic triggered by ${userName || 'a guest'}`,
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

    socket.on('nearby_crisis', (data) => {
      addNotif({
        type: 'crisis',
        title: 'CRISIS NEAR YOU!',
        message: data.message,
        severity: 'critical',
      });
    });

    socket.on('incident_status_update', (data) => {
      const incidentId = data?.incident_id || data?.incidentId;
      addNotif({
        type: 'status',
        title: 'Incident Updated',
        message: `Incident #${incidentId || 'N/A'} status changed to ${data.status}`,
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

  joinOrganization: (organizationId: number) => {
    const { socket } = get();
    if (socket) {
      socket.emit('join_organization', organizationId);
    }
  },

  joinRole: (role: string) => {
    const { socket } = get();
    if (socket) {
      socket.emit('join_role', role);
    }
  },
}));
