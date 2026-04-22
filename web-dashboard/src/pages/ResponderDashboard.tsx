import React from 'react';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { LocalHospital, NotificationsActive, Route } from '@mui/icons-material';
import Dashboard from './Dashboard';

export default function ResponderDashboard() {
  const navigate = useNavigate();

  return (
    <Box>
      <Paper sx={{ mb: 3, p: 2.5, borderRadius: 2.5, border: '1px solid rgba(246, 211, 101, 0.18)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}>
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
              <Chip label="RESPONDER" size="small" sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.1em', bgcolor: 'rgba(255, 92, 92, 0.12)', color: 'var(--accent-red)' }} />
            </Stack>
            <Typography variant="h4" sx={{ fontSize: '1.4rem', fontWeight: 300 }}>Field Response Console</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Prioritized for triage actions, dispatch routing, and active emergency coordination.</Typography>
          </Box>
          <Stack direction="row" spacing={1.2}>
            <Button startIcon={<Route />} variant="outlined" onClick={() => navigate('/dashboard/locations')}>Live Map</Button>
            <Button startIcon={<LocalHospital />} variant="outlined" onClick={() => navigate('/dashboard/triage')}>Triage Queue</Button>
            <Button startIcon={<NotificationsActive />} variant="contained" onClick={() => navigate('/dashboard/notifications')}>Alerts</Button>
          </Stack>
        </Stack>
      </Paper>

      <Dashboard />
    </Box>
  );
}
