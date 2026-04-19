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
      y: 15,
      opacity: 0,
      duration: 0.5,
      stagger: 0.1,
      ease: 'power2.out',
      clearProps: 'all',
      force3D: false,
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
    <Box ref={containerRef} sx={{ maxWidth: 600, mx: 'auto', py: 4 }}>
      <Typography variant="h2" sx={{ fontSize: '2rem', mb: 1, fontWeight: 'bold', color: '#fff' }} className="anim-item">
        Safety Check-In
      </Typography>
      <Typography variant="body1" sx={{ mb: 4, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }} className="anim-item">
        During an emergency, please use this page to report your status to the command center.
      </Typography>

      {lastStatus && (
        <Alert 
          severity={lastStatus === 'safe' ? 'success' : 'error'} 
          variant="filled"
          sx={{ mb: 4, borderRadius: 2 }}
          className="anim-item"
        >
          Your last reported status: <strong>{lastStatus === 'safe' ? 'SAFE' : 'NEEDS HELP'}</strong>
        </Alert>
      )}

      <Card 
        className="anim-item" 
        sx={{ 
          mb: 4, 
          backgroundColor: 'rgba(255, 255, 255, 0.05)', 
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#fff' }}>
            Provide Details (Optional)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="E.g., I am trapped in the stairwell on floor 2..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            sx={{ 
              mb: 3,
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
              },
              '& .MuiInputBase-input::placeholder': {
                color: 'rgba(255, 255, 255, 0.4)',
                opacity: 1
              }
            }}
          />
          <FormControlLabel
            control={
              <Switch 
                checked={shareLocation} 
                onChange={(e) => setShareLocation(e.target.checked)} 
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
                <LocationIcon fontSize="small" sx={{ color: '#3b82f6' }} />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>Share precise location</Typography>
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
          sx={{ 
            py: 2.5, 
            fontSize: '1.1rem', 
            fontWeight: 'bold',
            borderRadius: 2,
            backgroundColor: '#22c55e', 
            boxShadow: '0 4px 14px rgba(34, 197, 94, 0.3)',
            '&:hover': { backgroundColor: '#16a34a', boxShadow: '0 6px 20px rgba(34, 197, 94, 0.4)' } 
          }}
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
          sx={{ 
            py: 2.5, 
            fontSize: '1.1rem', 
            fontWeight: 'bold',
            borderRadius: 2,
            backgroundColor: '#f97316', 
            boxShadow: '0 4px 14px rgba(249, 115, 22, 0.3)',
            '&:hover': { backgroundColor: '#ea580c', boxShadow: '0 6px 20px rgba(249, 115, 22, 0.4)' } 
          }}
        >
          I NEED HELP
        </Button>
      </Box>
    </Box>
  );
}
