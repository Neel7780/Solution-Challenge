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
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
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
  role: 'guest' | 'staff' | 'security' | 'admin' | 'responder';
  room_number?: string;
  status?: string;
}

export default function Users() {
  const containerRef = useRef(null);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [openCreateGuest, setOpenCreateGuest] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    roomNumber: '',
    password: '',
    propertyId: String(user?.property_id || 1),
  });

  const canCreateGuest = ['admin', 'staff', 'security'].includes(user?.role || '');

  const { data: users = [], isLoading, isError } = useQuery<UserRecord[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/users`);
      return response.data.users;
    },
  });

  const createGuestMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name: formData.name,
        password: formData.password,
        roomNumber: formData.roomNumber || undefined,
        propertyId: Number(formData.propertyId) || undefined,
      };

      if (formData.email) payload.email = formData.email;
      if (formData.phone) payload.phone = formData.phone;

      return axios.post(`${API_URL}/users/guests`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setOpenCreateGuest(false);
      setFormError('');
      setFormData({
        name: '',
        email: '',
        phone: '',
        roomNumber: '',
        password: '',
        propertyId: String(user?.property_id || 1),
      });
    },
    onError: (error: any) => {
      setFormError(error?.response?.data?.error || 'Failed to create guest account');
    },
  });

  useGSAP(() => {
    gsap.from('.table-row', {
      x: -20,
      opacity: 0,
      duration: 0.4,
      stagger: 0.05,
      ease: 'power2.out',
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
      case 'admin': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', label: 'Admin' };
      case 'security': return { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', label: 'Security' };
      case 'staff': return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', label: 'Staff' };
      default: return { bg: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', label: 'Guest' };
    }
  };

  return (
    <Box ref={containerRef}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h2" sx={{ fontSize: '2rem' }}>
          Personnel Management
        </Typography>
        {canCreateGuest && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreateGuest(true)}>
            Create Guest Account
          </Button>
        )}
      </Box>

      <TextField
        fullWidth
        placeholder="Search users by name, email, or room..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 4, '& .MuiOutlinedInput-root': { background: 'rgba(255,255,255,0.02)' } }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          },
        }}
      />

      <Paper
        sx={{
          backgroundColor: 'rgba(18, 18, 26, 0.98)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {isError && (
          <Alert severity="error" sx={{ m: 2 }}>
            Failed to load users.
          </Alert>
        )}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Room</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!isLoading && filteredUsers.map((user) => {
                const roleStyle = getRoleStyle(user.role);
                return (
                  <TableRow key={user.id} className="table-row" hover sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ background: roleStyle.bg, color: roleStyle.color, fontWeight: 700 }}>
                          {user.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 'bold', color: 'text.primary' }}>{user.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.email || user.phone || 'No contact'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={roleStyle.label}
                        sx={{ background: roleStyle.bg, color: roleStyle.color, fontWeight: 700 }}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.room_number || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.phone || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.status}
                        variant="outlined"
                        color={user.status === 'active' ? 'success' : 'warning'}
                        size="small"
                        sx={{ fontWeight: 600, textTransform: 'uppercase' }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5}>Loading users...</TableCell>
                </TableRow>
              )}
              {!isLoading && filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>No users found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={openCreateGuest} onClose={() => setOpenCreateGuest(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Guest Account</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Guest Name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Email (optional)"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Mobile Number (optional)"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              fullWidth
            />
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
            />
            <TextField
              label="Property ID"
              type="number"
              value={formData.propertyId}
              onChange={(e) => setFormData((prev) => ({ ...prev, propertyId: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setOpenCreateGuest(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={createGuestMutation.isPending}
            onClick={() => {
              setFormError('');
              if (!formData.name || !formData.password) {
                setFormError('Name and temporary password are required');
                return;
              }
              if (!formData.email && !formData.phone) {
                setFormError('Provide either email or mobile number');
                return;
              }
              createGuestMutation.mutate();
            }}
          >
            {createGuestMutation.isPending ? 'Creating...' : 'Create Guest'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
