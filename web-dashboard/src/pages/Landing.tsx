import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Paper,
  Stack,
  Chip,
} from '@mui/material';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import {
  Shield,
  NotificationsActive,
  LocationOn,
  Speed,
  Security,
  Hotel,
  ArrowForward,
  CheckCircle,
} from '@mui/icons-material';

const features = [
  {
    icon: <Shield sx={{ fontSize: 32 }} />,
    title: 'Crisis Management',
    description: 'Comprehensive incident tracking and response coordination for hospitality security teams.',
  },
  {
    icon: <LocationOn sx={{ fontSize: 32 }} />,
    title: 'Live Location Tracking',
    description: 'Real-time personnel and guest location monitoring with interactive zone mapping.',
  },
  {
    icon: <NotificationsActive sx={{ fontSize: 32 }} />,
    title: 'Mass Notifications',
    description: 'Instant alerts and broadcasts to staff and guests during emergency situations.',
  },
  {
    icon: <Speed sx={{ fontSize: 32 }} />,
    title: 'Real-time Response',
    description: 'WebSocket-powered live updates for immediate situational awareness.',
  },
  {
    icon: <Security sx={{ fontSize: 32 }} />,
    title: 'Role-based Access',
    description: 'Secure multi-role system for admins, security, staff, responders, and guests.',
  },
  {
    icon: <Hotel sx={{ fontSize: 32 }} />,
    title: 'Guest Safety',
    description: 'Mobile-friendly guest portal with SOS panic button and safety check-ins.',
  },
];

const stats = [
  { value: '< 5s', label: 'Alert Response' },
  { value: '24/7', label: 'Live Monitoring' },
  { value: '100%', label: 'Encrypted' },
];

