import React from 'react';
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

export default function Settings() {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Settings
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Property Configuration
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Property Name"
                  defaultValue="Grand Hotel"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  defaultValue="123 Main Street, New York, NY 10001"
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Total Rooms"
                  type="number"
                  defaultValue={250}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Max Capacity"
                  type="number"
                  defaultValue={500}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" startIcon={<SaveIcon />}>
                Save Changes
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Notification Settings
            </Typography>

            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Enable Push Notifications"
              sx={{ mb: 2, display: 'block' }}
            />
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Enable SMS Alerts"
              sx={{ mb: 2, display: 'block' }}
            />
            <FormControlLabel
              control={<Switch />}
              label="Enable Email Notifications"
              sx={{ mb: 2, display: 'block' }}
            />

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Auto-escalation
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Select fullWidth defaultValue="5" size="small">
                  <MenuItem value="1">1 minute</MenuItem>
                  <MenuItem value="5">5 minutes</MenuItem>
                  <MenuItem value="10">10 minutes</MenuItem>
                  <MenuItem value="15">15 minutes</MenuItem>
                </Select>
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 3 }}>
              Changes will take effect immediately for all connected clients.
            </Alert>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Emergency Contacts
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Fire Department"
                  defaultValue="911"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Police"
                  defaultValue="911"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Medical Emergency"
                  defaultValue="911"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Property Security"
                  defaultValue="+1 555-0199"
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
