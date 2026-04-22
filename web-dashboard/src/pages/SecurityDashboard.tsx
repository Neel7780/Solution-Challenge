import React from 'react';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Security, NotificationsActive, TravelExplore } from '@mui/icons-material';
import Dashboard from './Dashboard';

export default function SecurityDashboard() {
  const navigate = useNavigate();

  return (
    <Box>
      <Paper sx={{ mb: 3, p: 2.5, borderRadius: 2.5, border: '1px solid rgba(246, 211, 101, 0.18)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}>
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
              <Chip label="SECURITY" size="small" sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.1em', bgcolor: 'rgba(246, 211, 101, 0.12)', color: 'var(--accent-orange)' }} />
            </Stack>
            <Typography variant="h4" sx={{ fontSize: '1.4rem', fontWeight: 300 }}>Security Operations Console</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Focused on perimeter monitoring, incident escalation, and tactical visibility.</Typography>
          </Box>
          <Stack direction="row" spacing={1.2}>
            <Button startIcon={<TravelExplore />} variant="outlined" onClick={() => navigate('/dashboard/locations')}>Perimeter Map</Button>
            <Button startIcon={<Security />} variant="outlined" onClick={() => navigate('/dashboard/incidents')}>Active Incidents</Button>
            <Button startIcon={<NotificationsActive />} variant="contained" onClick={() => navigate('/dashboard/notifications')}>Dispatch Alerts</Button>
          </Stack>
        </Stack>
      </Paper>

      <Dashboard />
    </Box>
  );
}
