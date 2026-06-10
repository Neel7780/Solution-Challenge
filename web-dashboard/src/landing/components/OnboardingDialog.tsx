import React, { useState } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  TextField,
  MenuItem,
  Button,
  Grid,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import { CheckCircle, Close as CloseIcon } from '@mui/icons-material';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function OnboardingDialog({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    orgName: '', orgType: 'hotel', address: '',
    contactName: '', contactEmail: '', contactPhone: '',
    expectedCapacity: '', additionalInfo: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API_URL}/platform/request-access`, {
        ...formData,
        expectedCapacity: parseInt(formData.expectedCapacity) || 0,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setFormData({
          orgName: '', orgType: 'hotel', address: '',
          contactName: '', contactEmail: '', contactPhone: '',
          expectedCapacity: '', additionalInfo: '',
        });
      }, 5000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      backgroundColor: '#F0F6F8',
      '& fieldset': { borderColor: '#D9E0E3' },
      '&:hover fieldset': { borderColor: '#A5ABAD' },
      '&.Mui-focused fieldset': { borderColor: '#27B7A5' },
    },
    '& .MuiInputLabel-root': { color: '#A5ABAD' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#27B7A5' },
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            background: '#F0F6F8',
            border: '1px solid #D9E0E3',
            borderRadius: '24px',
            color: '#0C1016',
          },
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'Fraunces, serif' }}>
          Request Access
        </Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pb: 4 }}>
        {success ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircle sx={{ fontSize: 64, color: '#27B7A5', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Request Initiated</Typography>
            <Typography sx={{ color: '#A5ABAD', mt: 1 }}>Check your email for updates.</Typography>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField fullWidth label="Organization Name" required sx={inputSx} value={formData.orgName} onChange={(e) => setFormData({ ...formData, orgName: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select fullWidth label="Type" sx={inputSx} value={formData.orgType} onChange={(e) => setFormData({ ...formData, orgType: e.target.value })}>
                  <MenuItem value="hotel">Hotel</MenuItem>
                  <MenuItem value="mall">Mall</MenuItem>
                  <MenuItem value="hospital">Hospital</MenuItem>
                  <MenuItem value="stadium">Stadium</MenuItem>
                </TextField>
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label="Headquarters Address" multiline rows={2} required sx={inputSx} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Contact Name" required sx={inputSx} value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Contact Email" type="email" required sx={inputSx} value={formData.contactEmail} onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Phone" required sx={inputSx} value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Est. Daily Occupancy" type="number" sx={inputSx} value={formData.expectedCapacity} onChange={(e) => setFormData({ ...formData, expectedCapacity: e.target.value })} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label="Security Protocols" multiline rows={2} sx={inputSx} value={formData.additionalInfo} onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })} />
              </Grid>
            </Grid>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 4, py: 1.5,
                background: '#0C1016', color: '#F0F6F8',
                fontWeight: 600, borderRadius: '999px',
                textTransform: 'none',
                '&:hover': { background: '#1E232C' },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Submit Request'}
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
