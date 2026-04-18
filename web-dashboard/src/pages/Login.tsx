import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import axios from 'axios';

import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const containerRef = useRef(null);

  const [identifier, setIdentifier] = useState('admin@hotel.com');
  const [password, setPassword] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useGSAP(() => {
    gsap.fromTo('.login-elem', 
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
    );
  }, { scope: containerRef });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/users/login`, { identifier, password });
      login(response.data.token, response.data.user);
      
      if (response.data.user.role === 'guest') {
        navigate('/guest');
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          setError('Unable to reach backend API. Make sure backend is running on port 3001.');
        } else {
          setError(err.response?.data?.error || 'Login failed. Please try again.');
        }
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      ref={containerRef}
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '60vw',
          height: '60vw',
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.1) 0%, transparent 60%)',
          borderRadius: '50%',
          zIndex: 0,
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: '-20%',
          left: '-10%',
          width: '60vw',
          height: '60vw',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 60%)',
          borderRadius: '50%',
          zIndex: 0,
        }
      }}
    >
      <Paper 
        className="glass-strong"
        sx={{
          p: { xs: 4, md: 6 },
          maxWidth: 440,
          width: '100%',
          zIndex: 1,
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 5 }} className="login-elem">
          <Box 
            sx={{ 
              display: 'inline-flex', 
              p: 2, 
              borderRadius: '24px',
              background: 'rgba(239, 68, 68, 0.1)',
              mb: 2,
            }}
          >
            <SecurityIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          </Box>
          <Typography variant="h1" sx={{ fontSize: '2rem', mb: 1, color: '#f1f5f9' }}>
            CRISIS<span style={{ color: '#ef4444' }}>RESPOND</span>
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Command Center Access
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} className="login-elem">
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleLogin} className="login-elem">
          <TextField
            fullWidth
            label="Email Address or Mobile Number"
            variant="outlined"
            margin="normal"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoComplete="username"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Password"
            variant="outlined"
            margin="normal"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            sx={{ mb: 4 }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            disabled={loading}
            sx={{ py: 1.5, fontSize: '1.1rem' }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </Button>
        </Box>

        <Box sx={{ mt: 4, textAlign: 'center' }} className="login-elem">
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            <strong>Demo Admin:</strong> admin@hotel.com / password
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            <strong>Demo Guest:</strong> guest@hotel.com / password
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
