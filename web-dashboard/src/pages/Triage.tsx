import React, { useMemo, useRef, useState } from 'react';
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
  Avatar,
  IconButton,
  Button,
  Menu,
  MenuItem,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  CheckCircle as SafeIcon,
  Warning as DistressedIcon,
  Help as HelpIcon,
  Search as MissingIcon,
  Message as MessageIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { TriageData } from '../types';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface TriageCardProps {
  title: string;
  count: number;
  icon: React.ElementType;
  color: string;
}

const TriageCard = ({ title, count, icon: Icon, color }: TriageCardProps) => (
  <Paper
    className="triage-card"
    sx={{
      p: 3,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      borderLeft: `4px solid ${color}`,
      position: 'relative',
      overflow: 'hidden'
      ,backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border-medium)',
      boxShadow: 'var(--shadow-soft)',
    }}
  >
    <Box sx={{ p: 2, borderRadius: 2, background: alpha(color, 0.1) }}>
      <Icon sx={{ fontSize: 36, color }} />
    </Box>
    <Box>
      <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff' }}>
        {count}
      </Typography>
    </Box>
    <Box sx={{ position: 'absolute', right: -20, top: -20, opacity: 0.05, transform: 'scale(3)' }}>
      <Icon sx={{ color }} />
    </Box>
  </Paper>
);

