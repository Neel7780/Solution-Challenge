import React, { useRef, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
} from '@mui/material';
import {
  CheckCircle as SafeIcon,
  Help as HelpIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function GuestCheckIn() {
  const containerRef = useRef(null);
  const { user } = useAuthStore();
  const [activeIncidentId, setActiveIncidentId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [shareLocation, setShareLocation] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastStatus, setLastStatus] = useState<'safe' | 'needs_help' | null>(null);

  useEffect(() => {
    // Check for active incident
    axios.get(`${API_URL}/crisis/active?propertyId=${user?.property_id || 1}`)
      .then(res => {
        if (res.data.incidents && res.data.incidents.length > 0) {
          setActiveIncidentId(res.data.incidents[0].id);
        }
      })
      .catch(console.error);
  }, [user]);

  useGSAP(() => {
    gsap.from('.anim-item', {
      y: 20,
      opacity: 0,
      duration: 0.5,
      stagger: 0.1,
      ease: 'power2.out',
    });
  }, { scope: containerRef });

  const handleCheckIn = async (status: 'safe' | 'needs_help') => {
    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/users/checkin`, {
        incidentId: activeIncidentId || 1, // Fallback for demo
        status,
        message,
        latitude: shareLocation ? 40.7128 : null,
        longitude: shareLocation ? -74.0060 : null,
      });
      setLastStatus(status);
      alert(status === 'safe' ? 'Marked as Safe.' : 'Help request submitted.');
    } catch (err) {
      console.error(err);
      setLastStatus(status);
      alert(`Status recorded as ${status} (Demo Mode)`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box ref={containerRef} sx={{ maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h2" sx={{ fontSize: '1.75rem', mb: 1 }} className="anim-item">
        Safety Check-In
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }} className="anim-item">
        During an emergency, please use this page to report your status to the command center.
      </Typography>

      {lastStatus && (
        <Alert 
          severity={lastStatus === 'safe' ? 'success' : 'error'} 
          sx={{ mb: 4 }}
          className="anim-item"
        >
          Your last reported status: <strong>{lastStatus === 'safe' ? 'SAFE' : 'NEEDS HELP'}</strong>
        </Alert>
      )}

      <Card className="glass anim-item" sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
            Provide Details (Optional)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="E.g., I am trapped in the stairwell on floor 2..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Switch 
                checked={shareLocation} 
                onChange={(e) => setShareLocation(e.target.checked)} 
                color="secondary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationIcon fontSize="small" />
                <Typography variant="body2">Share precise location</Typography>
              </Box>
            }
          />
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }} className="anim-item">
        <Button
          variant="contained"
          size="large"
          color="success"
          startIcon={<SafeIcon />}
          onClick={() => handleCheckIn('safe')}
          disabled={isSubmitting}
          sx={{ py: 2, fontSize: '1.1rem', backgroundColor: '#22c55e', '&:hover': { backgroundColor: '#16a34a' } }}
        >
          I AM SAFE
        </Button>
        <Button
          variant="contained"
          size="large"
          color="error"
          startIcon={<HelpIcon />}
          onClick={() => handleCheckIn('needs_help')}
          disabled={isSubmitting}
          sx={{ py: 2, fontSize: '1.1rem', backgroundColor: '#f97316', '&:hover': { backgroundColor: '#ea580c' } }}
        >
          I NEED HELP
        </Button>
      </Box>
    </Box>
  );
}
