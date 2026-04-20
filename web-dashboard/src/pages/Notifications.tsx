import React, { useRef, useState } from 'react';
import {
  Alert,
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  FormGroup,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import {
  Send as SendIcon,
  PhoneIphone as PhoneIcon,
  Sms as SmsIcon,
  Email as EmailIcon,
  CircleNotifications as AppIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface NotificationRecord {
  id: number;
  message: string;
  channel: string;
  status: string;
  created_at: string;
  sent_at?: string | null;
  incident_type?: string | null;
}

export default function Notifications() {
  const containerRef = useRef(null);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const propertyId = user?.property_id || 1;

  const [channels, setChannels] = useState<{ [key: string]: boolean }>({
    push: true,
    sms: false,
    email: false,
    inApp: true
  });

  const { data: history = [], isLoading: historyLoading, isError: historyError } = useQuery<NotificationRecord[]>({
    queryKey: ['notification-history', propertyId],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/notifications/history/${propertyId}`);
      return response.data.notifications;
    },
    enabled: Boolean(propertyId),
    refetchInterval: 15000,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      return axios.post(`${API_URL}/notifications/mass`, {
        propertyId,
        message,
        channels: Object.keys(channels).filter((k) => channels[k]),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-history', propertyId] });
      setMessage('');
    },
  });

  useGSAP(() => {
    gsap.from('.anim-panel', {
      y: 20,
      opacity: 0,
      duration: 0.6,
      stagger: 0.2,
      ease: 'power3.out',
      clearProps: 'all',
      force3D: false,
    });
  }, { scope: containerRef });

  const handleSend = async () => {
    setIsSubmitting(true);
    try {
      const result = await sendMutation.mutateAsync();
      const warnings = result?.data?.warnings;
      if (Array.isArray(warnings) && warnings.length > 0) {
        alert(`Broadcast sent with warnings:\n- ${warnings.join('\n- ')}`);
      } else {
        alert('Notification broadcast sent successfully.');
      }
    } catch (err: any) {
      console.error(err);
      const serverError = err?.response?.data?.error;
      alert(serverError ? `Unable to send broadcast: ${serverError}` : 'Unable to send broadcast. Please check the backend connection and try again.');
    } finally {
      setIsSubmitting(false);
      setOpenConfirm(false);
    }
  };

  return (
    <Box ref={containerRef}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" sx={{ fontSize: '2rem' }}>Broadcast Center</Typography>
      </Box>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper
            className="anim-panel"
            sx={{
              p: 4,
              backgroundColor: 'rgba(18, 18, 26, 0.98)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <Typography variant="h6" sx={{ mb: 3 }}>Compose Mass Alert</Typography>
            
            <TextField
              fullWidth
              multiline
              rows={5}
              placeholder="Enter mass notification message to all personnel and guests..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              sx={{ mb: 4, '& .MuiOutlinedInput-root': { background: 'rgba(255,255,255,0.02)' } }}
            />

            <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>Delivery Channels</Typography>
            <FormGroup row sx={{ mb: 4, gap: 3 }}>
              <FormControlLabel 
                control={<Checkbox checked={channels.inApp} onChange={e => setChannels({...channels, inApp: e.target.checked})} color="error" />} 
                label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><AppIcon fontSize="small"/> In-App</Box>} 
              />
              <FormControlLabel 
                control={<Checkbox checked={channels.push} onChange={e => setChannels({...channels, push: e.target.checked})} color="error" />} 
                label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><PhoneIcon fontSize="small"/> Push</Box>} 
              />
              <FormControlLabel 
                control={<Checkbox checked={channels.sms} onChange={e => setChannels({...channels, sms: e.target.checked})} color="error" />} 
                label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><SmsIcon fontSize="small"/> SMS</Box>} 
              />
              <FormControlLabel 
                control={<Checkbox checked={channels.email} onChange={e => setChannels({...channels, email: e.target.checked})} color="error" />} 
                label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><EmailIcon fontSize="small"/> Email</Box>} 
              />
            </FormGroup>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                variant="contained" 
                size="large" 
                color="error"
                startIcon={<SendIcon />}
                disabled={!message.trim()}
                onClick={() => setOpenConfirm(true)}
                sx={{ px: 4, py: 1.5 }}
              >
                Broadcast Alert Now
              </Button>
            </Box>
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
            <Typography variant="h6" sx={{ mb: 3 }}>Broadcast History</Typography>
            {historyError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Failed to load notification history.
              </Alert>
            )}
            <List disablePadding>
              {history.map((item) => (
                <ListItem key={item.id} alignItems="flex-start" sx={{ px: 0, py: 2, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Avatar sx={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', width: 32, height: 32 }}>
                      <SmsIcon fontSize="small" />
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography variant="body2" sx={{ mb: 1 }}>{item.message}</Typography>}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip label={item.channel.toUpperCase()} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" sx={{ display: 'block' }}>{new Date(item.created_at).toLocaleString()}</Typography>
                          <Typography variant="caption" color="success.main">Status: {item.status}</Typography>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
              {!historyLoading && history.length === 0 && (
                <Typography variant="body2" color="text.secondary">No broadcasts found.</Typography>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>

      <Dialog
        open={openConfirm}
        onClose={() => setOpenConfirm(false)}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: 'rgba(18, 18, 26, 0.98)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-card)',
            },
          },
        }}
      >
        <DialogTitle sx={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon /> Confirm Broadcast
        </DialogTitle>
        <DialogContent>
          <DialogContentText color="text.primary">
            Are you sure you want to send this mass alert? It will immediately ping all selected channels.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={() => setOpenConfirm(false)} color="inherit" disabled={isSubmitting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleSend} disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Yes, Send Alert'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
