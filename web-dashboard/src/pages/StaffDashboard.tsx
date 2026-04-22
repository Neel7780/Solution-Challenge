import React from 'react';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Groups2, NotificationsActive, RoomService } from '@mui/icons-material';
import Dashboard from './Dashboard';

export default function StaffDashboard() {
  const navigate = useNavigate();

  return (
    <Box>
      <Paper sx={{ mb: 3, p: 2.5, borderRadius: 2.5, border: '1px solid rgba(246, 211, 101, 0.18)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}>
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
              <Chip label="STAFF" size="small" sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.1em', bgcolor: 'rgba(77, 230, 198, 0.14)', color: 'var(--accent-green)' }} />
            </Stack>
            <Typography variant="h4" sx={{ fontSize: '1.4rem', fontWeight: 300 }}>Operations Staff Console</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Streamlined for guest safety updates, facility coordination, and response readiness.</Typography>
          </Box>
          <Stack direction="row" spacing={1.2}>
            <Button startIcon={<Groups2 />} variant="outlined" onClick={() => navigate('/dashboard/users')}>Personnel</Button>
            <Button startIcon={<RoomService />} variant="outlined" onClick={() => navigate('/dashboard/triage')}>Safety Status</Button>
            <Button startIcon={<NotificationsActive />} variant="contained" onClick={() => navigate('/dashboard/notifications')}>Notifications</Button>
          </Stack>
        </Stack>
      </Paper>

      <Dashboard />
    </Box>
  );
}
