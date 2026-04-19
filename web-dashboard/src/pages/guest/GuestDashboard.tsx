import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Alert,
  IconButton,
} from '@mui/material';
import {
  WarningAmber as WarningIcon,
  Phone as PhoneIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  ReportProblem as ReportIcon,
} from '@mui/icons-material';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function GuestDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { notifications } = useNotificationStore();
  const containerRef = useRef(null);
  const panicRef = useRef<HTMLButtonElement>(null);

  const [activeIncident, setActiveIncident] = useState(false);
  const [isSendingSOS, setIsSendingSOS] = useState(false);

  // Check for active incidents
  useEffect(() => {
    axios.get(`${API_URL}/crisis/active?propertyId=${user?.property_id || 1}`)
      .then(res => {
        if (res.data.incidents && res.data.incidents.length > 0) {
          setActiveIncident(true);
        }
      })
      .catch(console.error);
  }, [user]);

  const triggerPanic = async () => {
    if (isSendingSOS) {
      return;
    }

    setIsSendingSOS(true);
    try {
      const response = await axios.post(`${API_URL}/users/panic`, {
        message: `Panic triggered from Guest Dashboard (Room ${user?.room_number || 'Unknown'})`,
        latitude: 40.7128, // Mock GPS
        longitude: -74.0060,
      });
      alert(response.data?.message || 'Panic Alert Sent! Security is on the way.');
    } catch (err) {
      console.error('Failed to trigger panic:', err);
      alert('Unable to send SOS. Please check your connection and try again.');
    } finally {
      setIsSendingSOS(false);
    }
  };

  useGSAP(() => {
    gsap.from('.stagger-item', {
      y: 20,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: 'back.out(1.2)',
      clearProps: 'all',
      force3D: false,
    });

    // Subtly pulsate the panic button
    if (panicRef.current) {
      gsap.to(panicRef.current, {
        scale: 1.05,
        boxShadow: '0 0 30px rgba(239, 68, 68, 0.4)',
        yoyo: true,
        repeat: -1,
        duration: 1.5,
        ease: 'sine.inOut',
        force3D: false,
      });
    }
  }, { scope: containerRef });

  return (
    <Box ref={containerRef} sx={{ maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h1" sx={{ fontSize: '2rem', mb: 1 }} className="stagger-item">
        Hello, {user?.name || 'Guest'}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }} className="stagger-item">
        Your safety is our top priority.
      </Typography>

      {/* Status Banner */}
      {activeIncident ? (
        <Alert
          icon={<WarningIcon fontSize="inherit" />}
          severity="error"
          sx={{ mb: 4, borderRadius: 3 }}
          className="stagger-item glow-red"
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/guest/check-in')}>
              Check-In NOW
            </Button>
          }
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Active Emergency</Typography>
          Please check the Alerts tab for instructions.
        </Alert>
      ) : (
        <Alert
          icon={<CheckCircleIcon fontSize="inherit" />}
          severity="success"
          sx={{ mb: 4, borderRadius: 3, background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80' }}
          className="stagger-item"
        >
          No active emergencies at this property.
        </Alert>
      )}

      {/* Main Panic Button */}
      <Box
        className="stagger-item"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mb: 5
        }}
      >
        <Box sx={{ position: 'relative', width: 200, height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="panic-ring"></div>
          <div className="panic-ring"></div>
          <div className="panic-ring"></div>
          <Button
            ref={panicRef}
            variant="contained"
            color="error"
            onClick={triggerPanic}
            disabled={isSendingSOS}
            sx={{
              width: 150,
              height: 150,
              borderRadius: '50%',
              fontSize: '1.5rem',
              fontWeight: 800,
              zIndex: 2,
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            }}
          >
            {isSendingSOS ? 'SENDING...' : 'SOS'}
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Tap SOS to immediately alert security and responders.
        </Typography>
      </Box>

      {/* Quick Actions Grid */}
      <Typography variant="h6" sx={{ mb: 2 }} className="stagger-item">
        Quick Actions
      </Typography>
      <Grid container spacing={2} className="stagger-item">
        <Grid size={{ xs: 6 }}>
          <Card className="glass" sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <IconButton color="secondary" sx={{ mb: 1, backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                <SecurityIcon />
              </IconButton>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Call Security</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Card className="glass" sx={{ height: '100%' }} onClick={() => navigate('/guest/emergency')}>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <IconButton color="error" sx={{ mb: 1, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                <ReportIcon />
              </IconButton>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Report Issue</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
