import React, { useRef, useState } from 'react';
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
  Stack,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function Settings() {
  const containerRef = useRef(null);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const propertyId = user?.property_id || 1;
  const [propertyName, setPropertyName] = useState('');
  const [address, setAddress] = useState('');
  const [floorPlanData, setFloorPlanData] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [propertyMsg, setPropertyMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { isLoading: loadingSettings } = useQuery({
    queryKey: ['property-settings', propertyId],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/dashboard/settings/${propertyId}`);
      const property = response.data.property;
      setPropertyName(property.name || '');
      setAddress(property.address || '');
      setFloorPlanData(property.floor_plan_data ? JSON.stringify(property.floor_plan_data, null, 2) : '');
      return property;
    },
    enabled: Boolean(propertyId),
  });

  const savePropertyMutation = useMutation({
    mutationFn: async () => {
      const parsedFloorPlan = floorPlanData.trim() ? JSON.parse(floorPlanData) : null;
      return axios.patch(`${API_URL}/dashboard/settings/${propertyId}`, {
        name: propertyName,
        address,
        floorPlanData: parsedFloorPlan,
      });
    },
    onSuccess: (response) => {
      setPropertyMsg({ type: 'success', text: response.data?.message || 'Property settings saved.' });
      queryClient.invalidateQueries({ queryKey: ['property-settings', propertyId] });
    },
    onError: (error: any) => {
      setPropertyMsg({ type: 'error', text: error?.response?.data?.error || 'Failed to save property settings.' });
    },
  });

  useGSAP(() => {
    gsap.from('.anim-panel', {
      y: 30,
      opacity: 0,
      duration: 0.6,
      stagger: 0.2,
      ease: 'power3.out',
    });
  }, { scope: containerRef });

  const handleChangePassword = async () => {
    setPasswordMsg(null);

    if (!currentPassword || !newPassword) {
      setPasswordMsg({ type: 'error', text: 'Current password and new password are required.' });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setSavingPassword(true);
    try {
      const response = await axios.patch(`${API_URL}/users/me/password`, {
        currentPassword,
        newPassword,
      });

      setPasswordMsg({ type: 'success', text: response.data?.message || 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setPasswordMsg({ type: 'error', text: error?.response?.data?.error || 'Failed to change password.' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveProperty = async () => {
    setPropertyMsg(null);
    try {
      if (floorPlanData.trim()) {
        JSON.parse(floorPlanData);
      }
    } catch {
      setPropertyMsg({ type: 'error', text: 'Floor plan data must be valid JSON.' });
      return;
    }

    savePropertyMutation.mutate();
  };

  return (
    <Box ref={containerRef}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" sx={{ fontSize: '2rem' }}>Command Center Settings</Typography>
      </Box>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper
            className="anim-panel"
            sx={{
              p: 4,
              mb: 4,
              backgroundColor: 'rgba(18, 18, 26, 0.98)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <Typography variant="h6" sx={{ mb: 4 }}>Property Configuration</Typography>

            {propertyMsg && <Alert severity={propertyMsg.type} sx={{ mb: 3 }}>{propertyMsg.text}</Alert>}

            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Property Name" value={propertyName} onChange={(e) => setPropertyName(e.target.value)} disabled={loadingSettings} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Address" value={address} onChange={(e) => setAddress(e.target.value)} multiline rows={2} disabled={loadingSettings} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Total Rooms" type="number" defaultValue={250} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Max Capacity" type="number" defaultValue={500} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Floor Plan Data (JSON)"
                  value={floorPlanData}
                  onChange={(e) => setFloorPlanData(e.target.value)}
                  multiline
                  rows={6}
                  helperText="Optional JSON for future map/floor plan rendering"
                  disabled={loadingSettings}
                />
              </Grid>
            </Grid>
          </Paper>

          <Paper
            className="anim-panel"
            sx={{
              p: 4,
              backgroundColor: 'rgba(18, 18, 26, 0.98)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
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
          <Paper
            className="anim-panel"
            sx={{
              p: 4,
              height: '100%',
              backgroundColor: 'rgba(18, 18, 26, 0.98)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
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

            <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.06)' }} />

            <Typography variant="h6" sx={{ mb: 2 }}>Account Security</Typography>
            <Stack spacing={2}>
              {passwordMsg && <Alert severity={passwordMsg.type}>{passwordMsg.text}</Alert>}
              <TextField
                fullWidth
                type="password"
                label="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <TextField
                fullWidth
                type="password"
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                helperText="Minimum 8 characters"
              />
              <TextField
                fullWidth
                type="password"
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <Button
                variant="contained"
                onClick={handleChangePassword}
                disabled={savingPassword}
              >
                {savingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ position: 'fixed', bottom: 32, right: 32, zIndex: 100 }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<SaveIcon />}
          onClick={handleSaveProperty}
          disabled={savePropertyMutation.isPending}
          sx={{ px: 4, py: 1.5, borderRadius: '50px', boxShadow: '0 10px 30px rgba(239, 68, 68, 0.4)' }}
        >
          {savePropertyMutation.isPending ? 'Saving...' : 'Save Configuration'}
        </Button>
      </Box>
    </Box>
  );
}
