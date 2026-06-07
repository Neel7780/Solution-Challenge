import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  Stack,
  Button,
  Divider,
  ButtonGroup,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Refresh as RefreshIcon,
  FiberManualRecord as DotIcon,
  OpenInNew as OpenInNewIcon,
  LocalFireDepartment as FireIcon,
  PersonAdd as AgentIcon,
  PanTool as SelectIcon,
  FireExtinguisher as ExtinguishIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  RestartAlt as ResetIcon,
  Speed as SpeedIcon,
  Psychology as AiIcon,
  SmartToy as SmartToyIcon,
  DirectionsRun as RunIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Shield as ShieldIcon,
  Delete as DeleteIcon,
  MyLocation as LocateIcon,
} from '@mui/icons-material';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import axios from 'axios';

import { useSimulationStore, type SimTool, type SimAnalysis } from '../store/simulationStore';
import { useSocketStore } from '../store/socketStore';
import { useAuthStore } from '../store/authStore';
import { godotToLatLng } from './Locations';

const SIMULATION_URL = '/simulation/hotel_fire_simulation.html';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const DEFAULT_PROPERTY_ID = 2; // Hardcoded fallback for prototype

/* ─── Tool Config ─── */
const TOOLS: { id: SimTool; label: string; icon: React.ElementType; color: string; hint: string }[] = [
  { id: 'select', label: 'Select / Move', icon: SelectIcon, color: '#3b82f6', hint: 'Click an agent to select, then click to move' },
  { id: 'fire', label: 'Place Fire', icon: FireIcon, color: '#ff3e3e', hint: 'Click on the simulation to place a fire' },
  { id: 'agent', label: 'Place Agent', icon: AgentIcon, color: '#00f58c', hint: 'Click on the simulation to place an agent' },
  { id: 'extinguish', label: 'Extinguish', icon: ExtinguishIcon, color: '#22d3ee', hint: 'Click near a fire to remove it' },
];

const SPEEDS = [0.5, 1, 2, 4];

/* ─── Helper ─── */
const severityColor = (s?: string) => {
  switch (s) {
    case 'critical': return '#ff3e3e';
    case 'high': return '#fb923c';
    case 'medium': return '#f59e0b';
    case 'low': return '#00f58c';
    default: return '#666';
  }
};

const statusEmoji = (s: string) => {
  switch (s) {
    case 'safe': return '✅';
    case 'evacuating': return '🏃';
    case 'responding': return '🛡️';
    case 'extinguishing': return '🧯';
    case 'trapped': return '⚠️';
    case 'dead': return '❌';
    default: return '🟢';
  }
};

const statusBadgeStyle = (s: string) => {
  switch (s) {
    case 'responding':
      return { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: 'rgba(59,130,246,0.3)' };
    case 'extinguishing':
      return { bg: 'rgba(34,211,238,0.12)', color: '#22d3ee', border: 'rgba(34,211,238,0.3)' };
    case 'evacuating':
      return { bg: 'rgba(251,146,60,0.12)', color: '#fb923c', border: 'rgba(251,146,60,0.3)' };
    case 'trapped':
      return { bg: 'rgba(255,62,62,0.12)', color: '#ff3e3e', border: 'rgba(255,62,62,0.3)' };
    case 'safe':
      return { bg: 'rgba(0,245,140,0.12)', color: '#00f58c', border: 'rgba(0,245,140,0.3)' };
    default:
      return { bg: 'rgba(255,255,255,0.08)', color: '#9ca3af', border: 'rgba(255,255,255,0.15)' };
  }
};

