import React, { useRef, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Stack,
  IconButton,
  Avatar,
  Divider,
} from '@mui/material';

import {
  Business as PropertyIcon,
  People as PeopleIcon,
  Warning as WarningIcon,
  ArrowForward as ArrowIcon,
  Add as AddIcon,
  AdminPanelSettings as AdminIcon,
  Security as SecurityIcon,
  Person as GuestIcon,
} from '@mui/icons-material';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Tabs,
  Tab,
} from '@mui/material';

import { useSocketStore } from '../store/socketStore';
import { useCrisisStore } from '../store/crisisStore';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useLocationStore, LocationEntry } from '../store/locationStore';
import { getGeoreferencedLatLng, PROPERTY_CONFIG } from './Locations';
import '../assets/map-styles.css';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function OrganizationAdmin() {
  const containerRef = useRef(null);
  const queryClient = useQueryClient();
  const { user, switchContext } = useAuthStore();
  const { socket } = useSocketStore();
  const [activeTab, setActiveTab] = useState<'properties' | 'personnel' | 'tasks' | 'overview'>(
    'overview'
  );
  
  const activeIncident = useCrisisStore((state) => state.activeIncident);

  React.useEffect(() => {
    if (!socket) return;
    const refreshData = () => {
      queryClient.invalidateQueries({ queryKey: ['org-properties'] });
      queryClient.invalidateQueries({ queryKey: ['org-personnel'] });
      queryClient.invalidateQueries({ queryKey: ['org-tasks'] });
    };

    socket.on('crisis_reported', refreshData);
    socket.on('incident_status_update', refreshData);
    socket.on('property_status_update', refreshData);
    socket.on('evacuation_triggered', refreshData);
    socket.on('incident_enriched', refreshData);
    socket.on('user_checkin', refreshData);
    socket.on('task_assigned', refreshData);
    socket.on('task_updated', refreshData);

    return () => {
      socket.off('crisis_reported', refreshData);
      socket.off('incident_status_update', refreshData);
      socket.off('property_status_update', refreshData);
      socket.off('evacuation_triggered', refreshData);
      socket.off('incident_enriched', refreshData);
      socket.off('user_checkin', refreshData);
      socket.off('task_assigned', refreshData);
      socket.off('task_updated', refreshData);
    };
  }, [socket, queryClient]);

  // ── Live Location Store ──
  const locationStore = useLocationStore();
  const allLocations = locationStore.getAll();
  const trackedCount = locationStore.getTrackedCount();
  const alertCount = locationStore.getAlertCount();
  const safeCount = locationStore.getSafeCount();

  // Load locations on mount and poll every 10s as fallback
  const propertyId = user?.property_id || 2;
  React.useEffect(() => {
    locationStore.loadFromAPI(propertyId);
    const interval = setInterval(() => {
      locationStore.loadFromAPI(propertyId);
    }, 10000);
    return () => clearInterval(interval);
  }, [propertyId]);

  // Helper: create styled DivIcon for a personnel/guest marker
  function createPersonnelIcon(entry: LocationEntry, navStatus?: any): L.DivIcon {
    const role = (entry.role || 'guest').toLowerCase();
    const status = navStatus?.status || entry.status || '';
    const initial = entry.name?.charAt(0)?.toUpperCase() || '?';
    const size = role === 'guest' ? 26 : 32;

    let roleClass = 'marker-guest';
    if (role === 'admin' || role === 'org_admin' || role === 'super_admin') roleClass = 'marker-admin';
    else if (role === 'security') roleClass = 'marker-security';
    else if (role === 'staff') roleClass = 'marker-staff';
    else if (role === 'responder') roleClass = 'marker-responder';

    let statusClass = '';
    if (['trapped', 'distressed', 'needs_help'].includes(status)) statusClass = 'marker-sos';
    else if (['safe', 'reached_exit'].includes(status)) statusClass = 'marker-safe';
    else if (status === 'evacuating') statusClass = 'marker-evacuating';

    return L.divIcon({
      className: `${roleClass} ${statusClass}`,
      html: `<div class="crisis-marker">
        <div class="crisis-marker__pulse" style="width:${size + 12}px;height:${size + 12}px;"></div>
        <div class="crisis-marker__dot" style="width:${size}px;height:${size}px;">${initial}</div>
      </div>`,
      iconSize: [size + 12, size + 12],
      iconAnchor: [(size + 12) / 2, (size + 12) / 2],
    });
  }

  // Ensure tasks and personnel load when looking at overview
  React.useEffect(() => {
    if (activeTab === 'overview') {
      queryClient.invalidateQueries({ queryKey: ['org-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['org-personnel'] });
    }
  }, [activeTab]);

  const [openAddProperty, setOpenAddProperty] = useState(false);
  const [openAddPersonnel, setOpenAddPersonnel] = useState(false);
  const [openManagePersonnel, setOpenManagePersonnel] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<any>(null);
  
  // Task state
  const [openAddTask, setOpenAddTask] = useState(false);
  const [openManageTask, setOpenManageTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [newTask, setNewTask] = useState({ 
    propertyId: user?.role === 'admin' ? String(user.property_id || '') : '', 
    assignedTo: '', 
    description: '', 
    priority: 'medium', 
    taskType: 'general' 
  });
  
  const [newProperty, setNewProperty] = useState({ name: '', address: '' });
  const [newPersonnel, setNewPersonnel] = useState({ 
    name: '', email: '', phone: '', role: 'staff', 
    propertyId: user?.role === 'admin' ? String(user.property_id || '') : '', 
    password: '' 
  });

  const [formError, setFormError] = useState('');

  // Fetch properties belonging to this organization
  const { data: properties = [], isLoading: loadingProps } = useQuery({
    queryKey: ['org-properties'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/dashboard/organization/properties`);
      return res.data.properties;
    },
    // We fetch properties always if we need them for the select in personnel modal
  });

  const createPropertyMutation = useMutation({
    mutationFn: (payload: { name: string; address: string }) =>
      axios.post(`${API_URL}/dashboard/organization/properties`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-properties'] });
      setOpenAddProperty(false);
      setNewProperty({ name: '', address: '' });
      setFormError('');
    },
    onError: (error: any) => {
      setFormError(error?.response?.data?.error || 'Failed to create property');
    },
  });

  const onboardPersonnelMutation = useMutation({
    mutationFn: (payload: any) =>
      axios.post(`${API_URL}/users`, {
        ...payload,
        propertyId: payload.propertyId ? Number(payload.propertyId) : undefined
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-personnel'] });
      setOpenAddPersonnel(false);
      setNewPersonnel({ 
        name: '', email: '', phone: '', role: 'staff', 
        propertyId: user?.role === 'admin' ? String(user.property_id || '') : '', 
        password: '' 
      });
      setFormError('');
    },
    onError: (error: any) => {
      setFormError(error?.response?.data?.error || 'Failed to onboard personnel');
    },
  });

  const updatePersonnelMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      axios.patch(`${API_URL}/users/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-personnel'] });
      setOpenManagePersonnel(false);
      setSelectedPersonnel(null);
      setFormError('');
    },
    onError: (error: any) => {
      setFormError(error?.response?.data?.error || 'Failed to update user');
    },
  });

  const deletePersonnelMutation = useMutation({
    mutationFn: (id: number) => axios.delete(`${API_URL}/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-personnel'] });
      setOpenManagePersonnel(false);
      setSelectedPersonnel(null);
      setFormError('');
    },
    onError: (error: any) => {
      setFormError(error?.response?.data?.error || 'Failed to delete user');
    },
  });

  // Fetch personnel belonging to this organization
  const { data: personnel = [], isLoading: loadingPersonnel } = useQuery({
    queryKey: ['org-personnel'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/users`);
      return res.data.users;
    },
    enabled: activeTab === 'personnel' || activeTab === 'tasks' || activeTab === 'overview' || openAddTask || openManageTask,
  });

  // Fetch tasks belonging to this organization
  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['org-tasks'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/tasks`);
      return res.data.tasks;
    },
    enabled: activeTab === 'tasks' || activeTab === 'overview',
  });

  const createTaskMutation = useMutation({
    mutationFn: (payload: any) => axios.post(`${API_URL}/tasks`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-tasks'] });
      setOpenAddTask(false);
      setNewTask({ 
        propertyId: user?.role === 'admin' ? String(user.property_id || '') : '', 
        assignedTo: '', 
        description: '', 
        priority: 'medium', 
        taskType: 'general' 
      });
      setFormError('');
    },
    onError: (error: any) => {
      setFormError(error?.response?.data?.error || 'Failed to assign task');
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      axios.patch(`${API_URL}/tasks/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-tasks'] });
      setOpenManageTask(false);
      setSelectedTask(null);
      setFormError('');
    },
    onError: (error: any) => {
      setFormError(error?.response?.data?.error || 'Failed to update task');
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => axios.delete(`${API_URL}/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-tasks'] });
      setOpenManageTask(false);
      setSelectedTask(null);
      setFormError('');
    },
    onError: (error: any) => {
      setFormError(error?.response?.data?.error || 'Failed to delete task');
    },
  });

  const aiPrioritizeTasksMutation = useMutation({
    mutationFn: () => axios.post(`${API_URL}/tasks/ai-prioritize`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-tasks'] });
    },
    onError: (error: any) => {
      console.error('Failed to auto-sort tasks with AI:', error);
    },
  });

  useGSAP(() => {

    gsap.from('.anim-item', {
      y: 20,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: 'power3.out',
      clearProps: 'all',
    });
  }, { scope: containerRef });

  const getStatusChip = (incidentCount: number) => {
    if (incidentCount > 0) {
      return <Chip label="EMERGENCY" size="small" sx={{ backgroundColor: 'rgba(255, 62, 62, 0.1)', color: 'var(--accent-red)', fontWeight: 700, fontSize: '0.65rem' }} />;
    }
    return <Chip label="OPERATIONAL" size="small" sx={{ backgroundColor: 'rgba(0, 245, 140, 0.1)', color: 'var(--accent-green)', fontWeight: 700, fontSize: '0.65rem' }} />;
  };

  return (
    <Box ref={containerRef}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Box className="anim-item">
          <Typography variant="h2" sx={{ fontSize: '1.5rem', fontWeight: 400 }}>
            {user?.role === 'admin' ? 'Property Administration' : 'Organization Overview'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
            {activeTab === 'properties' 
              ? 'Centralized command for all regional properties' 
              : activeTab === 'personnel' 
              ? (user?.role === 'admin' ? 'Personnel management for your property' : 'Personnel management for entire organization')
              : activeTab === 'overview'
              ? 'Tactical command center & AI verification'
              : 'Emergency task dispatch and tracking log'}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", flexDirection: "row", gap: "16px", alignItems: "center" }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            textColor="inherit"
            indicatorColor="primary"
            sx={{
              minHeight: 36,
              '& .MuiTab-root': { minHeight: 36, py: 0.5, fontSize: '0.75rem', fontWeight: 600 },
            }}
          >
            <Tab label="Overview" value="overview" />
            <Tab label="Properties" value="properties" />
            <Tab label="Personnel" value="personnel" />
            <Tab label="Tasks" value="tasks" />
          </Tabs>

          <Box>
          {activeTab === 'properties' ? (
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              className="anim-item"
              onClick={() => setOpenAddProperty(true)}
              sx={{ borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.75rem' }}
            >
              Add Property
            </Button>
          ) : activeTab === 'personnel' ? (
             <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              className="anim-item"
              onClick={() => setOpenAddPersonnel(true)}
              sx={{ background: 'var(--accent-red)', fontSize: '0.75rem', px: 3 }}
            >
              Onboard Personnel
            </Button>
          ) : activeTab === 'tasks' ? (
             <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              className="anim-item"
              onClick={() => setOpenAddTask(true)}
              sx={{ background: 'var(--accent-blue)', fontSize: '0.75rem', px: 3 }}
            >
              Assign Task
            </Button>
          ) : null}
          </Box>
        </Box>
      </Box>

      {/* Add Property Dialog */}
      <Dialog open={openAddProperty} onClose={() => setOpenAddProperty(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Register New Property</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error" sx={{ fontSize: '0.75rem' }}>{formError}</Alert>}
            <TextField
              label="Property Name"
              placeholder="e.g. West Wing Towers"
              value={newProperty.name}
              onChange={(e) => setNewProperty({ ...newProperty, name: e.target.value })}
              fullWidth
              size="small"
              required
            />
            <TextField
              label="Physical Address"
              placeholder="Full street address"
              value={newProperty.address}
              onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
              fullWidth
              size="small"
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpenAddProperty(false)} color="inherit" size="small">Cancel</Button>
          <Button 
            variant="contained" 
            size="small"
            disabled={createPropertyMutation.isPending || !newProperty.name}
            onClick={() => createPropertyMutation.mutate(newProperty)}
          >
            {createPropertyMutation.isPending ? 'Registering...' : 'Register Property'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Onboard Personnel Dialog */}
      <Dialog open={openAddPersonnel} onClose={() => setOpenAddPersonnel(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Onboard New Personnel</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error" sx={{ fontSize: '0.75rem' }}>{formError}</Alert>}
            <TextField
              label="Full Name"
              value={newPersonnel.name}
              onChange={(e) => setNewPersonnel({ ...newPersonnel, name: e.target.value })}
              fullWidth
              size="small"
              required
            />
            <TextField
              label="Email Address"
              type="email"
              value={newPersonnel.email}
              onChange={(e) => setNewPersonnel({ ...newPersonnel, email: e.target.value })}
              fullWidth
              size="small"
              required
            />
            <TextField
              label="Phone Number"
              value={newPersonnel.phone}
              onChange={(e) => setNewPersonnel({ ...newPersonnel, phone: e.target.value })}
              fullWidth
              size="small"
            />
            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select
                value={newPersonnel.role}
                label="Role"
                onChange={(e) => setNewPersonnel({ ...newPersonnel, role: e.target.value })}
              >
                <MenuItem value="staff">Staff</MenuItem>
                <MenuItem value="security">Security</MenuItem>
                <MenuItem value="admin">Property Admin</MenuItem>
                <MenuItem value="responder">First Responder</MenuItem>
                {user?.role !== 'admin' && (
                  <MenuItem value="org_admin">Organization Admin</MenuItem>
                )}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small" disabled={user?.role === 'admin'}>
              <InputLabel>Assign to Property</InputLabel>
              <Select
                value={newPersonnel.propertyId}
                label="Assign to Property"
                onChange={(e) => setNewPersonnel({ ...newPersonnel, propertyId: e.target.value })}
              >
                {user?.role === 'admin' ? (
                  <MenuItem value={String(user.property_id)}>{user.property_name || 'My Property'}</MenuItem>
                ) : (
                  <>
                    <MenuItem value=""><em>None (Organization Level)</em></MenuItem>
                    {properties.map((p: any) => (
                      <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                    ))}
                  </>
                )}
              </Select>
            </FormControl>
            <TextField
              label="Temporary Password"
              type="text"
              value={newPersonnel.password}
              onChange={(e) => setNewPersonnel({ ...newPersonnel, password: e.target.value })}
              fullWidth
              size="small"
              required
              helperText="Share this with the user"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpenAddPersonnel(false)} color="inherit" size="small">Cancel</Button>
          <Button 
            variant="contained" 
            size="small"
            disabled={onboardPersonnelMutation.isPending || !newPersonnel.name || !newPersonnel.email || !newPersonnel.password}
            onClick={() => onboardPersonnelMutation.mutate(newPersonnel)}
          >
            {onboardPersonnelMutation.isPending ? 'Onboarding...' : 'Onboard User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Personnel Dialog */}
      <Dialog open={openManagePersonnel} onClose={() => {setOpenManagePersonnel(false); setSelectedPersonnel(null);}} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Manage Personnel</DialogTitle>
        <DialogContent>
          {selectedPersonnel && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              {formError && <Alert severity="error" sx={{ fontSize: '0.75rem' }}>{formError}</Alert>}
              <TextField
                label="Full Name"
                value={selectedPersonnel.name}
                onChange={(e) => setSelectedPersonnel({ ...selectedPersonnel, name: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label="Email Address"
                value={selectedPersonnel.email}
                onChange={(e) => setSelectedPersonnel({ ...selectedPersonnel, email: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label="Phone Number"
                value={selectedPersonnel.phone || ''}
                onChange={(e) => setSelectedPersonnel({ ...selectedPersonnel, phone: e.target.value })}
                fullWidth
                size="small"
              />
               <FormControl fullWidth size="small">
                <InputLabel>Role</InputLabel>
                <Select
                  value={selectedPersonnel.role}
                  label="Role"
                  onChange={(e) => setSelectedPersonnel({ ...selectedPersonnel, role: e.target.value })}
                >
                  <MenuItem value="staff">Staff</MenuItem>
                  <MenuItem value="security">Security</MenuItem>
                  <MenuItem value="admin">Property Admin</MenuItem>
                  <MenuItem value="responder">First Responder</MenuItem>
                  {user?.role !== 'admin' && (
                    <MenuItem value="org_admin">Organization Admin</MenuItem>
                  )}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small" disabled={user?.role === 'admin'}>
                <InputLabel>Property Assignment</InputLabel>
                <Select
                  value={selectedPersonnel.property_id || ''}
                  label="Property Assignment"
                  onChange={(e) => setSelectedPersonnel({ ...selectedPersonnel, property_id: e.target.value })}
                >
                  {user?.role === 'admin' ? (
                    <MenuItem value={user?.property_id}>{user?.property_name || 'My Property'}</MenuItem>
                  ) : (
                    <>
                      <MenuItem value=""><em>None (Organization Level)</em></MenuItem>
                      {properties.map((p: any) => (
                        <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                      ))}
                    </>
                  )}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Account Status</InputLabel>
                <Select
                  value={selectedPersonnel.status || 'active'}
                  label="Account Status"
                  onChange={(e) => setSelectedPersonnel({ ...selectedPersonnel, status: e.target.value })}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive / Suspended</MenuItem>
                  <MenuItem value="evacuated">Evacuated (Emergency Mode)</MenuItem>
                </Select>
              </FormControl>
              
              <Divider sx={{ my: 1 }} />
              
              <Box>
                <Typography variant="caption" color="error" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                  Danger Zone
                </Typography>
                <Button 
                  color="error" 
                  variant="outlined" 
                  fullWidth 
                  size="small"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete ${selectedPersonnel.name}? This action cannot be undone.`)) {
                      deletePersonnelMutation.mutate(selectedPersonnel.id);
                    }
                  }}
                  disabled={deletePersonnelMutation.isPending}
                >
                  {deletePersonnelMutation.isPending ? 'Deleting...' : 'Delete User Account'}
                </Button>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => {setOpenManagePersonnel(false); setSelectedPersonnel(null);}} color="inherit" size="small">Cancel</Button>
          <Button 
            variant="contained" 
            size="small"
            disabled={updatePersonnelMutation.isPending || !selectedPersonnel?.name || !selectedPersonnel?.email}
            onClick={() => updatePersonnelMutation.mutate({ 
              id: selectedPersonnel.id, 
              payload: {
                name: selectedPersonnel.name,
                email: selectedPersonnel.email,
                phone: selectedPersonnel.phone,
                role: selectedPersonnel.role,
                propertyId: selectedPersonnel.property_id || null,
                status: selectedPersonnel.status
              } 
            })}
          >
            {updatePersonnelMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>



      {/* Live Safety Stats Priority Overview */}
      <div style={{ display: "flex", flexWrap: "wrap", margin: "-8px", width: "calc(100% + 16px)", marginBottom: "32px" }}>
        <div className="anim-item" style={{ width: "33.333%", padding: "8px" }}>
          <div style={{ padding: "16px", background: "var(--gp-card-bg)", border: "1px solid var(--gp-border)", borderRadius: "1.5rem" }}>
            <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ color: "var(--gp-text-secondary)", fontSize: "0.6rem", textTransform: "uppercase", margin: 0 }}>
                  Total People
                </p>
                <p style={{ fontSize: "1.8rem", fontWeight: 200, textTransform: "uppercase", color: "var(--gp-text-primary)", margin: 0 }}>
                  {personnel.length || 0}
                </p>
              </div>
              <PeopleIcon sx={{ color: 'var(--accent-blue)', opacity: 0.5 }} />
            </div>
          </div>
        </div>
        <div className="anim-item" style={{ width: "33.333%", padding: "8px" }}>
          <div style={{ padding: "16px", background: "var(--gp-card-bg)", border: "1px solid var(--gp-border)", borderRadius: "1.5rem" }}>
            <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ color: "var(--gp-text-secondary)", fontSize: "0.6rem", textTransform: "uppercase", margin: 0 }}>Safety Status (Guests)</p>
                <p style={{ fontSize: "1.8rem", fontWeight: 200, color: activeIncident ? "var(--accent-red)" : "var(--accent-green)", margin: 0 }}>
                  {activeIncident ? `${personnel.filter((p:any) => p.role === 'guest' && p.status === 'active').length} EVACUATING` : 'ALL SAFE'}
                </p>
              </div>
              <GuestIcon sx={{ color: activeIncident ? 'var(--accent-red)' : 'var(--accent-green)', opacity: 0.5 }} />
            </div>
          </div>
        </div>
        <div className="anim-item" style={{ width: "33.333%", padding: "8px" }}>
          <div style={{ padding: "16px", background: "var(--gp-card-bg)", border: "1px solid var(--gp-border)", borderRadius: "1.5rem" }}>
            <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ color: "var(--gp-text-secondary)", fontSize: "0.6rem", textTransform: "uppercase", margin: 0 }}>SOS / Personnel Status</p>
                <p style={{ fontSize: "1.8rem", fontWeight: 200, color: tasks.filter((t:any) => t.priority === 'urgent' && t.status !== 'completed').length > 0 ? '#ef4444' : '#f59e0b', margin: 0 }}>
                  {tasks.filter((t:any) => t.priority === 'urgent' && t.status !== 'completed').length} URGENT
                </p>
              </div>
              <WarningIcon sx={{ color: tasks.filter((t:any) => t.priority === 'urgent' && t.status !== 'completed').length > 0 ? '#ef4444' : '#f59e0b', opacity: 0.5 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Property/Personnel/AI Roster */}
      {activeTab === 'overview' ? (
        <div className="anim-item" style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr', gap: '24px' }}>
          <div style={{ background: '#111', borderRadius: '12px', padding: '24px', border: '1px solid #333' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Tactical Map</h3>
              <Chip label="LIVE SENSORS LINKED" size="small" sx={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 800, borderRadius: '4px' }} />
            </div>
            <div style={{ height: '500px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #222', position: 'relative' }}>
              <MapContainer center={[PROPERTY_CONFIG.ANCHOR_LAT, PROPERTY_CONFIG.ANCHOR_LNG]} zoom={18} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap contributors" />

                {/* Active Incident — use real coordinates */}
                {activeIncident && activeIncident.latitude && activeIncident.longitude && (
                  <Marker
                    position={getGeoreferencedLatLng({ latitude: activeIncident.latitude, longitude: activeIncident.longitude })}
                    icon={L.divIcon({
                      className: '',
                      html: `<div class="marker-incident">
                        <div class="marker-incident__ring marker-incident__ring--outer"></div>
                        <div class="marker-incident__ring"></div>
                        <div class="marker-incident__core">🔥</div>
                      </div>`,
                      iconSize: [64, 64],
                      iconAnchor: [32, 32],
                    })}
                  >
                    <Popup>🔥 EMERGENCY: {activeIncident.incident_type?.toUpperCase() || 'UNKNOWN'}</Popup>
                  </Marker>
                )}

                {/* Live Personnel & Guest Markers from LocationStore */}
                {allLocations.map((entry) => {
                  const pos = getGeoreferencedLatLng({ latitude: entry.latitude, longitude: entry.longitude });
                  const navStatus = locationStore.getNavStatus(entry.userId);
                  const safetyStatus = navStatus?.status || entry.status || 'active';
                  return (
                    <Marker
                      key={`loc-${entry.userId}`}
                      position={pos}
                      icon={createPersonnelIcon(entry, navStatus)}
                    >
                      <Popup>
                        <div style={{ minWidth: '160px' }}>
                          <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{entry.name}</strong>
                          <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: 2 }}>{entry.role.toUpperCase()}{entry.roomNumber ? ` • Rm ${entry.roomNumber}` : ''}</div>
                          <div style={{ marginTop: 6, fontSize: '0.8rem', fontWeight: 700, color: ['trapped','distressed','needs_help'].includes(safetyStatus) ? '#ef4444' : ['safe','reached_exit'].includes(safetyStatus) ? '#22c55e' : '#f59e0b' }}>
                            {safetyStatus.replace(/_/g, ' ').toUpperCase()}
                          </div>
                          {navStatus?.currentWaypoint && <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 2 }}>Node: {navStatus.currentWaypoint}</div>}
                          <div style={{ color: '#64748b', fontSize: '0.7rem', marginTop: 4 }}>{new Date(entry.recordedAt).toLocaleTimeString()}</div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              {/* Live Tracking Status Overlay */}
              <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="map-overlay-panel map-overlay-panel--status">
                  <span className={`map-status-dot ${locationStore.isSocketDriven ? 'map-status-dot--live' : 'map-status-dot--polling'}`}></span>
                  {locationStore.isSocketDriven ? 'LIVE FEED' : 'POLLING'}
                </div>
                <div className="map-overlay-panel" style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="map-personnel-badge map-personnel-badge--tracked">👥 {trackedCount} TRACKED</span>
                  {alertCount > 0 && <span className="map-personnel-badge map-personnel-badge--alert">🚨 {alertCount} ALERT</span>}
                  {safeCount > 0 && <span className="map-personnel-badge map-personnel-badge--safe">✅ {safeCount} SAFE</span>}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '580px' }}>
            {/* Verdict Box */}
            <div style={{ background: '#111', borderRadius: '12px', padding: '20px', border: '1px solid #333', flexShrink: 0 }}>
              <h3 style={{ margin: 0, color: '#ef4444', fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                AI Council Verdict
              </h3>
              {activeIncident ? (
                <div style={{ background: '#000', padding: '12px', borderRadius: '8px', borderLeft: `4px solid ${activeIncident.severity === 'critical' ? '#ef4444' : '#f59e0b'}` }}>
                  <p style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 600 }}>{activeIncident.mass_alert_message}</p>
                  <p style={{ margin: '4px 0 0 0', color: '#ccc', fontSize: '0.85rem' }}>{activeIncident.description}</p>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                    <Chip size="small" label={`SEVERITY: ${activeIncident.severity?.toUpperCase() || 'CRITICAL'}`} sx={{ background: '#333', color: '#fff', borderRadius: '4px', fontSize: '0.7rem' }}/>
                    <Chip size="small" label="AUTHORITIES DISPATCHED" sx={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.7rem' }}/>
                  </div>
                </div>
              ) : (
                <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>Waiting for Backend telemetry...</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>
              {/* Priority Queue (Urgent Tasks / Immediates) */}
              <div style={{ background: '#111', borderRadius: '12px', padding: '20px', border: '1px solid #ef4444', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: 0, color: '#ef4444', fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', animation: 'pulse-bg 1s infinite alternate' }}></span>
                  Priority Queue (Immediates)
                  <Button 
                    size="small" 
                    onClick={() => aiPrioritizeTasksMutation.mutate()}
                    disabled={aiPrioritizeTasksMutation.isPending}
                    sx={{ ml: 'auto', background: 'var(--accent-blue)', color: '#fff', fontSize: '0.65rem', fontWeight: 'bold', '&:hover': { background: '#2563eb' } }}>
                    {aiPrioritizeTasksMutation.isPending ? 'Sorting...' : 'AI Auto-Sort'}
                  </Button>
                </h3>
                <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {tasks.filter((t: any) => t.priority === 'urgent' && t.status !== 'completed').map((task: any, i: number) => (
                    <div key={i} style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong style={{ color: '#ef4444', fontSize: '0.85rem' }}>{task.assigned_to_name || 'UNASSIGNED'}</strong>
                        <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold' }}>URGENT</span>
                      </div>
                      <p style={{ color: '#fff', fontSize: '0.8rem', margin: 0 }}>{task.description}</p>
                    </div>
                  ))}
                  {tasks.filter((t: any) => t.priority === 'urgent' && t.status !== 'completed').length === 0 && (
                    <p style={{ color: '#666', fontSize: '0.85rem', margin: 0 }}>No immediate actions pending.</p>
                  )}
                </div>
              </div>

              {/* Full Live Roster */}
              <div style={{ background: '#111', borderRadius: '12px', padding: '20px', border: '1px solid #333', flex: 1.5, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: 0, color: '#3b82f6', fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  Live Roster & Tracking
                </h3>
                <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {personnel.map((p: any, i: number) => {
                    let statusColor = '#10b981';
                    let statusText = 'SAFE';
                    if (p.role === 'guest') {
                      if (p.status === 'inactive') { statusColor = '#666'; statusText = 'CHECKED OUT'; }
                      else if (activeIncident) { statusColor = '#f59e0b'; statusText = 'EVACUATING'; }
                    } else {
                      statusColor = '#3b82f6'; statusText = 'ACTIVE DUTY';
                      // If they have an active task
                      if (tasks.some((t:any) => t.assigned_to === p.id && t.status !== 'completed')) {
                        statusText = 'ON MISSION';
                        statusColor = '#8b5cf6';
                      }
                    }

                    return (
                      <div key={i} style={{ background: '#000', padding: '8px 12px', borderRadius: '6px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#fff', fontSize: '0.85rem', display: 'block' }}>{p.name}</strong>
                          <span style={{ color: '#888', fontSize: '0.75rem' }}>{p.role.toUpperCase()} {p.room_number ? `• Rm ${p.room_number}` : ''}</span>
                        </div>
                        <Chip size="small" label={statusText} sx={{ background: `rgba(${statusColor === '#ef4444' ? '239,68,68' : statusColor === '#f59e0b' ? '245,158,11' : statusColor === '#10b981' ? '16,185,129' : statusColor === '#8b5cf6' ? '139,92,246' : statusColor === '#3b82f6' ? '59,130,246' : '100,100,100'}, 0.2)`, color: statusColor, fontSize: '0.65rem', height: '20px', fontWeight: 'bold' }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="anim-item" style={{ background: "var(--gp-card-bg)", border: "1px solid var(--gp-border)", borderRadius: "1.5rem", padding: "1.5rem" }}>
          <TableContainer>
            <Table size="small">
            {activeTab === 'properties' ? (
              <>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>PROPERTY NAME</TableCell>
                    <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>STATUS</TableCell>
                    <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>INCIDENTS</TableCell>
                    <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>STAFF</TableCell>
                    <TableCell align="right" sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>ACCESS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingProps ? (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>Retrieving properties...</TableCell></TableRow>
                  ) : properties.map((prop: any) => (
                    <TableRow key={prop.id} hover sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.01) !important' } }}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 400, fontSize: '0.85rem' }}>{prop.name}</Typography>
                        <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{prop.address}</Typography>
                      </TableCell>
                      <TableCell>{getStatusChip(prop.active_incidents || 0)}</TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.85rem', color: prop.active_incidents > 0 ? 'var(--accent-red)' : 'inherit' }}>
                          {prop.active_incidents || 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.85rem' }}>{prop.staff_count || 0}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          endIcon={<ArrowIcon sx={{ fontSize: '10px !important' }} />}
                          onClick={() => switchContext(prop.id)}
                          sx={{ 
                            fontSize: '0.65rem', 
                            py: 0, 
                            height: 24, 
                            borderRadius: 0.5,
                            borderColor: 'rgba(255,255,255,0.1)',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          Enter Dashboard
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {properties.length === 0 && !loadingProps && (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 8, color: 'var(--text-muted)' }}>No properties assigned to this organization.</TableCell></TableRow>
                  )}
                </TableBody>
              </>
            ) : activeTab === 'personnel' ? (
              <>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>USER</TableCell>
                    <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>ROLE</TableCell>
                    <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>PROPERTY</TableCell>
                    <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>STATUS</TableCell>
                    <TableCell align="right" sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>ACTIONS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingPersonnel ? (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>Retrieving personnel...</TableCell></TableRow>
                  ) : personnel.map((person: any) => (
                    <TableRow key={person.id} hover sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.01) !important' } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>{person.name.charAt(0)}</Avatar>
                          <Box>
                            <Typography sx={{ fontWeight: 400, fontSize: '0.85rem' }}>{person.name}</Typography>
                            <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{person.email}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ 
                          display: 'inline-flex', px: 1, py: 0.1, borderRadius: '2px', 
                          backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', 
                          fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase'
                        }}>
                          {person.role}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.85rem' }}>{person.property_name || 'Global'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: person.status === 'active' ? 'var(--accent-green)' : 'var(--text-muted)' }} />
                          <Typography variant="caption" sx={{ color: person.status === 'active' ? 'var(--accent-green)' : 'var(--text-muted)', fontSize: '0.7rem' }}>
                            {person.status?.toUpperCase()}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Button 
                          size="small" 
                          variant="outlined" 
                          sx={{ fontSize: '0.6rem', height: 20 }}
                          onClick={() => {
                            setSelectedPersonnel(person);
                            setOpenManagePersonnel(true);
                          }}
                        >
                          Manage
                        </Button>
                      </TableCell>

                    </TableRow>
                  ))}
                  {personnel.length === 0 && !loadingPersonnel && (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 8, color: 'var(--text-muted)' }}>No personnel found in this organization.</TableCell></TableRow>
                  )}
                </TableBody>
              </>
            ) : (
              <>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>TASK DETAILS</TableCell>
                    <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>ASSIGNED TO</TableCell>
                    <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>ASSIGNED BY</TableCell>
                    <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>PROPERTY</TableCell>
                    <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>PRIORITY</TableCell>
                    <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>STATUS</TableCell>
                    <TableCell align="right" sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>ACTIONS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingTasks ? (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>Retrieving tasks...</TableCell></TableRow>
                  ) : tasks.map((task: any) => (
                    <TableRow key={task.id} hover sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.01) !important' } }}>
                      <TableCell sx={{ maxWidth: 220 }}>
                        <Typography sx={{ fontWeight: 400, fontSize: '0.85rem' }}>{task.description}</Typography>
                        <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                          Type: {task.task_type?.toUpperCase()} • ID: #{task.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>{task.assigned_to_name || 'Unassigned'}</Typography>
                      </TableCell>
                      <TableCell>
                        {task.assigned_by_ai ? (
                          <Chip label="AI SYSTEM" size="small" color="info" sx={{ fontWeight: 700, height: 20, fontSize: '0.55rem', letterSpacing: '0.05em' }} />
                        ) : (
                          <Typography sx={{ fontSize: '0.85rem' }}>{task.assigned_by_name || 'System'}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.85rem' }}>{task.property_name || 'N/A'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={task.priority?.toUpperCase()} 
                          size="small" 
                          color={
                            task.priority === 'urgent' ? 'error' : 
                            task.priority === 'high' ? 'warning' : 
                            task.priority === 'medium' ? 'primary' : 'default'
                          }
                          sx={{ fontWeight: 700, height: 20, fontSize: '0.58rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={task.status?.replace('_', ' ').toUpperCase()} 
                          size="small" 
                          variant="outlined"
                          color={
                            task.status === 'completed' ? 'success' : 
                            task.status === 'in_progress' ? 'info' : 
                            task.status === 'cancelled' ? 'error' : 'default'
                          }
                          sx={{ fontWeight: 600, height: 20, fontSize: '0.58rem' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button 
                          size="small" 
                          variant="outlined" 
                          sx={{ fontSize: '0.6rem', height: 20 }}
                          onClick={() => {
                            setSelectedTask(task);
                            setOpenManageTask(true);
                          }}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tasks.length === 0 && !loadingTasks && (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 8, color: 'var(--text-muted)' }}>No tasks assigned in this organization.</TableCell></TableRow>
                  )}
                </TableBody>
              </>
            )}
          </Table>
        </TableContainer>
      </div>
      )}

      {/* Assign Task Dialog */}
      <Dialog open={openAddTask} onClose={() => setOpenAddTask(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Assign Emergency Task</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error" sx={{ fontSize: '0.75rem' }}>{formError}</Alert>}
            
            <FormControl size="small" fullWidth required disabled={user?.role === 'admin'}>
              <InputLabel>Property</InputLabel>
              <Select
                value={newTask.propertyId}
                label="Property"
                onChange={(e) => setNewTask({ ...newTask, propertyId: e.target.value, assignedTo: '' })}
              >
                {user?.role === 'admin' ? (
                  <MenuItem value={String(user.property_id)}>{user.property_name || 'My Property'}</MenuItem>
                ) : (
                  properties.map((prop: any) => (
                    <MenuItem key={prop.id} value={prop.id}>{prop.name}</MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth required disabled={!newTask.propertyId}>
              <InputLabel>Assign To Personnel</InputLabel>
              <Select
                value={newTask.assignedTo}
                label="Assign To Personnel"
                onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
              >
                {personnel
                  .filter((p: any) => Number(p.property_id) === Number(newTask.propertyId) && ['responder', 'security', 'staff'].includes(p.role))
                  .map((p: any) => (
                    <MenuItem key={p.id} value={p.id}>{p.name} ({p.role.toUpperCase()})</MenuItem>
                  ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={newTask.priority}
                label="Priority"
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              >
                <MenuItem value="low">LOW</MenuItem>
                <MenuItem value="medium">MEDIUM</MenuItem>
                <MenuItem value="high">HIGH</MenuItem>
                <MenuItem value="urgent">URGENT</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Task Description"
              placeholder="Describe instructions for this personnel..."
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              fullWidth
              size="small"
              required
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpenAddTask(false)} color="inherit" size="small">Cancel</Button>
          <Button 
            variant="contained" 
            size="small"
            disabled={createTaskMutation.isPending || !newTask.propertyId || !newTask.assignedTo || !newTask.description}
            onClick={() => createTaskMutation.mutate({
              propertyId: Number(newTask.propertyId),
              assignedTo: Number(newTask.assignedTo),
              priority: newTask.priority,
              description: newTask.description,
              taskType: 'general'
            })}
          >
            {createTaskMutation.isPending ? 'Assigning...' : 'Assign Task'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit / Manage Task Dialog */}
      <Dialog open={openManageTask} onClose={() => { setOpenManageTask(false); setSelectedTask(null); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Manage Emergency Task</DialogTitle>
        <DialogContent>
          {selectedTask && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              {formError && <Alert severity="error" sx={{ fontSize: '0.75rem' }}>{formError}</Alert>}
              
              <Typography variant="caption" color="text.secondary">
                Property: {selectedTask.property_name} • ID: #{selectedTask.id}
              </Typography>

              <FormControl size="small" fullWidth>
                <InputLabel>Assigned To</InputLabel>
                <Select
                  value={selectedTask.assigned_to || ''}
                  label="Assigned To"
                  onChange={(e) => setSelectedTask({ ...selectedTask, assigned_to: e.target.value })}
                >
                  {personnel
                    .filter((p: any) => Number(p.property_id) === Number(selectedTask.property_id) && ['responder', 'security', 'staff'].includes(p.role))
                    .map((p: any) => (
                      <MenuItem key={p.id} value={p.id}>{p.name} ({p.role.toUpperCase()})</MenuItem>
                    ))}
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={selectedTask.priority || 'medium'}
                  label="Priority"
                  onChange={(e) => setSelectedTask({ ...selectedTask, priority: e.target.value })}
                >
                  <MenuItem value="low">LOW</MenuItem>
                  <MenuItem value="medium">MEDIUM</MenuItem>
                  <MenuItem value="high">HIGH</MenuItem>
                  <MenuItem value="urgent">URGENT</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={selectedTask.status || 'pending'}
                  label="Status"
                  onChange={(e) => setSelectedTask({ ...selectedTask, status: e.target.value })}
                >
                  <MenuItem value="pending">PENDING</MenuItem>
                  <MenuItem value="in_progress">IN PROGRESS</MenuItem>
                  <MenuItem value="completed">COMPLETED</MenuItem>
                  <MenuItem value="cancelled">CANCELLED</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Task Description"
                value={selectedTask.description || ''}
                onChange={(e) => setSelectedTask({ ...selectedTask, description: e.target.value })}
                fullWidth
                size="small"
                required
                multiline
                rows={3}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'space-between' }}>
          <Button 
            variant="outlined" 
            color="error" 
            size="small"
            disabled={deleteTaskMutation.isPending}
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this task?')) {
                deleteTaskMutation.mutate(selectedTask.id);
              }
            }}
          >
            Delete
          </Button>
          <Box>
            <Button onClick={() => { setOpenManageTask(false); setSelectedTask(null); }} color="inherit" size="small" sx={{ mr: 1 }}>Cancel</Button>
            <Button 
              variant="contained" 
              size="small"
              disabled={updateTaskMutation.isPending || !selectedTask?.description}
              onClick={() => updateTaskMutation.mutate({
                id: selectedTask.id,
                payload: {
                  assignedTo: Number(selectedTask.assigned_to),
                  priority: selectedTask.priority,
                  status: selectedTask.status,
                  description: selectedTask.description
                }
              })}
            >
              {updateTaskMutation.isPending ? 'Save' : 'Save Changes'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
