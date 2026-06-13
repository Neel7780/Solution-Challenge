import { API_URL } from '../config';
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
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Security as SecurityIcon,
  Business as BusinessIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import axios from 'axios';

import { useAuthStore, UserContext } from '../store/authStore';



const getDashboardHomeByRole = (role?: string) => {
  if (role === 'responder') return '/dashboard/responder';
  if (role === 'security') return '/dashboard/security';
  if (role === 'staff') return '/dashboard/staff';
  return '/dashboard/command';
};

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const containerRef = useRef(null);

  const [identifier, setIdentifier] = useState('admin@enterprise.com');
  const [password, setPassword] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Context selection state
  const [showContextSelection, setShowContextSelection] = useState(false);
  const [availableContexts, setAvailableContexts] = useState<UserContext[]>([]);
  const [tempToken, setTempToken] = useState('');
  const [tempUser, setTempUser] = useState<any>(null);

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
      
      if (response.data.requiresContextSelection) {
        setAvailableContexts(response.data.contexts);
        setTempToken(response.data.token);
        setTempUser(response.data.user);
        setShowContextSelection(true);
      } else {
        login(response.data.token, response.data.user, response.data.contexts);
        
        if (response.data.user.role === 'guest') {
          navigate('/guest');
        } else {
          navigate(getDashboardHomeByRole(response.data.user.role));
        }
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

  const handleSelectContext = async (context: UserContext) => {
    setLoading(true);
    try {
      // Re-login with specific propertyId
      const response = await axios.post(`${API_URL}/users/login`, { 
        identifier, 
        password,
        propertyId: context.propertyId 
      });
      
      login(response.data.token, response.data.user, availableContexts);
      
      if (response.data.user.role === 'guest') {
        navigate('/guest');
      } else {
        navigate(getDashboardHomeByRole(response.data.user.role));
      }
    } catch (err) {
      setError('Failed to select context. Please try again.');
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
        {!showContextSelection ? (
          <>
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
                Enterprise Command Center
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
                sx={{ py: 1.5, fontSize: '1.1rem', mb: 2 }}
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </Button>

              <Button
                fullWidth
                variant="outlined"
                color="inherit"
                size="large"
                onClick={() => navigate('/')}
                sx={{ 
                  py: 1.5, 
                  fontSize: '1.1rem',
                  borderColor: 'var(--border-medium)',
                  color: 'text.secondary',
                  '&:hover': {
                    borderColor: 'var(--accent-blue)',
                    color: 'text.primary',
                  }
                }}
              >
                Back to Home Page
              </Button>
            </Box>
          </>
        ) : (
          <Box className="login-elem">
            <Box sx={{ mb: 4, textAlign: 'center' }}>
               <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>Select Property</Typography>
               <Typography variant="body2" color="text.secondary">
                 Your account has access to multiple locations. Please select one to continue.
               </Typography>
            </Box>
            
            <List sx={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px solid var(--border-subtle)' }}>
              {availableContexts.map((ctx, index) => (
                <React.Fragment key={ctx.propertyId}>
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => handleSelectContext(ctx)} sx={{ py: 2 }}>
                      <ListItemIcon>
                        <BusinessIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={<Typography sx={{ fontWeight: 600 }}>{ctx.propertyName}</Typography>}
                        secondary={<Typography variant="caption" sx={{ textTransform: 'capitalize' }}>{ctx.role}</Typography>}
                      />
                      <ArrowForwardIcon fontSize="small" sx={{ opacity: 0.3 }} />
                    </ListItemButton>
                  </ListItem>
                  {index < availableContexts.length - 1 && <Divider sx={{ borderColor: 'var(--border-subtle)' }} />}
                </React.Fragment>
              ))}
            </List>
            
            <Button 
              fullWidth 
              color="inherit" 
              onClick={() => setShowContextSelection(false)} 
              sx={{ mt: 3, opacity: 0.7 }}
            >
              Back to Login
            </Button>
          </Box>
        )}

        <Box sx={{ mt: 4, textAlign: 'center' }} className="login-elem">
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            <strong>Enterprise Multi-Tenant:</strong> Access multiple locations with one account.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