/* ─── Fire Overlay Marker ─── */
function FireMarker({ x, y, intensity, onRemove }: { x: number; y: number; intensity: number; onRemove?: () => void }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        left: x - 18,
        top: y - 18,
        width: 36,
        height: 36,
        pointerEvents: 'auto',
        cursor: 'pointer',
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        '&:hover .fire-remove': { opacity: 1 },
      }}
      onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
    >
      {/* Animated glow */}
      <Box sx={{
        position: 'absolute', inset: -8,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(255,100,0,${0.3 * intensity}) 0%, transparent 70%)`,
        animation: 'fireGlow 1.5s ease-in-out infinite alternate',
        '@keyframes fireGlow': {
          '0%': { transform: 'scale(0.8)', opacity: 0.5 },
          '100%': { transform: 'scale(1.4)', opacity: 1 },
        },
      }} />
      {/* Fire icon */}
      <Typography sx={{ fontSize: 22, lineHeight: 1, filter: 'drop-shadow(0 0 6px rgba(255,100,0,0.8))' }}>
        🔥
      </Typography>
      {/* Remove button on hover */}
      <Box className="fire-remove" sx={{
        position: 'absolute', top: -6, right: -6,
        width: 16, height: 16, borderRadius: '50%',
        backgroundColor: 'rgba(0,0,0,0.8)', color: '#ff3e3e',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.5rem', fontWeight: 900,
        opacity: 0, transition: 'opacity 0.15s ease',
        border: '1px solid rgba(255,62,62,0.4)',
      }}>✕</Box>
    </Box>
  );
}

/* ─── Agent Overlay Marker ─── */
function AgentMarker({ agent, selected, onClick }: { agent: any; selected: boolean; onClick: () => void }) {
  return (
    <Box
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      sx={{
        position: 'absolute',
        left: agent.x - 14,
        top: agent.y - 14,
        width: 28,
        height: 28,
        pointerEvents: 'auto',
        cursor: 'pointer',
        zIndex: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.3s ease',
      }}
    >
      {/* Selection ring */}
      {selected && (
        <Box sx={{
          position: 'absolute', inset: -4,
          borderRadius: '50%',
          border: '2px solid #3b82f6',
          animation: 'selectPulse 1.5s ease-in-out infinite',
          '@keyframes selectPulse': {
            '0%,100%': { opacity: 0.5, transform: 'scale(1)' },
            '50%': { opacity: 1, transform: 'scale(1.2)' },
          },
        }} />
      )}
      {/* Agent dot */}
      <Box sx={{
        width: 20, height: 20, borderRadius: '50%',
        backgroundColor: agent.status === 'dead' ? '#444'
          : agent.status === 'trapped' ? '#ff3e3e'
          : agent.status === 'responding' ? '#60a5fa'
          : agent.status === 'extinguishing' ? '#22d3ee'
          : agent.status === 'evacuating' ? '#fb923c'
          : agent.status === 'safe' ? '#00f58c'
          : '#00f58c',
        border: `2px solid ${selected ? '#3b82f6' : 'rgba(255,255,255,0.6)'}`,
        boxShadow: `0 0 ${selected ? 12 : 6}px ${selected ? 'rgba(59,130,246,0.5)' : 'rgba(0,245,140,0.3)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.55rem', fontWeight: 900, color: '#000',
      }}>
        {agent.name.charAt(0)}
      </Box>
      {/* Name label */}
      <Box sx={{
        position: 'absolute', top: 30, left: '50%', transform: 'translateX(-50%)',
        whiteSpace: 'nowrap',
        px: 0.5, py: 0.2, borderRadius: 0.5,
        backgroundColor: 'rgba(0,0,0,0.8)',
        color: '#fff', fontSize: '0.5rem', fontWeight: 600,
        letterSpacing: '0.03em',
      }}>
        {agent.name.split(' ')[1] || agent.name}
      </Box>
    </Box>
  );
}

