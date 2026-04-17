import React, { useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Grid,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export default function Settings() {
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.from('.anim-panel', {
      y: 30,
      opacity: 0,
      duration: 0.6,
      stagger: 0.2,
      ease: 'power3.out',
    });
  }, { scope: containerRef });

  return (
    <Box ref={containerRef}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" sx={{ fontSize: '2rem' }}>Command Center Settings</Typography>
      </Box>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper className="glass anim-panel" sx={{ p: 4, mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 4 }}>Property Configuration</Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Property Name" defaultValue="Grand Hotel" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Address" defaultValue="123 Main Street, New York, NY 10001" multiline rows={2} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Total Rooms" type="number" defaultValue={250} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Max Capacity" type="number" defaultValue={500} />
              </Grid>
            </Grid>
          </Paper>

          <Paper className="glass anim-panel" sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ mb: 4 }}>Emergency Direct Lines</Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Fire Department" defaultValue="911" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Police Dispatch" defaultValue="911" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Medical Emergency" defaultValue="911" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Internal Security Desk" defaultValue="+1 555-0199" color="primary" />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper className="glass anim-panel" sx={{ p: 4, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 4 }}>Automated Responses</Typography>

            <Box sx={{ mb: 4 }}>
              <FormControlLabel control={<Switch defaultChecked color="success" />} label={<Typography sx={{ fontWeight: 500 }}>Auto-Alert Security on Panic</Typography>} sx={{ mb: 2, display: 'flex' }} />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3, ml: 4, mt: -2 }}>Immediately notifies all security personnel via push and SMS when a guest triggers the SOS button.</Typography>

              <FormControlLabel control={<Switch defaultChecked color="success" />} label={<Typography sx={{ fontWeight: 500 }}>Auto-Ping Unchecked Guests</Typography>} sx={{ mb: 2, display: 'flex' }} />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3, ml: 4, mt: -2 }}>Sends an automated notification asking for status if a guest hasn't checked in 5 mins after a crisis starts.</Typography>
            </Box>

            <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.06)' }} />

            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>Escalation Protocol Delay</Typography>
            <Select fullWidth defaultValue="5" sx={{ mb: 3 }}>
              <MenuItem value="0">Immediate Dispatch (0 min)</MenuItem>
              <MenuItem value="1">1 minute evaluation time</MenuItem>
              <MenuItem value="5">5 minutes evaluation time</MenuItem>
              <MenuItem value="10">10 minutes evaluation time</MenuItem>
            </Select>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 4 }}>
              Time before auto-contacting external emergency services on unhandled critical events.
            </Typography>

            <Alert severity="info" sx={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', '& .MuiAlert-icon': { color: '#60a5fa' } }}>
              Configuration changes take effect immediately across all active instances.
            </Alert>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ position: 'fixed', bottom: 32, right: 32, zIndex: 100 }}>
        <Button variant="contained" color="primary" size="large" startIcon={<SaveIcon />} sx={{ px: 4, py: 1.5, borderRadius: '50px', boxShadow: '0 10px 30px rgba(239, 68, 68, 0.4)' }}>
          Save Configuration
        </Button>
      </Box>
    </Box>
  );
}