export default function Landing() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const statsRef = useRef(null);

  useGSAP(() => {
    gsap.from('.hero-anim', {
      y: 60,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: 'power3.out',
    });
  }, { scope: heroRef });

  useGSAP(() => {
    gsap.from('.feature-card', {
      y: 40,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: featuresRef.current,
        start: 'top 80%',
      },
    });
  }, { scope: featuresRef });

  useGSAP(() => {
    gsap.from('.stat-item', {
      scale: 0.8,
      opacity: 0,
      duration: 0.5,
      stagger: 0.1,
      ease: 'back.out(1.7)',
      scrollTrigger: {
        trigger: statsRef.current,
        start: 'top 85%',
      },
    });
  }, { scope: statsRef });

  return (
    <Box sx={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Navigation */}
      <Box
        component="nav"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          py: 2,
          px: { xs: 2, md: 4 },
          background: 'rgba(10, 10, 15, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <Container maxWidth="xl">
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography
              variant="h5"
              sx={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                letterSpacing: '-0.02em',
              }}
            >
              CRISIS<span style={{ color: 'var(--accent-red)' }}>RESPOND</span>
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                onClick={() => navigate('/login')}
                sx={{
                  borderColor: 'var(--border-medium)',
                  color: 'var(--text-primary)',
                  '&:hover': {
                    borderColor: 'var(--accent-red)',
                    background: 'rgba(239, 68, 68, 0.1)',
                  },
                }}
              >
                Sign In
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Hero Section */}
      <Box
        ref={heroRef}
        sx={{
          pt: { xs: 12, md: 16 },
          pb: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background Effects */}
        <Box
          sx={{
            position: 'absolute',
            top: '10%',
            left: '10%',
            width: 400,
            height: 400,
            background: 'radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '10%',
            right: '5%',
            width: 300,
            height: 300,
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />

        <Container maxWidth="lg">
          <Stack spacing={6} sx={{ alignItems: 'center', textAlign: 'center' }}>
            <Chip
              icon={<Box component="span" className="status-dot status-dot--live" sx={{ mr: 1 }} />}
              label="Enterprise Crisis Response Platform"
              className="hero-anim"
              sx={{
                background: 'rgba(34, 197, 94, 0.1)',
                color: 'var(--accent-green)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                '& .MuiChip-icon': { color: 'var(--accent-green)' },
              }}
            />

            <Typography
              variant="h1"
              className="hero-anim"
              sx={{
                fontFamily: 'var(--font-display)',
                fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' },
                fontWeight: 800,
                lineHeight: 1.1,
                maxWidth: 900,
                background: 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Protect Your Guests.{' '}
              <Box component="span" sx={{ color: 'var(--accent-red)', WebkitTextFillColor: '#ef4444' }}>
                Respond Faster.
              </Box>
            </Typography>

            <Typography
              variant="h5"
              className="hero-anim"
              sx={{
                color: 'var(--text-secondary)',
                maxWidth: 600,
                fontWeight: 400,
                lineHeight: 1.6,
              }}
            >
              The intelligent crisis management platform designed for hotels and hospitality venues.
              Real-time incidents, location tracking, and instant guest communication.
            </Typography>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              className="hero-anim"
            >
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/login')}
                endIcon={<ArrowForward />}
                sx={{
                  background: 'var(--accent-red)',
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  '&:hover': {
                    background: '#dc2626',
                    boxShadow: '0 0 30px rgba(239, 68, 68, 0.3)',
                  },
                }}
              >
                Access Dashboard
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/login')}
                sx={{
                  borderColor: 'var(--border-medium)',
                  color: 'var(--text-primary)',
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  '&:hover': {
                    borderColor: 'var(--text-primary)',
                    background: 'rgba(255, 255, 255, 0.05)',
                  },
                }}
              >
                Guest Portal
              </Button>
            </Stack>

            {/* Hero Preview Card */}
            <Paper
              className="hero-anim glass"
              sx={{
                mt: 6,
                p: 3,
                width: '100%',
                maxWidth: 1000,
                borderRadius: 3,
                border: '1px solid var(--border-subtle)',
                position: 'relative',
              }}
            >
              <Box
                sx={{
                  height: { xs: 200, md: 400 },
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Grid container spacing={2} sx={{ p: 4 }}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 2, background: 'rgba(255, 255, 255, 0.05)', height: 120 }}>
                      <Typography variant="caption" color="text.secondary">Active Incidents</Typography>
                      <Typography variant="h4" sx={{ color: 'var(--accent-red)', fontWeight: 700 }}>3</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 2, background: 'rgba(255, 255, 255, 0.05)', height: 120 }}>
                      <Typography variant="caption" color="text.secondary">Staff Online</Typography>
                      <Typography variant="h4" sx={{ color: 'var(--accent-green)', fontWeight: 700 }}>12</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 2, background: 'rgba(255, 255, 255, 0.05)', height: 120 }}>
                      <Typography variant="caption" color="text.secondary">Zones Covered</Typography>
                      <Typography variant="h4" sx={{ color: 'var(--accent-blue)', fontWeight: 700 }}>8</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          </Stack>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box ref={statsRef} sx={{ py: 6, borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} sx={{ justifyContent: 'center' }}>
            {stats.map((stat, index) => (
              <Grid size={{ xs: 12, md: 4 }} key={index}>
                <Stack className="stat-item" sx={{ alignItems: 'center' }}>
                  <Typography
                    variant="h2"
                    sx={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 800,
                      color: 'var(--accent-red)',
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {stat.label}
                  </Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box ref={featuresRef} sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Stack spacing={8}>
            <Stack spacing={3} sx={{ textAlign: 'center' }}>
              <Typography
                variant="overline"
                sx={{ color: 'var(--accent-red)', letterSpacing: 2, fontWeight: 600 }}
              >
                Platform Features
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: { xs: '2rem', md: '2.5rem' },
                }}
              >
                Everything You Need for Crisis Response
              </Typography>
            </Stack>

            <Grid container spacing={3}>
              {features.map((feature, index) => (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={index}>
                  <Paper
                    className="feature-card glass"
                    sx={{
                      p: 4,
                      height: '100%',
                      borderRadius: 3,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                        borderColor: 'var(--border-medium)',
                      },
                    }}
                  >
                    <Stack spacing={2}>
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: 'var(--accent-red)',
                        }}
                      >
                        {feature.icon}
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                        {feature.description}
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, position: 'relative' }}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, transparent 50%)',
            pointerEvents: 'none',
          }}
        />
        <Container maxWidth="md">
          <Paper
            className="glass-medium"
            sx={{
              p: { xs: 4, md: 6 },
              borderRadius: 4,
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Stack spacing={4} sx={{ alignItems: 'center' }}>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: { xs: '1.75rem', md: '2.5rem' },
                }}
              >
                Ready to Secure Your Property?
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 500 }}>
                Join hospitality venues worldwide using CrisisRespond to protect their guests
                and streamline emergency response operations.
              </Typography>
              <Stack spacing={2} sx={{ alignItems: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/login')}
                  endIcon={<ArrowForward />}
                  sx={{
                    background: 'var(--accent-red)',
                    px: 6,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    '&:hover': {
                      background: '#dc2626',
                      boxShadow: '0 0 40px rgba(239, 68, 68, 0.4)',
                    },
                  }}
                >
                  Get Started Now
                </Button>
                <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
                  {['No setup fees', '24/7 Support', 'Enterprise ready'].map((item) => (
                    <Stack key={item} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                      <CheckCircle sx={{ fontSize: 16, color: 'var(--accent-green)' }} />
                      <Typography variant="caption" color="text.secondary">{item}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            </Stack>
          </Paper>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 4, borderTop: '1px solid var(--border-subtle)', mt: 'auto' }}>
        <Container maxWidth="lg">
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
              }}
            >
              CRISIS<span style={{ color: 'var(--accent-red)' }}>RESPOND</span>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              2025 CrisisRespond. Enterprise Crisis Management Platform.
            </Typography>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
