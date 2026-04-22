import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useNotificationStore } from './notificationStore';
import { useCrisisStore } from './crisisStore';

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
    const crisisState = useCrisisStore.getState();

    socket.on('connect', () => {
      console.log('Socket connected');
      set({ connected: true });

      // Always join the simulation property room (prototype hardcode)
      socket.emit('join_property', 2);

      // Join default rooms based on user context
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.id) socket.emit('join_user', user.id);
          if (user.property_id && user.property_id !== 2) socket.emit('join_property', user.property_id);
          if (user.organization_id) socket.emit('join_organization', user.organization_id);
          if (user.role) socket.emit('join_role', user.role);
        } catch {
          // Already joined property_2 above
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

      crisisState.onCrisisReported(data);

      addNotif({
        type: 'crisis',
        title: 'New Crisis Reported',
        message: description || `${incidentType} incident reported - Severity: ${severity}`,
        severity: severity === 'critical' ? 'critical' : 'high',
      });
    });

    socket.on('incident_enriched', (data) => {
      const enrichment = data?.enrichment;
      crisisState.onIncidentEnriched(data);
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
      crisisState.onIncidentStatusUpdate({
        ...data,
        incidentId,
      });
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

    // ═══ Simulation Crisis Sync Events ═══

    socket.on('staff_auto_assigned', (data) => {
      const coords = data?.fireCoordinates;
      const coordText = coords ? ` Fire location: (${coords.x}, ${coords.y}).` : '';
      crisisState.onStaffAssigned(data);
      addNotif({
        type: 'crisis',
        title: '🚨 Staff Auto-Assigned',
        message: (data.message || `${data.assignedStaff?.length || 0} staff members assigned to fire emergency`) + coordText,
        severity: 'critical',
      });
    });

    socket.on('task_assigned', (data) => {
      const coords = data?.fireCoordinates;
      const coordText = coords ? ` Fire location: (${coords.x}, ${coords.y}).` : '';
      crisisState.onTaskAssigned(data);
      addNotif({
        type: 'crisis',
        title: '🚨 URGENT Task Assigned',
        message: (data.message || data.task || 'Urgent emergency assignment received.') + coordText,
        severity: 'critical',
      });
    });

    socket.on('evacuation_triggered', (data) => {
      crisisState.onEvacuationTriggered(data);
      addNotif({
        type: 'crisis',
        title: '🚨 EVACUATION ORDER',
        message: data.message || 'Immediate evacuation ordered. Proceed to nearest exit.',
        severity: 'critical',
      });
    });

    socket.on('property_status_update', (data) => {
      crisisState.onPropertyStatusUpdate(data);
    });

    socket.on('mass_notification', (data) => {
      if (typeof data?.message === 'string' && /evac|emergency|crisis|alert/i.test(data.message)) {
        crisisState.onEvacuationTriggered(data);
      }
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
