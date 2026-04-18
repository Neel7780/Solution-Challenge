import React, { useMemo, useRef } from 'react';
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
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  CheckCircle as SafeIcon,
  Warning as DistressedIcon,
  Help as HelpIcon,
  Search as MissingIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
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
      ,backgroundColor: 'rgba(18, 18, 26, 0.98)',
      border: '1px solid var(--border-medium)',
      boxShadow: 'var(--shadow-card)',
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
  const { user } = useAuthStore();
  const propertyId = user?.property_id || 1;

  const { data: triageData } = useQuery<TriageData>({
    queryKey: ['triageData'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/dashboard/triage/${propertyId}`);
      return res.data.triage;
    },
    enabled: Boolean(propertyId),
    refetchInterval: 10000,
  });

  const { data: activeUsers = [] } = useQuery<any[]>({
    queryKey: ['active-users', propertyId],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/locations/active-users/${propertyId}`);
      return res.data.locations;
    },
    enabled: Boolean(propertyId),
    refetchInterval: 10000,
  });

  useGSAP(() => {
    gsap.from('.triage-card', {
      scale: 0.9,
      y: 30,
      opacity: 0,
      duration: 0.5,
      stagger: 0.1,
      ease: 'back.out(1.5)',
    });
    gsap.from('.table-row', {
      x: -20,
      opacity: 0,
      duration: 0.4,
      delay: 0.4,
      stagger: 0.05,
      ease: 'power2.out',
    });
  }, { scope: containerRef });

  const triageGroups = [
    { title: 'Safe', count: triageData?.safe_count || 0, icon: SafeIcon, color: '#22c55e' },
    { title: 'Distressed', count: triageData?.distressed_count || 0, icon: DistressedIcon, color: '#f59e0b' },
    { title: 'Needs Help', count: triageData?.needs_help_count || 0, icon: HelpIcon, color: '#ef4444' },
    { title: 'Missing/Unchecked', count: (triageData?.missing_count || 0) + (triageData?.unchecked || 0), icon: MissingIcon, color: '#64748b' },
  ];

  const users = useMemo(() => {
    return activeUsers.map((item: any) => ({
      id: item.id,
      name: item.name,
      room: item.room_number || item.zone_name || '-',
      status: item.user_status || 'safe',
      time: item.recorded_at ? new Date(item.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
      role: item.role,
      latitude: item.latitude,
      longitude: item.longitude,
    }));
  }, [activeUsers]);

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
        <Button variant="outlined" color="primary">Export List</Button>
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
          backgroundColor: 'rgba(18, 18, 26, 0.98)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <Box sx={{ p: 3, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Typography variant="h6">Live Personnel Roster</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Personnel</TableCell>
                <TableCell>Location / Room</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Safety Status</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
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
                    <IconButton size="small" sx={{ color: '#3b82f6' }} title={user.latitude && user.longitude ? `${user.latitude}, ${user.longitude}` : 'No GPS'}>
                      <MessageIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>No active personnel locations available.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
