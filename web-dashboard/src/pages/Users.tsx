import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  InputAdornment,
  Stack,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon 
} from '@mui/icons-material';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface UserRecord {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  role: 'guest' | 'staff' | 'security' | 'admin' | 'responder' | 'super_admin' | 'org_admin';
  room_number?: string;
  status?: string;
  organization_name?: string;
  property_name?: string;
  property_id?: number;
}

export default function Users() {
  const containerRef = useRef(null);
  const queryClient = useQueryClient();
  const { user, isSuperAdmin } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'personnel' | 'organizations'>('personnel');
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    roomNumber: '',
    password: '',
    role: 'guest',
    status: 'active',
    propertyId: String(user?.property_id || 1),
  });

  const canManagePersonnel = isSuperAdmin() || user?.role === 'org_admin';
  const canCreateGuest = ['admin', 'staff', 'security'].includes(user?.role || '');

  const availableRoles = useMemo(() => {
    if (isSuperAdmin()) {
      return ['guest', 'staff', 'security', 'admin', 'responder', 'org_admin', 'super_admin'];
    }
    if (user?.role === 'org_admin') {
      return ['guest', 'staff', 'security', 'admin', 'responder', 'org_admin'];
    }
    return ['guest'];
  }, [user?.role, isSuperAdmin]);

  const { data: users = [], isLoading, isError } = useQuery<UserRecord[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/users`);
      return response.data.users;
    },
  });

  const { data: organizations = [], isLoading: loadingOrgs } = useQuery({
    queryKey: ['platform-organizations'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/platform/organizations`);
      return res.data.organizations;
    },
    enabled: isSuperAdmin() && activeTab === 'organizations',
  });

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const isGuest = formData.role === 'guest';
      const endpoint = isGuest ? `${API_URL}/users/guests` : `${API_URL}/users`;
      
      const payload: Record<string, any> = {
        name: formData.name,
        password: formData.password,
        role: formData.role,
        propertyId: Number(formData.propertyId) || undefined,
        roomNumber: formData.roomNumber || undefined,
      };

      if (formData.email) payload.email = formData.email;
      if (formData.phone) payload.phone = formData.phone;

      return axios.post(endpoint, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setOpenCreateDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      setFormError(error?.response?.data?.error || 'Failed to create user account');
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const payload: Record<string, any> = {
        name: formData.name,
        role: formData.role,
        status: formData.status,
        propertyId: Number(formData.propertyId) || undefined,
        roomNumber: formData.roomNumber || undefined,
      };
      if (formData.email) payload.email = formData.email;
      if (formData.phone) payload.phone = formData.phone;
      if (formData.password) payload.password = formData.password;

      return axios.patch(`${API_URL}/users/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setOpenEditDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      setFormError(error?.response?.data?.error || 'Failed to update user account');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      return axios.delete(`${API_URL}/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      alert(error?.response?.data?.error || 'Failed to delete user');
    },
  });

  const resetForm = () => {
    setFormError('');
    setFormData({
      name: '',
      email: '',
      phone: '',
      roomNumber: '',
      password: '',
      role: 'guest',
      status: 'active',
      propertyId: String(user?.property_id || 1),
    });
    setSelectedUser(null);
  };

  const handleEditOpen = (person: UserRecord) => {
    setSelectedUser(person);
    setFormData({
      name: person.name,
      email: person.email || '',
      phone: person.phone || '',
      roomNumber: person.room_number || '',
      password: '',
      role: person.role,
      status: person.status || 'active',
      propertyId: String(person.property_id || user?.property_id || 1),
    });
    setOpenEditDialog(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      deleteUserMutation.mutate(id);
    }
  };

  useGSAP(() => {
    gsap.from('.table-row', {
      x: -15,
      opacity: 0,
      duration: 0.4,
      stagger: 0.05,
      ease: 'power2.out',
      clearProps: 'all',
      force3D: false,
    });
  }, { scope: containerRef, dependencies: [users.length] });

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      return users;
    }

    return users.filter((u) => {
      const fields = [u.name, u.email || '', u.phone || '', u.room_number || '', u.role];
      return fields.some((f) => f.toLowerCase().includes(q));
    });
  }, [users, searchTerm]);

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'super_admin': return { bg: 'rgba(255, 62, 62, 0.1)', color: 'var(--accent-red)', label: 'Super Admin' };
      case 'org_admin': return { bg: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', label: 'Org Admin' };
      case 'admin': return { bg: 'rgba(251, 146, 60, 0.1)', color: 'var(--accent-orange)', label: 'Admin' };
      case 'security': return { bg: 'rgba(255, 167, 38, 0.1)', color: '#ffa726', label: 'Security' };
      case 'staff': return { bg: 'rgba(0, 245, 140, 0.1)', color: 'var(--accent-green)', label: 'Staff' };
      case 'responder': return { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', label: 'Responder' };
      default: return { bg: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', label: 'Guest' };
    }
  };

  return (
    <Box ref={containerRef}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'flex-end' }}>
        <Box>
          <Typography variant="h2" sx={{ fontSize: '1.5rem', fontWeight: 400 }}>
            {activeTab === 'personnel' ? 'Personnel Management' : 'Organization Directory'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
             {activeTab === 'personnel' 
                ? 'Unified directory of all registered occupants and responders'
                : 'Strategic oversight of all onboarded enterprise entities'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          {isSuperAdmin() && (
            <Box sx={{ 
              backgroundColor: 'rgba(255,255,255,0.02)', 
              borderRadius: 1, 
              p: 0.5,
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
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
              <Button 
                size="small" 
                onClick={() => setActiveTab('organizations')}
                sx={{ 
                  fontSize: '0.65rem', px: 2, py: 0.5, minWidth: 0,
                  color: activeTab === 'organizations' ? '#fff' : 'var(--text-muted)',
                  backgroundColor: activeTab === 'organizations' ? 'rgba(255,255,255,0.05)' : 'transparent',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' }
                }}
              >
                Organizations
              </Button>
            </Box>
          )}
          {activeTab === 'personnel' && (
            <>
              {canManagePersonnel ? (
                <Button 
                  variant="contained" 
                  size="small"
                  startIcon={<AddIcon sx={{ fontSize: 16 }} />} 
                  onClick={() => {
                    resetForm();
                    setOpenCreateDialog(true);
                  }}
                  sx={{ background: 'var(--accent-red)', fontSize: '0.75rem', px: 3 }}
                >
                  Create Personnel
                </Button>
              ) : canCreateGuest ? (
                <Button 
                  variant="contained" 
                  size="small"
                  startIcon={<AddIcon sx={{ fontSize: 16 }} />} 
                  onClick={() => {
                    resetForm();
                    setFormData(prev => ({ ...prev, role: 'guest' }));
                    setOpenCreateDialog(true);
                  }}
                  sx={{ background: 'var(--accent-red)', fontSize: '0.75rem', px: 3 }}
                >
                  Create Guest Account
                </Button>
              ) : null}
            </>
          )}
        </Stack>
      </Box>

      {activeTab === 'personnel' ? (
        <>
          <TextField
            fullWidth
            placeholder="Search personnel by name, email, role, or property..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ 
              mb: 4, 
              '& .MuiOutlinedInput-root': { 
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.04)',
                fontSize: '0.85rem'
              } 
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'var(--text-muted)', fontSize: 18 }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          <Paper
            sx={{
              backgroundColor: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              borderRadius: 1,
            }}
          >
            {isError && (
              <Alert severity="error" sx={{ m: 2, borderRadius: 1 }}>
                Failed to load personnel data. Check backend connectivity.
              </Alert>
            )}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>USER</TableCell>
                    <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>ROLE</TableCell>
                    {isSuperAdmin() && <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>ORGANIZATION / PROPERTY</TableCell>}
                    <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>LOCATION / ROOM</TableCell>
                    <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>PHONE</TableCell>
                    <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>STATUS</TableCell>
                    {canManagePersonnel && <TableCell align="right" sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>ACTIONS</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!isLoading && filteredUsers.map((person) => {
                    const roleStyle = getRoleStyle(person.role);
                    return (
                      <TableRow key={person.id} className="table-row" hover sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.01) !important' } }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', background: roleStyle.bg, color: roleStyle.color, fontWeight: 700 }}>
                              {person.name.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography sx={{ fontWeight: 400, fontSize: '0.85rem' }}>{person.name}</Typography>
                              <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                                {person.email || 'No email provided'}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ 
                            display: 'inline-flex', px: 1, py: 0.1, borderRadius: '2px', 
                            backgroundColor: roleStyle.bg, color: roleStyle.color, 
                            fontSize: '0.6rem', fontWeight: 600 
                          }}>
                            {roleStyle.label.toUpperCase()}
                          </Box>
                        </TableCell>
                        {isSuperAdmin() && (
                          <TableCell>
                            <Typography variant="caption" sx={{ display: 'block', color: 'var(--text-primary)' }}>{person.organization_name || 'N/A'}</Typography>
                            <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{person.property_name || 'Global'}</Typography>
                          </TableCell>
                        )}
                        <TableCell>
                          <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>{person.room_number || '-'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{person.phone || '-'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: person.status === 'active' ? 'var(--accent-green)' : 'var(--accent-orange)' }} />
                            <Typography variant="caption" sx={{ color: person.status === 'active' ? 'var(--accent-green)' : 'var(--accent-orange)', fontWeight: 500, fontSize: '0.7rem' }}>
                              {person.status?.toUpperCase() || 'UNKNOWN'}
                            </Typography>
                          </Box>
                        </TableCell>
                        {canManagePersonnel && (
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                              <Tooltip title="Edit User">
                                <IconButton size="small" onClick={() => handleEditOpen(person)} sx={{ color: 'var(--text-muted)', '&:hover': { color: '#fff' } }}>
                                  <EditIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete User">
                                <IconButton size="small" onClick={() => handleDelete(person.id)} sx={{ color: 'rgba(255,255,255,0.2)', '&:hover': { color: 'var(--accent-red)' } }}>
                                  <DeleteIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={isSuperAdmin() ? 7 : 6} align="center" sx={{ py: 4, color: 'var(--text-muted)' }}>Synchronizing personnel directory...</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      ) : (
        <Paper
          sx={{
            backgroundColor: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            borderRadius: 1,
          }}
        >
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>ORGANIZATION</TableCell>
                  <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>CONTACT EMAIL</TableCell>
                  <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>TIER</TableCell>
                  <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>CREATED</TableCell>
                  <TableCell align="right" sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>STATUS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {organizations.map((org: any) => (
                  <TableRow key={org.id} hover className="table-row" sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.01) !important' } }}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 500, fontSize: '0.85rem' }}>{org.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>{org.contact_email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ 
                        display: 'inline-flex', px: 1, py: 0.1, borderRadius: '2px', 
                        backgroundColor: 'rgba(59, 130, 246, 0.05)', color: 'var(--accent-blue)', 
                        fontSize: '0.6rem', fontWeight: 600, border: '1px solid rgba(59, 130, 246, 0.2)'
                      }}>
                        {org.subscription_tier.toUpperCase()}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>{new Date(org.created_at).toLocaleDateString()}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                        <Box sx={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: org.status === 'active' ? 'var(--accent-green)' : 'var(--text-muted)' }} />
                        <Typography variant="caption" sx={{ color: org.status === 'active' ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: 500, fontSize: '0.7rem' }}>
                          {org.status.toUpperCase()}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {loadingOrgs && (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'var(--text-muted)' }}>Synchronizing organization records...</TableCell></TableRow>
                )}
                {!loadingOrgs && organizations.length === 0 && (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 8, color: 'var(--text-muted)' }}>No organizations onboarded yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Create User Dialog */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{canManagePersonnel ? 'Create Personnel' : 'Create Guest Account'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Mobile Number"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              fullWidth
            />
            {canManagePersonnel && (
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  label="Role"
                  onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value as any }))}
                >
                  {availableRoles.map(role => (
                    <MenuItem key={role} value={role}>
                      {role.replace('_', ' ').toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <TextField
              label="Room Number"
              value={formData.roomNumber}
              onChange={(e) => setFormData((prev) => ({ ...prev, roomNumber: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Temporary Password"
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              fullWidth
              required
              helperText="At least 8 characters"
              type="password"
            />
            {isSuperAdmin() && (
              <TextField
                label="Property ID"
                type="number"
                value={formData.propertyId}
                onChange={(e) => setFormData((prev) => ({ ...prev, propertyId: e.target.value }))}
                fullWidth
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={createUserMutation.isPending}
            onClick={() => {
              setFormError('');
              if (!formData.name || !formData.password) {
                setFormError('Name and temporary password are required');
                return;
              }
              createUserMutation.mutate();
            }}
          >
            {createUserMutation.isPending ? 'Creating...' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User Details</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Mobile Number"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value as any }))}
              >
                {availableRoles.map(role => (
                  <MenuItem key={role} value={role}>
                    {role.replace('_', ' ').toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
              >
                <MenuItem value="active">ACTIVE</MenuItem>
                <MenuItem value="inactive">INACTIVE</MenuItem>
                <MenuItem value="suspended">SUSPENDED</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Room Number"
              value={formData.roomNumber}
              onChange={(e) => setFormData((prev) => ({ ...prev, roomNumber: e.target.value }))}
              fullWidth
            />
            <TextField
              label="New Password (leave blank to keep current)"
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              fullWidth
              type="password"
              helperText="At least 8 characters if provided"
            />
            {isSuperAdmin() && (
              <TextField
                label="Property ID"
                type="number"
                value={formData.propertyId}
                onChange={(e) => setFormData((prev) => ({ ...prev, propertyId: e.target.value }))}
                fullWidth
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={updateUserMutation.isPending}
            onClick={() => {
              if (selectedUser) {
                updateUserMutation.mutate(selectedUser.id);
              }
            }}
          >
            {updateUserMutation.isPending ? 'Updating...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
