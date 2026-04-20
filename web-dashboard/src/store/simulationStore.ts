import { create } from 'zustand';

/* ─── Types ─── */

export type SimTool = 'select' | 'fire' | 'agent' | 'extinguish';
export type AgentStatus = 'idle' | 'evacuating' | 'responding' | 'extinguishing' | 'trapped' | 'safe' | 'dead';
export type AgentMode = 'manual' | 'ai';

export interface SimAgent {
  id: string | number;
  name: string;
  x: number;
  y: number;
  status: AgentStatus;
  health: number;
  mode: AgentMode;
}

export interface SimFire {
  x: number;
  y: number;
  intensity: number;
  spread_radius: number;
}

export interface SimMetrics {
  evacuated: number;
  trapped: number;
  casualties: number;
  avg_evacuation_time: number;
  fire_coverage_pct: number;
  blocked_exits: string[];
  total_agents: number;
}

export interface SimSnapshot {
  timestamp: number;
  agents: SimAgent[];
  fires: SimFire[];
  metrics: SimMetrics;
}

export interface SimAnalysis {
  severity: 'low' | 'medium' | 'high' | 'critical';
  evacuationEfficiency: number;
  bottlenecks: string[];
  predictedCasualties: number;
  recommendations: string[];
  narrativeSummary: string;
  riskScore: number;
  timestamp: string;
}

/* ─── Store ─── */

interface SimulationState {
  // Tool state
  activeTool: SimTool;
  setActiveTool: (tool: SimTool) => void;

  // Simulation speed
  speed: number;
  setSpeed: (speed: number) => void;

  // Live state from Godot
  agents: SimAgent[];
  fires: SimFire[];
  metrics: SimMetrics;
  updateFromSnapshot: (snapshot: SimSnapshot) => void;

  // Agent management
  selectedAgentId: string | number | null;
  selectAgent: (id: string | number | null) => void;
  nextAgentId: number;

  // Simulation running state
  isRunning: boolean;
  startTime: number | null;
  setRunning: (running: boolean) => void;

  // AI Analysis
  analysis: SimAnalysis | null;
  analysisLoading: boolean;
  analysisHistory: SimAnalysis[];
  setAnalysis: (analysis: SimAnalysis) => void;
  setAnalysisLoading: (loading: boolean) => void;

  // Local mock state (for when Godot bridge isn't connected yet)
  localAgents: SimAgent[];
  localFires: SimFire[];
  addLocalAgent: (x: number, y: number) => void;
  addLocalFire: (x: number, y: number) => void;
  removeLocalFire: (x: number, y: number) => void;
  moveLocalAgent: (id: string | number, x: number, y: number) => void;
  toggleAgentMode: (id: string | number) => void;
  resetLocal: () => void;
  godotConnected: boolean;
  setGodotConnected: (connected: boolean) => void;

  // Crisis sync state
  crisisActive: boolean;
  crisisIncidentId: number | null;
  assignedStaff: { id: number; name: string; role: string; task: string }[];
  setCrisisActive: (active: boolean, incidentId?: number | null) => void;
  setAssignedStaff: (staff: { id: number; name: string; role: string; task: string }[]) => void;
}

const DEFAULT_METRICS: SimMetrics = {
  evacuated: 0,
  trapped: 0,
  casualties: 0,
  avg_evacuation_time: 0,
  fire_coverage_pct: 0,
  blocked_exits: [],
  total_agents: 0,
};

const AGENT_NAMES = [
  'Guest Anderson', 'Tourist Baker', 'Staff Chen', 'Visitor Davis',
  'Guest Evans', 'Tourist Foster', 'Staff Garcia', 'Visitor Harris',
  'Guest Ibrahim', 'Tourist Jackson', 'Staff Kim', 'Visitor Lee',
  'Guest Martinez', 'Tourist Nguyen', 'Staff Okafor', 'Visitor Park',
];

export const useSimulationStore = create<SimulationState>((set, get) => ({
  // Tool
  activeTool: 'select',
  setActiveTool: (tool) => set({ activeTool: tool }),

  // Speed
  speed: 1,
  setSpeed: (speed) => set({ speed }),

  // Live state
  agents: [],
  fires: [],
  metrics: DEFAULT_METRICS,
  updateFromSnapshot: (snapshot) => set({
    agents: snapshot.agents,
    fires: snapshot.fires,
    metrics: snapshot.metrics,
  }),

  // Agent selection
  selectedAgentId: null,
  selectAgent: (id) => set({ selectedAgentId: id }),
  nextAgentId: 1,

  // Running
  isRunning: false,
  startTime: null,
  setRunning: (running) => set({
    isRunning: running,
    startTime: running ? Date.now() : get().startTime,
  }),

  // AI analysis
  analysis: null,
  analysisLoading: false,
  analysisHistory: [],
  setAnalysis: (analysis) => set((state) => ({
    analysis,
    analysisLoading: false,
    analysisHistory: [analysis, ...state.analysisHistory].slice(0, 20),
  })),
  setAnalysisLoading: (loading) => set({ analysisLoading: loading }),

  // Local mock state
  localAgents: [],
  localFires: [],
  godotConnected: false,
  setGodotConnected: (connected) => set({ godotConnected: connected }),

  addLocalAgent: (x, y) => {
    const { nextAgentId } = get();
    const name = AGENT_NAMES[(nextAgentId - 1) % AGENT_NAMES.length];
    const agent: SimAgent = {
      id: `agent_${nextAgentId}`,
      name,
      x, y,
      status: 'idle',
      health: 100,
      mode: 'ai',
    };
    set((state) => ({
      localAgents: [...state.localAgents, agent],
      nextAgentId: nextAgentId + 1,
    }));
  },

  addLocalFire: (x, y) => {
    const fire: SimFire = { x, y, intensity: 0.8, spread_radius: 2 };
    set((state) => ({ localFires: [...state.localFires, fire] }));
  },

  removeLocalFire: (x, y) => {
    set((state) => ({
      localFires: state.localFires.filter(
        (f) => Math.sqrt((f.x - x) ** 2 + (f.y - y) ** 2) > 30
      ),
    }));
  },

  moveLocalAgent: (id, x, y) => {
    set((state) => ({
      localAgents: state.localAgents.map((a) =>
        a.id === id ? { ...a, x, y } : a,
      ),
    }));
  },

  toggleAgentMode: (id) => {
    set((state) => ({
      localAgents: state.localAgents.map((a) =>
        a.id === id ? { ...a, mode: a.mode === 'ai' ? 'manual' : 'ai' } : a,
      ),
    }));
  },

  resetLocal: () => set({
    localAgents: [],
    localFires: [],
    nextAgentId: 1,
    analysis: null,
    isRunning: false,
    startTime: null,
    metrics: DEFAULT_METRICS,
    crisisActive: false,
    crisisIncidentId: null,
    assignedStaff: [],
  }),

  // Crisis sync
  crisisActive: false,
  crisisIncidentId: null,
  assignedStaff: [],
  setCrisisActive: (active, incidentId = null) => set({ crisisActive: active, crisisIncidentId: incidentId }),
  setAssignedStaff: (staff) => set({ assignedStaff: staff }),
}));
