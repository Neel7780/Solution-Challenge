import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ExploreOff as ExploreOffIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';

export default function NotFound() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const handleGoHome = () => {
    if (isAuthenticated) {
      if (user?.role === 'guest') {
        navigate('/guest');
      } else {
        navigate('/dashboard');
      }
    } else {
      navigate('/');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        background: 'var(--bg-primary)',
        backgroundImage: `
          radial-gradient(ellipse at center, rgba(0, 121, 193, 0.05), transparent 70%),
          linear-gradient(var(--border-subtle) 1px, transparent 1px),
          linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 64px 64px, 64px 64px',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      <Paper
        className="glass-panel"
        sx={{
          maxWidth: 480,
          width: '100%',
          p: 5,
          textAlign: 'center',
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-soft)',
          borderRadius: 3,
        }}
        elevation={0}
      >
        <ExploreOffIcon sx={{ fontSize: 80, color: 'var(--accent-red)', mb: 3, opacity: 0.8 }} />
        <Typography variant="h1" sx={{ fontSize: '3rem', fontWeight: 800, mb: 1, color: 'var(--text-primary)' }}>
          404
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: 'var(--text-primary)' }}>
          Page Not Found
        </Typography>
        <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 4, lineHeight: 1.6 }}>
          The coordinates you are trying to access do not exist, have been restricted, or the links have expired. Please return to the portal.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<ArrowBackIcon />}
          onClick={handleGoHome}
          sx={{
            py: 1.5,
            px: 4,
            fontWeight: 'bold',
            borderRadius: 2,
            boxShadow: '0 4px 14px rgba(0, 121, 193, 0.25)',
            textTransform: 'uppercase',
          }}
        >
          Return to Portal
        </Button>
      </Paper>
    </Box>
  );
}