export default function Triage() {
  const containerRef = useRef(null);
  const { user, contexts } = useAuthStore();
  const propertyId = user?.property_id || contexts[0]?.propertyId || 2;

  const { data: triageData } = useQuery<TriageData>({
    queryKey: ['triageData', propertyId],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/dashboard/triage/${propertyId}`);
      return res.data.triage;
    },
    enabled: Boolean(propertyId),
    refetchInterval: 10000,
  });

  const queryClient = useQueryClient();

  const { data: safetyRosterResponse } = useQuery({
    queryKey: ['safety-roster', propertyId],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/crisis/property/${propertyId}/safety-roster`);
      return res.data;
    },
    enabled: Boolean(propertyId),
    refetchInterval: 5000,
  });

  const safetyRoster = safetyRosterResponse?.occupants || [];
  const activeIncidentId = safetyRosterResponse?.incidentId;

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUserForStatus, setSelectedUserForStatus] = useState<any>(null);

  const handleStatusMenuOpen = (event: React.MouseEvent<HTMLElement>, userItem: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedUserForStatus(userItem);
  };

  const handleStatusMenuClose = () => {
    setAnchorEl(null);
    setSelectedUserForStatus(null);
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: number; status: string }) => {
      return axios.post(`${API_URL}/users/checkin`, {
        userId,
        status,
        incidentId: activeIncidentId || 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-roster', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['triageData', propertyId] });
    },
  });

  const handleStatusUpdate = (status: string) => {
    if (selectedUserForStatus) {
      updateStatusMutation.mutate({
        userId: selectedUserForStatus.id,
        status,
      });
    }
    handleStatusMenuClose();
  };

  useGSAP(() => {
    gsap.from('.triage-card', {
      scale: 0.95,
      y: 15,
      opacity: 0,
      duration: 0.5,
      stagger: 0.1,
      ease: 'back.out(1.2)',
      clearProps: 'all',
      force3D: false,
    });
    gsap.from('.table-row', {
      x: -15,
      opacity: 0,
      duration: 0.4,
      delay: 0.4,
      stagger: 0.05,
      ease: 'power2.out',
      clearProps: 'all',
      force3D: false,
    });
  }, { scope: containerRef });

  const triageGroups = [
    { title: 'Safe', count: triageData?.safe_count || 0, icon: SafeIcon, color: '#22c55e' },
    { title: 'Distressed', count: triageData?.distressed_count || 0, icon: DistressedIcon, color: '#f59e0b' },
    { title: 'Needs Help', count: triageData?.needs_help_count || 0, icon: HelpIcon, color: '#ef4444' },
    { title: 'Missing/Unchecked', count: (triageData?.missing_count || 0) + (triageData?.unchecked || 0), icon: MissingIcon, color: '#64748b' },
  ];

  const users = useMemo(() => {
    return safetyRoster.map((item: any) => ({
      id: item.id,
      name: item.name,
      room: item.room_number || item.zone_name || '-',
      status: item.safety_status || 'missing',
      time: item.last_seen ? new Date(item.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
      role: item.role,
      latitude: item.latitude,
      longitude: item.longitude,
    }));
  }, [safetyRoster]);

  const exportToCSV = () => {
    const headers = ['Name', 'Location/Room', 'Role', 'Safety Status', 'Last Updated', 'Latitude', 'Longitude'];
    const csvContent = [
      headers.join(','),
      ...users.map((u: any) => [
        `"${u.name}"`,
        `"${u.room}"`,
        `"${u.role}"`,
        `"${u.status.toUpperCase()}"`,
        `"${u.time}"`,
        u.latitude || '',
        u.longitude || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `triage_roster_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusChip = (status: string) => {
    const config: Record<string, { color: 'success' | 'warning' | 'error' | 'default'; label: string }> = {
      safe: { color: 'success', label: 'SAFE' },
      distressed: { color: 'warning', label: 'DISTRESSED' },
      needs_help: { color: 'error', label: 'NEEDS HELP' },
      missing: { color: 'default', label: 'MISSING' },
    };
    const conf = config[status] || config.missing;
    return <Chip label={conf.label} color={conf.color} size="small" sx={{ fontWeight: 700 }} />;
  };

  return (
    <Box ref={containerRef}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'center' }}>
        <Typography variant="h2" sx={{ fontSize: '2rem' }}>Triage & Safety Tracking</Typography>
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={exportToCSV}
          disabled={users.length === 0}
        >
          Export List
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {triageGroups.map((group) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={group.title}>
            <TriageCard {...group} />
          </Grid>
        ))}
      </Grid>

      <Paper
        sx={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        <Box sx={{ p: 3, borderBottom: '1px solid var(--border-subtle)' }}>
          <Typography variant="h6">Live Safety & Accountability Roster</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Occupant / Personnel</TableCell>
                <TableCell>Location / Room</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Safety Status</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user: any) => (
                <TableRow key={user.id} className="table-row">
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>{user.name.charAt(0)}</Avatar>
                      <Typography sx={{ fontWeight: 500 }}>{user.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{user.room}</TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: user.role === 'staff' ? '#3b82f6' : '#94a3b8' }}>
                      {user.role}
                    </Typography>
                  </TableCell>
                  <TableCell>{getStatusChip(user.status)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{user.time}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <IconButton 
                        size="small" 
                        sx={{ color: 'var(--accent-gold)' }} 
                        onClick={(e) => handleStatusMenuOpen(e, user)}
                        title="Update Safety Status"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" sx={{ color: '#3b82f6' }} title={user.latitude && user.longitude ? `${user.latitude}, ${user.longitude}` : 'No GPS'}>
                        <MessageIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>No safety roster data available.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleStatusMenuClose}
        slotProps={{
          paper: {
            sx: {
              background: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
            }
          }
        }}
      >
        <Typography variant="overline" sx={{ px: 2, py: 0.5, display: 'block', color: 'text.secondary', fontSize: '0.65rem', fontWeight: 700 }}>
          Change Status
        </Typography>
        <MenuItem onClick={() => handleStatusUpdate('safe')} sx={{ gap: 1.5 }}>
          <SafeIcon sx={{ color: '#22c55e', fontSize: 20 }} />
          <Typography variant="body2">Safe</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleStatusUpdate('distressed')} sx={{ gap: 1.5 }}>
          <DistressedIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
          <Typography variant="body2">Distressed</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleStatusUpdate('needs_help')} sx={{ gap: 1.5 }}>
          <HelpIcon sx={{ color: '#ef4444', fontSize: 20 }} />
          <Typography variant="body2">Needs Help</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleStatusUpdate('missing')} sx={{ gap: 1.5 }}>
          <MissingIcon sx={{ color: '#64748b', fontSize: 20 }} />
          <Typography variant="body2">Missing</Typography>
        </MenuItem>
      </Menu>
    </Box>
  );
}
