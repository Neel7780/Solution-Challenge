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
} from '@mui/material';



const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function OrganizationAdmin() {
  const containerRef = useRef(null);
  const queryClient = useQueryClient();
  const { user, switchContext } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'properties' | 'personnel'>('properties');
  const [openAddProperty, setOpenAddProperty] = useState(false);
  const [openAddPersonnel, setOpenAddPersonnel] = useState(false);
  const [openManagePersonnel, setOpenManagePersonnel] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<any>(null);
  const [newProperty, setNewProperty] = useState({ name: '', address: '' });
  const [newPersonnel, setNewPersonnel] = useState({ 
    name: '', email: '', phone: '', role: 'staff', propertyId: '', password: '' 
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
      setNewPersonnel({ name: '', email: '', phone: '', role: 'staff', propertyId: '', password: '' });
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
    enabled: activeTab === 'personnel',
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
          <Typography variant="h2" sx={{ fontSize: '1.5rem', fontWeight: 400 }}>Organization Overview</Typography>
          <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
            {activeTab === 'properties' ? 'Centralized command for all regional properties' : 'Personnel management for entire organization'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Box sx={{ 
            backgroundColor: 'rgba(255,255,255,0.02)', 
            borderRadius: 1, 
            p: 0.5,
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <Button 
              size="small" 
              onClick={() => setActiveTab('properties')}
              sx={{ 
                fontSize: '0.65rem', px: 2, py: 0.5, minWidth: 0,
                color: activeTab === 'properties' ? '#fff' : 'var(--text-muted)',
                backgroundColor: activeTab === 'properties' ? 'rgba(255,255,255,0.05)' : 'transparent',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' }
              }}
            >
              Properties
            </Button>
            <Button 
              size="small" 
              onClick={() => setActiveTab('personnel')}
              sx={{ 
                fontSize: '0.65rem', px: 2, py: 0.5, minWidth: 0,
                color: activeTab === 'personnel' ? '#fff' : 'var(--text-muted)',
                backgroundColor: activeTab === 'personnel' ? 'rgba(255,255,255,0.05)' : 'transparent',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' }
              }}
            >
              Personnel
            </Button>
          </Box>
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
          ) : (
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
          )}
        </Stack>
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
                <MenuItem value="org_admin">Organization Admin</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Assign to Property</InputLabel>
              <Select
                value={newPersonnel.propertyId}
                label="Assign to Property"
                onChange={(e) => setNewPersonnel({ ...newPersonnel, propertyId: e.target.value })}
              >
                <MenuItem value=""><em>None (Organization Level)</em></MenuItem>
                {properties.map((p: any) => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
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
                  <MenuItem value="org_admin">Organization Admin</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Property Assignment</InputLabel>
                <Select
                  value={selectedPersonnel.property_id || ''}
                  label="Property Assignment"
                  onChange={(e) => setSelectedPersonnel({ ...selectedPersonnel, property_id: e.target.value })}
                >
                  <MenuItem value=""><em>None (Organization Level)</em></MenuItem>
                  {properties.map((p: any) => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
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



      {/* Cross-Property Stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4} className="anim-item">
          <Paper sx={{ p: 2, background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="overline" sx={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>Total Properties</Typography>
                <Typography sx={{ fontSize: '1.8rem', fontWeight: 200 }}>{properties.length}</Typography>
              </Box>
              <PropertyIcon sx={{ color: 'var(--accent-blue)', opacity: 0.5 }} />
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4} className="anim-item">
          <Paper sx={{ p: 2, background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="overline" sx={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>Active Incidents</Typography>
                <Typography sx={{ fontSize: '1.8rem', fontWeight: 200, color: 'var(--accent-red)' }}>
                  {properties.reduce((acc: number, p: any) => acc + (p.active_incidents || 0), 0)}
                </Typography>
              </Box>
              <WarningIcon sx={{ color: 'var(--accent-red)', opacity: 0.5 }} />
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4} className="anim-item">
          <Paper sx={{ p: 2, background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="overline" sx={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>Total Personnel</Typography>
                <Typography sx={{ fontSize: '1.8rem', fontWeight: 200 }}>
                   {personnel.length || properties.reduce((acc: number, p: any) => acc + (p.staff_count || 0), 0)}
                </Typography>
              </Box>
              <PeopleIcon sx={{ color: 'var(--accent-green)', opacity: 0.5 }} />
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Property/Personnel Roster */}
      <Paper className="anim-item" sx={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 1 }}>
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
            ) : (
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
            )}
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
