import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Alert,
  IconButton,
  Snackbar,
  Alert as MuiAlert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Chip,
} from '@mui/material';
import {
  WarningAmber as WarningIcon,
  Phone as PhoneIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  ReportProblem as ReportIcon,
  DirectionsRun as RunIcon,
  Info as InfoIcon,
  TipsAndUpdates as TipIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useSocketStore } from '../../store/socketStore';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function GuestDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { notifications } = useNotificationStore();
  const { socket } = useSocketStore();
  const containerRef = useRef(null);
  const panicRef = useRef<HTMLButtonElement>(null);

  const [activeIncident, setActiveIncident] = useState<any>(null);
  const [isSendingSOS, setIsSendingSOS] = useState(false);
  const [assignedStaff, setAssignedStaff] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  
  // Toast notifications
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('info');

  const showToast = (message: string, severity: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    setToastMessage(message);
    setToastSeverity(severity);
    setToastOpen(true);
  };

  const fetchActiveIncident = async () => {
    try {
      const res = await axios.get(`${API_URL}/crisis/active?propertyId=${user?.property_id || 1}`);
      if (res.data.incidents && res.data.incidents.length > 0) {
        // Fetch full details for the first active incident
        const detailsRes = await axios.get(`${API_URL}/crisis/${res.data.incidents[0].id}`);
        setActiveIncident(detailsRes.data.incident);
      } else {
        setActiveIncident(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTasks = async () => {
    if (!user?.id) return;
    try {
      setLoadingTasks(true);
      const res = await axios.get(`${API_URL}/tasks`);
      const guestTasks = (res.data.tasks || []).filter(
        (t: any) => t.assigned_to === user.id
      );
      setTasks(guestTasks);
    } catch (err) {
      console.error('Failed to fetch guest tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Check for active incidents and tasks
  useEffect(() => {
    fetchActiveIncident();
    fetchTasks();
  }, [user]);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleCrisis = () => {
      fetchActiveIncident();
      fetchTasks();
    };
    const handleEnrichment = (data: any) => {
      if (activeIncident && data.incidentId === activeIncident.id) {
        fetchActiveIncident();
      }
    };

    socket.on('crisis_reported', handleCrisis);
    socket.on('incident_enriched', handleEnrichment);
    socket.on('incident_status_update', handleCrisis);

    // Listen for staff assignments
    const handleStaffAssigned = (data: any) => {
      setAssignedStaff(data.assignedStaff || []);
      showToast('Help is on the way! Staff has been assigned.', 'success');
    };
    socket.on('staff_auto_assigned', handleStaffAssigned);

    // Listen for task assignments
    const handleTaskAssigned = (data: any) => {
      fetchTasks();
      showToast('A new emergency task has been assigned to you.', 'info');
    };
    socket.on('task_assigned', handleTaskAssigned);

    return () => {
      socket.off('crisis_reported', handleCrisis);
      socket.off('incident_enriched', handleEnrichment);
      socket.off('incident_status_update', handleCrisis);
      socket.off('staff_auto_assigned', handleStaffAssigned);
      socket.off('task_assigned', handleTaskAssigned);
    };
  }, [socket, activeIncident]);

  const triggerPanic = async () => {
    if (isSendingSOS) {
      return;
    }

    setIsSendingSOS(true);
    try {
      const response = await axios.post(`${API_URL}/users/panic`, {
        message: `Panic triggered from Guest Dashboard (Room ${user?.room_number || 'Unknown'})`,
        latitude: 40.7128, // Mock GPS
        longitude: -74.0060,
      });
      alert(response.data?.message || 'Panic Alert Sent! Security is on the way.');
    } catch (err) {
      console.error('Failed to trigger panic:', err);
      alert('Unable to send SOS. Please check your connection and try again.');
    } finally {
      setIsSendingSOS(false);
    }
  };

  useGSAP(() => {
    gsap.from('.stagger-item', {
      y: 20,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: 'back.out(1.2)',
      clearProps: 'all',
      force3D: false,
    });

    // Subtly pulsate the panic button
    if (panicRef.current) {
      gsap.to(panicRef.current, {
        scale: 1.05,
        boxShadow: '0 0 30px rgba(239, 68, 68, 0.4)',
        yoyo: true,
        repeat: -1,
        duration: 1.5,
        ease: 'sine.inOut',
        force3D: false,
      });
    }
  }, { scope: containerRef });

  return (
    <Box ref={containerRef} sx={{ maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h1" sx={{ fontSize: '2rem', mb: 1 }} className="stagger-item">
        Hello, {user?.name || 'Guest'}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }} className="stagger-item">
        Your safety is our top priority.
      </Typography>

      {/* Status Banner & AI Plan */}
      {activeIncident ? (
        <Box sx={{ mb: 4 }} className="stagger-item">
          <Alert
            icon={<WarningIcon fontSize="inherit" />}
            severity="error"
            sx={{ mb: 2, borderRadius: 3 }}
            className="glow-red"
            action={
              <Button color="inherit" size="small" onClick={() => navigate('/guest/check-in')}>
                Check-In NOW
              </Button>
            }
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Active {activeIncident.incident_type.toUpperCase()} Emergency</Typography>
            <Typography variant="body2" sx={{ mt: 1, mb: 1, fontWeight: 500, opacity: 0.9 }}>
              {activeIncident.description || 'A fire has been detected.'}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {activeIncident.mass_alert_message || 'Please follow the emergency instructions below.'}
            </Typography>
          </Alert>

          {/* Real-time Responders List */}
          {assignedStaff.length > 0 && (
            <Card className="glass" sx={{ mb: 3, border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 3, background: 'rgba(59, 130, 246, 0.05)' }}>
              <CardContent sx={{ pb: '16px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <SecurityIcon sx={{ mr: 1, color: '#3b82f6' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#60a5fa' }}>
                    Responders Dispatched
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  The following personnel are currently en route to assist you:
                </Typography>
                <List dense sx={{ p: 0 }}>
                  {assignedStaff.map((staff, idx) => (
                    <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <ShieldIcon sx={{ fontSize: 18, color: '#3b82f6' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={staff.name} 
                        secondary={<span style={{ textTransform: 'capitalize', color: 'rgba(255,255,255,0.5)' }}>{staff.role}</span>}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}

          {activeIncident.evacuation_routes && (
            <Card className="glass-strong" sx={{ border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <RunIcon sx={{ mr: 1, color: '#ef4444' }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Safe Exit Plan (AI Generated)</Typography>
                </Box>
                
                {activeIncident.evacuation_routes.guestEmergencyPlan && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="primary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <InfoIcon sx={{ fontSize: 16, mr: 0.5 }} /> YOUR STEPS:
                    </Typography>
                    {activeIncident.evacuation_routes.guestEmergencyPlan.map((step: string, i: number) => (
                      <Typography key={i} variant="body2" sx={{ mb: 0.5 }}>• {step}</Typography>
                    ))}
                  </Box>
                )}

                <Grid container spacing={2}>
                  {activeIncident.evacuation_routes.safeExits && (
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="subtitle2" color="success.main" sx={{ mb: 1 }}>RECOMMENDED EXITS:</Typography>
                      {activeIncident.evacuation_routes.safeExits.map((exit: string, i: number) => (
                        <Typography key={i} variant="caption" sx={{ display: 'block', fontWeight: 'bold' }}>- {exit}</Typography>
                      ))}
                    </Grid>
                  )}
                  {activeIncident.evacuation_routes.tips && (
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="subtitle2" color="warning.main" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <TipIcon sx={{ fontSize: 16, mr: 0.5 }} /> SAFETY TIPS:
                      </Typography>
                      {activeIncident.evacuation_routes.tips.map((tip: string, i: number) => (
                        <Typography key={i} variant="caption" sx={{ display: 'block' }}>• {tip}</Typography>
                      ))}
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          )}
        </Box>
      ) : (
        <Alert
          icon={<CheckCircleIcon fontSize="inherit" />}
          severity="success"
          sx={{ mb: 4, borderRadius: 3, background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80' }}
          className="stagger-item"
        >
          No active emergencies at this property.
        </Alert>
      )}

      {/* Main Panic Button */}
      <Box
        className="stagger-item"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mb: 5
        }}
      >
        <Box sx={{ position: 'relative', width: 200, height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="panic-ring"></div>
          <div className="panic-ring"></div>
          <div className="panic-ring"></div>
          <Button
            ref={panicRef}
            variant="contained"
            color="error"
            onClick={triggerPanic}
            disabled={isSendingSOS}
            sx={{
              width: 150,
              height: 150,
              borderRadius: '50%',
              fontSize: '1.5rem',
              fontWeight: 800,
              zIndex: 2,
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            }}
          >
            {isSendingSOS ? 'SENDING...' : 'SOS'}
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Tap SOS to immediately alert security and responders.
        </Typography>
      </Box>

      {/* Assigned Tasks Section */}
      {tasks.length > 0 && (
        <Box sx={{ mb: 4 }} className="stagger-item">
          <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon sx={{ color: 'var(--accent-green)', fontSize: 20 }} /> Your Emergency Tasks
          </Typography>
          <Stack spacing={1.5}>
            {tasks.map((task) => (
              <Card 
                key={task.id} 
                className="glass-strong" 
                sx={{ 
                  borderLeft: `4px solid ${task.priority === 'urgent' ? '#ef4444' : task.priority === 'high' ? '#f59e0b' : '#3b82f6'}`,
                  borderRadius: 2.5 
                }}
              >
                <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5, color: '#fff' }}>
                    {task.description}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Chip 
                      label={task.status.toUpperCase().replace('_', ' ')} 
                      size="small" 
                      color={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'warning' : 'primary'}
                      sx={{ fontSize: '0.62rem', height: 18, fontWeight: 700 }}
                    />
                    {task.assigned_by_ai && (
                      <Chip 
                        label="AI Assigned" 
                        size="small" 
                        variant="outlined"
                        sx={{ fontSize: '0.62rem', height: 18, borderColor: 'var(--accent-blue)', color: 'var(--accent-blue)', fontWeight: 600 }}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      )}

      {/* Quick Actions Grid */}
      <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 'bold' }} className="stagger-item">
        Quick Actions
      </Typography>
      <Grid container spacing={2} className="stagger-item" sx={{ mb: 4 }}>
        <Grid size={{ xs: 6 }}>
          <Card 
            className="glass" 
            sx={{ height: '100%', cursor: 'pointer', '&:hover': { transform: 'scale(1.02)' }, transition: 'transform 0.2s ease-in-out' }}
            onClick={() => {
              window.location.href = 'tel:+15550199';
            }}
          >
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <IconButton color="secondary" sx={{ mb: 1, backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                <PhoneIcon />
              </IconButton>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Call Security</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Card 
            className="glass" 
            sx={{ height: '100%', cursor: 'pointer', '&:hover': { transform: 'scale(1.02)' }, transition: 'transform 0.2s ease-in-out' }}
            onClick={() => navigate('/guest/chat')}
          >
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <IconButton color="primary" sx={{ mb: 1, backgroundColor: 'rgba(0, 121, 193, 0.1)' }}>
                <SecurityIcon />
              </IconButton>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Radio Chat</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Card 
            className="glass" 
            sx={{ 
              borderColor: 'rgba(239, 68, 68, 0.3)', 
              borderWidth: 1.5,
              cursor: 'pointer',
              '&:hover': { transform: 'scale(1.01)' }, 
              transition: 'transform 0.2s ease-in-out'
            }}
            onClick={() => navigate('/guest/emergency')}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, p: 2 }}>
              <IconButton color="error" sx={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                <ReportIcon />
              </IconButton>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', textAlign: 'left' }}>Report Property Emergency</Typography>
                <Typography variant="caption" color="text.secondary">Select hazard type and alert staff</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Snackbar for Popups */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={6000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <MuiAlert 
          onClose={() => setToastOpen(false)} 
          severity={toastSeverity} 
          sx={{ width: '100%', borderRadius: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
          variant="filled"
        >
          {toastMessage}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
}
