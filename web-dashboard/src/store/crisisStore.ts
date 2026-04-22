import { create } from 'zustand';

interface CrisisCoords {
  x?: number;
  y?: number;
  latitude?: number;
  longitude?: number;
}

interface CrisisEnrichment {
  severity?: 'low' | 'medium' | 'high' | 'critical';
  massAlertMessage?: string;
  responderActionPlan?: string;
  evacuationRoutes?: {
    guestEmergencyPlan?: string[];
    staffEvacuationPlan?: string[];
    safeExits?: string[];
    tips?: string[];
  };
}

interface CrisisState {
  activeIncident: any | null;
  enrichment: CrisisEnrichment | null;
  coords: CrisisCoords | null;
  evacuationActive: boolean;
  bannerMessage: string;
  criticalVisible: boolean;
  roleTaskMessage: string;

  onCrisisReported: (payload: any) => void;
  onIncidentEnriched: (payload: any) => void;
  onEvacuationTriggered: (payload: any) => void;
  onPropertyStatusUpdate: (payload: any) => void;
  onIncidentStatusUpdate: (payload: any) => void;
  onStaffAssigned: (payload: any) => void;
  onTaskAssigned: (payload: any) => void;

  acknowledgeCritical: () => void;
  clearAll: () => void;
}

const defaultBanner = 'AI has detected an active emergency. Follow crisis protocol immediately.';

export const useCrisisStore = create<CrisisState>((set) => ({
  activeIncident: null,
  enrichment: null,
  coords: null,
  evacuationActive: false,
  bannerMessage: defaultBanner,
  criticalVisible: false,
  roleTaskMessage: '',

  onCrisisReported: (payload) => {
    const incident = payload?.incident || payload;
    const coords = {
      latitude: incident?.latitude ? Number(incident.latitude) : undefined,
      longitude: incident?.longitude ? Number(incident.longitude) : undefined,
    };

    set({
      activeIncident: incident,
      coords,
      evacuationActive: incident?.status === 'active' ? true : true,
      bannerMessage: incident?.mass_alert_message || defaultBanner,
      criticalVisible: true,
    });
  },

  onIncidentEnriched: (payload) => {
    const enrichment = payload?.enrichment || null;
    set((state) => {
      const mergedIncident = state.activeIncident
        ? {
            ...state.activeIncident,
            evacuation_routes: enrichment?.evacuationRoutes || state.activeIncident.evacuation_routes,
            mass_alert_message: enrichment?.massAlertMessage || state.activeIncident.mass_alert_message,
          }
        : state.activeIncident;

      return {
        enrichment,
        activeIncident: mergedIncident,
        bannerMessage: enrichment?.massAlertMessage || state.bannerMessage,
        criticalVisible: true,
      };
    });
  },

  onEvacuationTriggered: (payload) => {
    set({
      evacuationActive: true,
      bannerMessage: payload?.message || 'EMERGENCY: Evacuation in progress. Proceed to nearest safe exit.',
      criticalVisible: true,
    });
  },

  onPropertyStatusUpdate: (payload) => {
    const isEvacuating = payload?.status === 'evacuating';
    set((state) => ({
      evacuationActive: isEvacuating,
      criticalVisible: isEvacuating ? state.criticalVisible : false,
      bannerMessage: isEvacuating
        ? state.bannerMessage
        : 'Operational status restored. Continue monitoring updates.',
    }));
  },

  onIncidentStatusUpdate: (payload) => {
    const status = payload?.status;
    if (!status) return;

    if (status === 'resolved' || status === 'contained' || status === 'false_alarm') {
      set((state) => ({
        evacuationActive: false,
        criticalVisible: false,
        bannerMessage: 'Incident update received. Emergency condition cleared.',
        activeIncident: state.activeIncident && String(state.activeIncident.id) === String(payload?.incidentId)
          ? { ...state.activeIncident, status }
          : state.activeIncident,
      }));
      return;
    }

    set((state) => ({
      activeIncident: state.activeIncident && String(state.activeIncident.id) === String(payload?.incidentId)
        ? { ...state.activeIncident, status }
        : state.activeIncident,
      criticalVisible: true,
    }));
  },

  onStaffAssigned: (payload) => {
    const coordPayload = payload?.fireCoordinates || {};
    set({
      coords: {
        x: coordPayload?.x,
        y: coordPayload?.y,
      },
      roleTaskMessage: payload?.message || 'Emergency responders have been auto-assigned by AI.',
      criticalVisible: true,
    });
  },

  onTaskAssigned: (payload) => {
    const coordPayload = payload?.fireCoordinates || {};
    set({
      coords: {
        x: coordPayload?.x,
        y: coordPayload?.y,
      },
      roleTaskMessage: payload?.message || payload?.task || 'Urgent task assigned by AI crisis workflow.',
      criticalVisible: true,
    });
  },

  acknowledgeCritical: () => set({ criticalVisible: false }),

  clearAll: () =>
    set({
      activeIncident: null,
      enrichment: null,
      coords: null,
      evacuationActive: false,
      bannerMessage: defaultBanner,
      criticalVisible: false,
      roleTaskMessage: '',
    }),
}));