/* ─── Main Component ─── */
export default function Simulation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const lastTelemetrySentAtRef = useRef<number>(0);
  const syncedOccupantIdsRef = useRef<Set<number>>(new Set());

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [simLoaded, setSimLoaded] = useState(false);
  const [simError, setSimError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  
  const { socket } = useSocketStore();
  const { user } = useAuthStore();

  const currentPropertyId = user?.property_id || DEFAULT_PROPERTY_ID;

  const { 
    updateFromSnapshot, agents, fires, metrics, setGodotConnected,
    setAnalysis, setAnalysisLoading, setCrisisActive, setAssignedStaff,
    activeTool, setActiveTool, speed, setSpeed, isRunning, setRunning,
    selectedAgentId, selectAgent, localAgents, addLocalAgent, addLocalFire, 
    removeLocalFire, moveLocalAgent, toggleAgentMode, resetLocal,
    crisisActive, crisisIncidentId, assignedStaff, analysis, analysisHistory, analysisLoading
  } = useSimulationStore();

  // Entrance animations
  useGSAP(() => {
    gsap.from('.sim-toolbar', { y: -10, opacity: 0, duration: 0.4, ease: 'power2.out', clearProps: 'all', force3D: false });
    gsap.from('.sim-viewport', { y: 20, opacity: 0, duration: 0.6, delay: 0.1, ease: 'power2.out', clearProps: 'all', force3D: false });
    gsap.from('.sim-sidebar', { x: 20, opacity: 0, duration: 0.5, delay: 0.2, ease: 'power2.out', clearProps: 'all', force3D: false });
  }, { scope: containerRef });

  // ─── Data Fetching ───
  useEffect(() => {
    const fetchOccupants = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.users) {
          // Filter out users strictly meant for currentPropertyId
          const propertyUsers = res.data.users.filter((u: any) => u.property_id === currentPropertyId);
          // Shuffle or sort if needed, here we just keep them
          setDbOccupants(propertyUsers);
        }
      } catch (err) {
        console.error('Failed to fetch DB occupants for simulation', err);
      }
    };
    fetchOccupants();
  }, [currentPropertyId]);

  // Socket.io analysis results listener
  useEffect(() => {
    if (!socket) return;
    const handler = (data: any) => {
      if (data?.analysis) {
        setAnalysis(data.analysis as SimAnalysis);
        setAnalysisLoading(false);
      }
    };
    socket.on('simulation:analysis_result', handler);
    return () => { socket.off('simulation:analysis_result', handler); };
  }, [socket, setAnalysis, setAnalysisLoading]);

  // Listen for crisis acknowledgment from backend
  useEffect(() => {
    if (!socket) return;
    const ackHandler = (data: any) => {
      if (data?.incidentId && !data.deduplicated) {
        setCrisisActive(true, data.incidentId);
        if (data.assignedStaff) setAssignedStaff(data.assignedStaff);
      }
    };

    const statusHandler = (data: any) => {
      if (data?.status === 'contained' || data?.status === 'resolved' || data?.status === 'false_alarm') {
        setCrisisActive(false, null);
        setAssignedStaff([]);
      }
    };

    const propertyStatusHandler = (data: any) => {
      if (data?.status === 'operational') {
        setCrisisActive(false, null);
        setAssignedStaff([]);
      }
    };

    socket.on('simulation:crisis_ack', ackHandler);
    socket.on('incident_status_update', statusHandler);
    socket.on('property_status_update', propertyStatusHandler);

    return () => {
      socket.off('simulation:crisis_ack', ackHandler);
      socket.off('incident_status_update', statusHandler);
      socket.off('property_status_update', propertyStatusHandler);
    };
  }, [socket, setCrisisActive, setAssignedStaff]);

  // Real DB users for simulation
  const [dbOccupants, setDbOccupants] = useState<any[]>([]);
  const [spawnIndex, setSpawnIndex] = useState(0);

  // Listen to Godot messages
  const [singleFireMode, setSingleFireMode] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'simulation:ready') {
        setGodotConnected(true);
      } else if (event.data?.type === 'simulation:tick') {
        setGodotConnected(true);
        updateFromSnapshot(event.data);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [updateFromSnapshot, setGodotConnected]);

  // Send lightweight fire telemetry heartbeat so backend can auto-contain crisis after no-fire cooldown.
  useEffect(() => {
    if (!socket || !simLoaded) return;

    const now = Date.now();
    if (now - lastTelemetrySentAtRef.current < 1500) {
      return;
    }

    lastTelemetrySentAtRef.current = now;
    socket.emit('simulation:telemetry', {
      propertyId: currentPropertyId,
      activeFireCount: fires.length,
      activeAgentCount: agents.length,
      agents: agents.map(a => ({
        id: a.id,
        name: a.name,
        x: a.x,
        y: a.y,
        status: a.status,
        health: a.health
      })),
      timestamp: new Date().toISOString(),
    });
  }, [fires, agents, socket, simLoaded, currentPropertyId]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const handleReload = () => {
    setSimLoaded(false);
    setSimError(false);
    syncedOccupantIdsRef.current.clear();
    setIframeKey((p) => p + 1);
  };

  // Send command to Godot via postMessage
  const sendToGodot = useCallback((command: string, payload: any = {}) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'simulation:command', command, ...payload },
      '*'
    );
  }, []);

  // Automatically materialize all Neon users (property #2) in simulation for prototype sync.
  useEffect(() => {
    if (!simLoaded || dbOccupants.length === 0) return;

    const currentSynced = syncedOccupantIdsRef.current;
    const unsynced = dbOccupants.filter((u) => !currentSynced.has(u.id));
    if (unsynced.length === 0) return;

    unsynced.forEach((occupant, index) => {
      const roleTag = occupant.role ? `[${String(occupant.role).toUpperCase()}] ` : '';
      const displayName = `${roleTag}${occupant.name}`;
      // Spread new users over the lobby area to avoid stacking.
      const x = 120 + ((index * 47) % 560);
      const y = 110 + (Math.floor(index / 12) * 42);
      sendToGodot('spawn_agent', { x, y, name: displayName });
      currentSynced.add(occupant.id);
    });
  }, [simLoaded, dbOccupants, sendToGodot]);

  // ═══ Viewport Click Handler ═══
  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    switch (activeTool) {
      case 'fire':
        if (singleFireMode) {
          fires.forEach(f => sendToGodot('remove_fire', { x: -f.x, y: -f.y }));
        }
        addLocalFire(x, y);
        sendToGodot('spawn_fire', { x, y });

        // Calculate Godot world coordinates from click pixels (fallback range matches godot serve.py / camera viewport projection)
        const worldX = -9.0 + (x / rect.width) * 14.0;
        const worldY = -15.0 + (y / rect.height) * 25.0;

        // Convert to georeferenced Lat/Lng
        const [lat, lng] = godotToLatLng(worldX, worldY);

        // ─── Emit fire crisis to backend for full-stack sync ───
        if (socket) {
          socket.emit('simulation:fire_crisis', {
            propertyId: currentPropertyId,
            fireX: x,
            fireY: y,
            latitude: lat,
            longitude: lng,
            agentCount: agents.length || localAgents.length,
            userId: user?.id || null,
          });
          console.log('[Simulation] Fire crisis emitted to backend at georeferenced coordinates:', lat, lng);
        }
        break;
      case 'agent':
        addLocalAgent(x, y);
        let agentName = `Agent ${useSimulationStore.getState().nextAgentId}`;
        if (dbOccupants.length > 0) {
          const occupant = dbOccupants[spawnIndex % dbOccupants.length];
          agentName = occupant.role === 'guest' 
            ? occupant.name 
            : `[${occupant.role.toUpperCase()}] ${occupant.name}`;
          setSpawnIndex(prev => prev + 1);
        }
        sendToGodot('spawn_agent', { x, y, name: agentName });
        break;
      case 'extinguish':
        removeLocalFire(x, y);
        sendToGodot('remove_fire', { x, y });
        break;
      case 'select':
        // Move selected agent to click position
        if (selectedAgentId) {
          moveLocalAgent(selectedAgentId, x, y);
          sendToGodot('move_agent', { agent_id: selectedAgentId, x, y });
        }
        break;
    }
  }, [activeTool, addLocalFire, addLocalAgent, removeLocalFire, selectedAgentId, moveLocalAgent, sendToGodot, singleFireMode, fires]);

  // ═══ Run AI Analysis ═══
  const runAnalysis = useCallback(async () => {
    setAnalysisLoading(true);
    // Use real internal Godot state instead of mock local state
    const godotAgents = useSimulationStore.getState().agents;
    const godotFires = useSimulationStore.getState().fires;
    
    const snapshot = {
      timestamp: Date.now(),
      agents: godotAgents,
      fires: godotFires,
      metrics: {
        evacuated: godotAgents.filter((a) => a.status === 'safe').length,
        trapped: godotAgents.filter((a) => a.status === 'trapped').length,
        casualties: godotAgents.filter((a) => a.status === 'dead').length,
        avg_evacuation_time: Math.random() * 60 + 20, // Estimated
        fire_coverage_pct: Math.min(100, godotFires.length * 8),
        blocked_exits: godotFires.length > 2 ? ['north_stairwell'] : [],
        total_agents: godotAgents.length,
      },
    };

    try {
      if (socket && user) {
        // Send via Socket.io for persistent analysis pipeline
        socket.emit('simulation:request_analysis', {
          propertyId: currentPropertyId,
          snapshot,
          simulationDuration: 0,
        });

        // Listen for socket errors specifically for this request
        socket.once('simulation:analysis_error', (err: any) => {
          console.error('AI Analysis Socket Error:', err);
          setAnalysisLoading(false);
          alert('AI Analysis failed. Please try again.');
        });
      } else {
        // Fallback to direct API
        const token = localStorage.getItem('token');
        const res = await axios.post(`${API_URL}/simulation/analyze`, {
          propertyId: currentPropertyId,
          snapshot,
        }, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data?.analysis) setAnalysis(res.data.analysis);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysisLoading(false);
    }
  }, [socket, user, setAnalysis, setAnalysisLoading]);

  const handleReset = () => {
    resetLocal();
    syncedOccupantIdsRef.current.clear();
    sendToGodot('reset_simulation');
  };

  const handleSpeedChange = (s: number) => {
    setSpeed(s);
    sendToGodot('set_speed', { multiplier: s });
  };

  const currentTool = TOOLS.find((t) => t.id === activeTool)!;
  const respondingCount = agents.filter((a) => a.status === 'responding').length;
  const extinguishingCount = agents.filter((a) => a.status === 'extinguishing').length;
  const evacuatingCount = agents.filter((a) => a.status === 'evacuating').length;

  return (
    <Box ref={containerRef} sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 100px)' }}>
      {/* ═══ Left Panel: Agent Manager ═══ */}
      <Paper
        className="sim-sidebar"
        sx={{
          width: 260, flexShrink: 0, p: 0,
          display: { xs: 'none', lg: 'flex' }, flexDirection: 'column',
          backgroundColor: 'rgba(255,255,255,0.015)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '8px', overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <Typography variant="overline" sx={{ color: 'var(--text-muted)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em' }}>
            Agent Manager
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--text-muted)', display: 'block', mt: 0.5 }}>
            {agents.length} agents · {fires.length} fires
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1, overflow: 'auto', px: 1, py: 1 }}>
          {agents.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <SmartToyIcon sx={{ fontSize: 40, color: 'rgba(255,255,255,0.05)', mb: 1 }} />
              <Typography variant="caption" sx={{ color: 'var(--text-muted)', display: 'block' }}>
                No agents yet. Select the <strong>Place Agent</strong> tool and click on the viewport.
              </Typography>
            </Box>
          ) : (
            agents.map((agent) => (
              <Box
                key={agent.id}
                onClick={() => { selectAgent(agent.id); setActiveTool('select'); }}
                sx={{
                  p: 1.5, mb: 0.5, borderRadius: 1.5, cursor: 'pointer',
                  border: selectedAgentId === agent.id ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
                  backgroundColor: selectedAgentId === agent.id ? 'rgba(59,130,246,0.06)' : 'transparent',
                  transition: 'all 0.15s ease',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.03)' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: 12 }}>{statusEmoji(agent.status)}</Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 500, flexGrow: 1 }}>
                    {agent.name}
                  </Typography>
                  <Chip
                    label={agent.status.toUpperCase()}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.5rem',
                      fontWeight: 700,
                      backgroundColor: statusBadgeStyle(agent.status).bg,
                      color: statusBadgeStyle(agent.status).color,
                      border: `1px solid ${statusBadgeStyle(agent.status).border}`,
                    }}
                  />
                  <Chip
                    label={agent.mode.toUpperCase()}
                    size="small"
                    onClick={(e) => { e.stopPropagation(); toggleAgentMode(agent.id); }}
                    sx={{
                      height: 18, fontSize: '0.55rem', fontWeight: 700, cursor: 'pointer',
                      backgroundColor: agent.mode === 'ai' ? 'rgba(0,245,140,0.08)' : 'rgba(251,146,60,0.08)',
                      color: agent.mode === 'ai' ? '#00f58c' : '#fb923c',
                      border: `1px solid ${agent.mode === 'ai' ? 'rgba(0,245,140,0.2)' : 'rgba(251,146,60,0.2)'}`,
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: '0.6rem', mt: 0.5, display: 'block' }}>
                  HP: {agent.health}% · ({Math.round(agent.x)}, {Math.round(agent.y)})
                </Typography>
              </Box>
            ))
          )}
        </Box>

        {/* Crisis Status Panel */}
        {crisisActive && (
          <Box sx={{ p: 1.5, borderTop: '1px solid rgba(255,62,62,0.3)', backgroundColor: 'rgba(255,62,62,0.04)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box sx={{
                width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ff3e3e',
                animation: 'crisisPulse 1s ease-in-out infinite alternate',
                '@keyframes crisisPulse': { '0%': { opacity: 0.4 }, '100%': { opacity: 1 } },
              }} />
              <Typography variant="caption" sx={{ color: '#ff3e3e', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                🚨 Crisis Active · #{crisisIncidentId}
              </Typography>
            </Box>
            {assignedStaff.length > 0 && (
              <Box>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5, display: 'block' }}>
                  Auto-Assigned Staff ({assignedStaff.length})
                </Typography>
                {assignedStaff.map((s) => (
                  <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                    <ShieldIcon sx={{ fontSize: 12, color: s.role === 'security' ? '#fb923c' : s.role === 'responder' ? '#ff3e3e' : '#3b82f6' }} />
                    <Box>
                      <Typography variant="caption" sx={{ color: '#fff', fontSize: '0.65rem', fontWeight: 600, display: 'block' }}>
                        {s.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: '0.5rem', textTransform: 'uppercase' }}>
                        {s.role}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* Quick Stats */}
        <Box sx={{ p: 1.5, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            {[
              { label: 'Safe', value: metrics?.evacuated || agents.filter((a) => a.status === 'safe').length, color: '#00f58c' },
              { label: 'Evac.', value: agents.filter((a) => a.status === 'evacuating').length, color: '#fb923c' },
              { label: 'Trapped', value: metrics?.trapped || agents.filter((a) => a.status === 'trapped').length, color: '#ff3e3e' },
              { label: 'Fires', value: fires.length, color: '#ff3e3e' },
            ].map((s) => (
              <Box key={s.label} sx={{ textAlign: 'center', p: 0.5 }}>
                <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 200, fontSize: '1.3rem', color: s.color }}>
                  {s.value}
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>

      {/* ═══ Center: Viewport + Toolbar ═══ */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Toolbar */}
        <Paper
          className="sim-toolbar"
          sx={{
            p: 1, mb: 2, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
            backgroundColor: 'rgba(255,255,255,0.015)',
            border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px',
          }}
        >
          <ButtonGroup size="small" variant="outlined">
            {TOOLS.map(({ id, label, icon: Icon, color }) => (
              <Tooltip key={id} title={label} arrow>
                <Button
                  onClick={() => setActiveTool(id)}
                  sx={{
                    minWidth: 36,
                    backgroundColor: activeTool === id ? `${color}18` : 'transparent',
                    borderColor: activeTool === id ? color : 'rgba(255,255,255,0.1)',
                    color: activeTool === id ? color : 'var(--text-muted)',
                    '&:hover': { borderColor: color, backgroundColor: `${color}12` },
                  }}
                >
                  <Icon sx={{ fontSize: 18 }} />
                </Button>
              </Tooltip>
            ))}
          </ButtonGroup>

          <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.08)', mx: 0.5 }} />

          {/* Single Fire Mode Toggle */}
          <Tooltip title="Single Fire Mode (Removes old fires when placing a new one)" arrow>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setSingleFireMode(!singleFireMode)}
              startIcon={<FireIcon />}
              sx={{
                textTransform: 'none',
                borderColor: singleFireMode ? '#ff3e3e' : 'rgba(255,255,255,0.1)',
                color: singleFireMode ? '#ff3e3e' : 'var(--text-muted)',
                backgroundColor: singleFireMode ? 'rgba(255,62,62,0.1)' : 'transparent',
                '&:hover': {
                  borderColor: '#ff3e3e',
                  backgroundColor: 'rgba(255,62,62,0.1)',
                }
              }}
            >
              {singleFireMode ? 'Single Fire' : 'Multi Fire'}
            </Button>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.08)', mx: 0.5 }} />

          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <SpeedIcon sx={{ fontSize: 16, color: 'var(--text-muted)' }} />
            {SPEEDS.map((s) => (
              <Chip
                key={s} label={`${s}x`} size="small"
                onClick={() => handleSpeedChange(s)}
                sx={{
                  height: 22, fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer',
                  backgroundColor: speed === s ? 'rgba(59,130,246,0.12)' : 'transparent',
                  color: speed === s ? '#3b82f6' : 'var(--text-muted)',
                  border: `1px solid ${speed === s ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
                }}
              />
            ))}
          </Stack>

          <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.08)', mx: 0.5 }} />

          <Tooltip title={isRunning ? 'Pause' : 'Start'} arrow>
            <IconButton size="small" onClick={() => { setRunning(!isRunning); sendToGodot(isRunning ? 'pause' : 'play'); }} sx={{ color: isRunning ? '#00f58c' : 'var(--text-muted)' }}>
              {isRunning ? <PauseIcon fontSize="small" /> : <PlayIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset All" arrow>
            <IconButton size="small" onClick={handleReset} sx={{ color: 'var(--text-muted)' }}>
              <ResetIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Box sx={{ flexGrow: 1 }} />

          {/* AI Analysis Button */}
          <Button
            variant="contained" size="small"
            startIcon={analysisLoading ? <CircularProgress size={14} color="inherit" /> : <AiIcon />}
            disabled={analysisLoading || (agents.length === 0 && fires.length === 0)}
            onClick={runAnalysis}
            sx={{
              background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
              fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.04em', px: 2, textTransform: 'none',
              '&:hover': { background: 'linear-gradient(135deg, #6d28d9, #2563eb)' },
              '&.Mui-disabled': { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' },
            }}
          >
            {analysisLoading ? 'Analyzing...' : 'Run AI Analysis'}
          </Button>

          <Chip
            icon={<DotIcon sx={{ fontSize: '10px !important', color: simLoaded ? '#00f58c !important' : '#fb923c !important' }} />}
            label={simLoaded ? 'Live' : 'Loading'}
            size="small"
            sx={{
              backgroundColor: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)',
              border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.65rem', fontWeight: 600,
            }}
          />
        </Paper>

        {/* Live responder strip for demos */}
        <Paper
          sx={{
            px: 1.25,
            py: 0.75,
            mb: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
            backgroundColor: 'rgba(255,255,255,0.012)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '8px',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: 'var(--text-muted)',
              fontSize: '0.58rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Live Ops
          </Typography>
          <Chip
            label={`🛡️ Responding: ${respondingCount}`}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.6rem',
              fontWeight: 700,
              backgroundColor: 'rgba(59,130,246,0.12)',
              color: '#60a5fa',
              border: '1px solid rgba(59,130,246,0.35)',
            }}
          />
          <Chip
            label={`🧯 Extinguishing: ${extinguishingCount}`}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.6rem',
              fontWeight: 700,
              backgroundColor: 'rgba(34,211,238,0.12)',
              color: '#22d3ee',
              border: '1px solid rgba(34,211,238,0.35)',
            }}
          />
          <Chip
            label={`🏃 Evacuating: ${evacuatingCount}`}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.6rem',
              fontWeight: 700,
              backgroundColor: 'rgba(251,146,60,0.12)',
              color: '#fb923c',
              border: '1px solid rgba(251,146,60,0.35)',
            }}
          />
        </Paper>

        {/* Viewport */}
        <Paper
          ref={wrapperRef}
          className="sim-viewport"
          sx={{
            position: 'relative', overflow: 'hidden',
            borderRadius: isFullscreen ? 0 : '8px',
            border: '1px solid rgba(255,255,255,0.06)',
            backgroundColor: '#000', flexGrow: 1,
          }}
        >
          {/* ══ Interactive Overlay (for events only, no markers) ══ */}
          <Box
            onClick={handleOverlayClick}
            className="interactive-layer"
            sx={{
              position: 'absolute', inset: 0, zIndex: 4,
              cursor: activeTool === 'fire' ? 'crosshair'
                : activeTool === 'agent' ? 'cell'
                : activeTool === 'extinguish' ? 'pointer'
                : selectedAgentId ? 'crosshair'
                : 'default',
              pointerEvents: activeTool === 'select' && !selectedAgentId ? 'none' : 'auto',
            }}
          >
            {/* Markers removed. Godot will render them natively in the 3D scene. */}
          </Box>

          {/* Floating HUD controls */}
          <Box sx={{
            position: 'absolute', top: 0, right: 0, zIndex: 10,
            display: 'flex', gap: 0.5, p: 1,
            opacity: 0, transition: 'opacity 0.25s ease',
            '&:hover': { opacity: 1 },
          }}>
            <Tooltip title="Reload" arrow>
              <IconButton size="small" onClick={handleReload} sx={{ color: 'rgba(255,255,255,0.7)', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}>
                <RefreshIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Open in Tab" arrow>
              <IconButton size="small" component="a" href={SIMULATION_URL} target="_blank" rel="noopener noreferrer" sx={{ color: 'rgba(255,255,255,0.7)', bgcolor: 'rgba(0,0,0,0.5)' }}>
                <OpenInNewIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'} arrow>
              <IconButton size="small" onClick={toggleFullscreen} sx={{ color: 'rgba(255,255,255,0.7)', bgcolor: 'rgba(0,0,0,0.5)' }}>
                {isFullscreen ? <FullscreenExitIcon sx={{ fontSize: 16 }} /> : <FullscreenIcon sx={{ fontSize: 16 }} />}
              </IconButton>
            </Tooltip>
          </Box>

          {/* Active tool indicator */}
          {(activeTool !== 'select' || selectedAgentId) && (
            <Box sx={{
              position: 'absolute', bottom: 12, left: 12, zIndex: 10,
              display: 'flex', alignItems: 'center', gap: 1,
              px: 1.5, py: 0.75, borderRadius: 2,
              backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
              border: `1px solid ${currentTool.color}30`,
            }}>
              {React.createElement(currentTool.icon, { sx: { fontSize: 16, color: currentTool.color } })}
              <Typography variant="caption" sx={{ color: '#fff', fontSize: '0.65rem', fontWeight: 600 }}>
                {selectedAgentId && activeTool === 'select'
                  ? `Moving ${localAgents.find(a => a.id === selectedAgentId)?.name || 'Agent'} — Click to place`
                  : currentTool.hint}
              </Typography>
              {selectedAgentId && activeTool === 'select' && (
                <Chip label="ESC" size="small" onClick={() => selectAgent(null)}
                  sx={{ height: 16, fontSize: '0.5rem', fontWeight: 800, cursor: 'pointer', ml: 0.5,
                    backgroundColor: 'rgba(255,255,255,0.08)', color: '#888', border: '1px solid rgba(255,255,255,0.1)' }} />
              )}
            </Box>
          )}

          {/* Loading overlay */}
          {!simLoaded && !simError && (
            <Box sx={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', zIndex: 1,
              backgroundColor: '#0a0a0a', gap: 2,
            }}>
              <Box sx={{
                width: 40, height: 40, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.06)', borderTopColor: '#ff3e3e',
                animation: 'spin 1s linear infinite',
                '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
              }} />
              <Typography variant="caption" sx={{ color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                Initializing Simulation Engine...
              </Typography>
            </Box>
          )}

          {/* Error */}
          {simError && (
            <Box sx={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', zIndex: 1, backgroundColor: '#0a0a0a', gap: 2,
            }}>
              <WarningIcon sx={{ fontSize: 48, color: '#fb923c', opacity: 0.5 }} />
              <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>
                Simulation server offline. Run <code style={{ backgroundColor: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 4 }}>python3 serve.py</code>
              </Typography>
              <Button size="small" onClick={handleReload} variant="outlined" sx={{ borderColor: '#fb923c', color: '#fb923c' }}>Retry</Button>
            </Box>
          )}

          {/* The actual simulation */}
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={SIMULATION_URL}
            title="Hotel Fire Evacuation Simulation"
            onLoad={() => { setSimLoaded(true); setSimError(false); }}
            onError={() => { setSimError(true); setSimLoaded(false); }}
            allow="autoplay; fullscreen; gamepad; pointer-lock"
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
        </Paper>
      </Box>

      {/* ═══ Right Panel: AI Analysis ═══ */}
      <Paper
        className="sim-sidebar"
        sx={{
          width: 300, flexShrink: 0, p: 0,
          display: { xs: 'none', xl: 'flex' }, flexDirection: 'column',
          backgroundColor: 'rgba(255,255,255,0.015)',
          border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 1 }}>
          <AiIcon sx={{ fontSize: 18, color: '#7c3aed' }} />
          <Box>
            <Typography variant="overline" sx={{ color: 'var(--text-muted)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', lineHeight: 1 }}>
              AI Analysis
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.6rem' }}>
              Powered by Gemini
            </Typography>          </Box>
        </Box>

        <Box sx={{ flexGrow: 1, overflow: 'auto', px: 2, py: 2 }}>
          {analysisLoading && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <CircularProgress size={32} sx={{ color: '#7c3aed', mb: 2 }} />
              <Typography variant="caption" sx={{ color: 'var(--text-muted)', display: 'block', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.6rem' }}>
                AI is analyzing the simulation...
              </Typography>
            </Box>
          )}

          {!analysis && !analysisLoading && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <AiIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.04)', mb: 2 }} />
              <Typography variant="caption" sx={{ color: 'var(--text-muted)', display: 'block' }}>
                Place fires and agents, then click <strong>"Run AI Analysis"</strong> to get AI-powered conclusions.
              </Typography>
            </Box>
          )}

          {analysis && !analysisLoading && (
            <Stack spacing={2}>
              {/* Severity + Risk Score */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <ShieldIcon sx={{ fontSize: 22, color: severityColor(analysis.severity) }} />
                <Chip label={analysis.severity.toUpperCase()} size="small" sx={{
                  height: 20, fontSize: '0.6rem', fontWeight: 800,
                  backgroundColor: `${severityColor(analysis.severity)}15`, color: severityColor(analysis.severity),
                  border: `1px solid ${severityColor(analysis.severity)}40`,
                }} />
                <Box sx={{ flexGrow: 1, textAlign: 'right' }}>
                  <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 200, fontSize: '1.6rem', color: severityColor(analysis.severity) }}>
                    {analysis.riskScore}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: '0.5rem', textTransform: 'uppercase' }}>
                    Risk Score
                  </Typography>
                </Box>
              </Box>

              {/* Evacuation Efficiency */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Evacuation Efficiency
                  </Typography>
                  <Typography variant="caption" sx={{ color: analysis.evacuationEfficiency >= 70 ? '#00f58c' : '#ff3e3e', fontSize: '0.7rem', fontWeight: 700 }}>
                    {analysis.evacuationEfficiency}%
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={analysis.evacuationEfficiency} sx={{
                  height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.04)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 2,
                    background: analysis.evacuationEfficiency >= 70
                      ? 'linear-gradient(90deg, #00f58c, #22d3ee)' : 'linear-gradient(90deg, #ff3e3e, #fb923c)',
                  },
                }} />
              </Box>

              {/* Predicted Casualties */}
              <Box sx={{
                p: 1.5, borderRadius: 1.5,
                border: `1px solid ${analysis.predictedCasualties > 0 ? 'rgba(255,62,62,0.3)' : 'rgba(0,245,140,0.2)'}`,
                backgroundColor: analysis.predictedCasualties > 0 ? 'rgba(255,62,62,0.04)' : 'rgba(0,245,140,0.03)',
              }}>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Predicted Casualties
                </Typography>
                <Typography sx={{
                  fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '1.5rem',
                  color: analysis.predictedCasualties > 0 ? '#ff3e3e' : '#00f58c',
                }}>
                  {analysis.predictedCasualties}
                </Typography>
              </Box>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.04)' }} />

              {/* Narrative */}
              <Box>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1, display: 'block' }}>
                  Summary
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1.6 }}>
                  {analysis.narrativeSummary}
                </Typography>
              </Box>

              {/* Bottlenecks */}
              {analysis.bottlenecks.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ color: '#fb923c', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1, display: 'block' }}>
                    ⚠ Bottlenecks
                  </Typography>
                  {analysis.bottlenecks.map((b, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'flex-start' }}>
                      <WarningIcon sx={{ fontSize: 12, color: '#fb923c', mt: 0.3 }} />
                      <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '0.7rem', lineHeight: 1.5 }}>
                        {b}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}

              {/* Recommendations */}
              {analysis.recommendations.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ color: '#00f58c', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1, display: 'block' }}>
                    ✓ Recommendations
                  </Typography>
                  {analysis.recommendations.map((r, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'flex-start' }}>
                      <CheckIcon sx={{ fontSize: 12, color: '#00f58c', mt: 0.3 }} />
                      <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '0.7rem', lineHeight: 1.5 }}>
                        {r}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.04)' }} />

              <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: '0.55rem', textAlign: 'center' }}>
                Analyzed at {new Date(analysis.timestamp).toLocaleTimeString()}
              </Typography>
            </Stack>
          )}
        </Box>

        {analysisHistory.length > 1 && (
          <Box sx={{ p: 1.5, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Previous Analyses: {analysisHistory.length}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
