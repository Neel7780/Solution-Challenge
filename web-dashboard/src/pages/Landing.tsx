import React, { useRef, useState } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton,
  Divider,
  Drawer,
} from '@mui/material';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowOutward as ArrowOutward,
  PlayArrow as PlayArrow,
  HubOutlined as HubOutlined,
  PsychologyAltOutlined as PsychologyAltOutlined,
  ShieldOutlined as ShieldOutlined,
  LockOutlined as LockOutlined,
  StorageOutlined as StorageOutlined,
  BoltOutlined as BoltOutlined,
  FavoriteOutlined as FavoriteOutlined,
  MonitorHeartOutlined as MonitorHeartOutlined,
  LanguageOutlined as LanguageOutlined,
  ThreeDRotationOutlined as ThreeDRotationOutlined,
  ArrowForward as ArrowForward,
  CheckCircle as CheckCircle,
  Close as CloseIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import axios from 'axios';
import heroTwinImage from '../assets/hero-twin.jpg';
import ecosystemImage from '../assets/ecosystem.jpg';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const moduleFeatures = [
  {
    code: 'MOD.01',
    icon: <HubOutlined />,
    title: 'Digital Twin Visualizer',
    description: 'Real-time Godot-powered 3D floor plans that expose fire, smoke, and occupant positions live.',
    color: '#0079c1',
  },
  {
    code: 'MOD.02',
    icon: <PsychologyAltOutlined />,
    title: 'Gemini Intelligence',
    description: 'AI predicts bottlenecks and drafts evacuation routes from density and hazard telemetry.',
    color: '#2e7d32',
  },
  {
    code: 'MOD.03',
    icon: <ShieldOutlined />,
    title: 'Instant Staff Dispatch',
    description: 'Smart routing auto-assigns responders to high-risk zones with mobile escalation.',
    color: '#d32f2f',
  },
];

const trustLogos = [
  { name: 'MERIDIAN', sub: 'HOTELS' },
  { name: 'ATLAS', sub: 'HOSPITALITY' },
  { name: 'ST. CLAIRE', sub: 'HOSPITAL NETWORK' },
  { name: 'NORTHGATE', sub: 'MEDICAL' },
  { name: 'VANTAGE', sub: 'RESORTS' },
];

const architecturePoints = [
  {
    icon: <LockOutlined />,
    title: 'Automatic Data Isolation',
    code: 'QueryWithContext()',
    description: 'Tenant-scoped queries are enforced at the ORM layer with zero cross-tenant leakage.',
  },
  {
    icon: <StorageOutlined />,
    title: 'PostGIS Spatial Database',
    code: 'ST_Within / ST_Distance',
    description: 'True geospatial indexing for floor-level coordinate math and route safety at scale.',
  },
  {
    icon: <BoltOutlined />,
    title: 'Sub-second Socket.io Latency',
    code: 'p99 < 800ms',
    description: 'Edge-aware pub/sub architecture keeps command telemetry synchronized in real time.',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [openRequest, setOpenRequest] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useGSAP(() => {
    gsap.registerPlugin(ScrollTrigger);

    gsap.from('.hero-reveal', {
      y: 22,
      opacity: 0,
      duration: 0.8,
      stagger: 0.08,
      ease: 'power3.out',
    });

    gsap.utils.toArray('.scroll-reveal').forEach((el: any) => {
      gsap.from(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
        y: 24,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      });
    });

    gsap.to('.pulse-dot', {
      opacity: 0.35,
      scale: 0.84,
      duration: 1.4,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    gsap.to('.panel-float-a', {
      y: -6,
      duration: 3.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    gsap.to('.panel-float-b', {
      y: 6,
      duration: 4.3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }, { scope: pageRef });

  return (
    <Box
      ref={pageRef}
      sx={{
        minHeight: '100vh',
        color: '#1c1e21',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        backgroundImage: `
          radial-gradient(ellipse at top, rgba(0, 121, 193, 0.08), transparent 55%),
          linear-gradient(rgba(0, 121, 193, 0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 121, 193, 0.04) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 64px 64px, 64px 64px',
      }}
    >
      <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.8) 100%)', pointerEvents: 'none' }} />

      {/* Navigation Header */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          borderBottom: '1px solid rgba(0, 121, 193, 0.08)',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Container maxWidth="xl">
          <Stack direction="row" sx={{ height: 68, alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box sx={{
                width: 34,
                height: 34,
                borderRadius: 1.2,
                display: 'grid',
                placeItems: 'center',
                background: 'linear-gradient(140deg, #0079c1, #005a90)',
              }}>
                <FavoriteOutlined sx={{ fontSize: 18, color: '#ffffff' }} />
              </Box>
              <Box>
                <Typography sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: { xs: '0.8rem', sm: '0.95rem' }, letterSpacing: '0.04em', color: '#005a90' }}>
                  CRISIS <Box component="span" sx={{ color: '#0079c1' }}>RESPOND</Box>
                </Typography>
                <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.56rem', color: 'text.secondary', letterSpacing: '0.2em' }}>
                  v3.3 // GIS PLATFORM
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={{ xs: 1, sm: 2 }} sx={{ alignItems: 'center' }}>
              <Stack direction="row" spacing={3} sx={{ display: { xs: 'none', md: 'flex' } }}>
                {[
                  ['Platform', '#features'],
                  ['Ecosystem', '#ecosystem'],
                  ['Architecture', '#architecture'],
                ].map(([text, link]) => (
                  <Button
                    key={text}
                    component="a"
                    href={link}
                    sx={{ color: 'text.secondary', fontWeight: 500, textTransform: 'none', '&:hover': { color: 'primary.main' } }}
                  >
                    {text}
                  </Button>
                ))}
              </Stack>
              
              {/* Desktop Action Buttons */}
              <Stack direction="row" spacing={1.5} sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
                <Button onClick={() => navigate('/login')} sx={{ color: 'text.secondary', fontWeight: 500, textTransform: 'none', '&:hover': { color: 'primary.main' } }}>
                  Sign In
                </Button>
                <Button
                  variant="contained"
                  onClick={() => setOpenRequest(true)}
                  size="small"
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    py: 1,
                    px: 2,
                    color: '#ffffff',
                    backgroundColor: '#0079c1',
                    boxShadow: 'none',
                    '&:hover': { backgroundColor: '#005a90' },
                  }}
                >
                  Request Demo
                </Button>
              </Stack>

              {/* Hamburger Icon for Mobile */}
              <IconButton
                onClick={() => setDrawerOpen(true)}
                sx={{
                  display: { xs: 'flex', md: 'none' },
                  color: '#0079c1',
                  p: 0.8,
                }}
              >
                <MenuIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Container>

        {/* Mobile Navigation Drawer */}
        <Drawer
          anchor="right"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          slotProps={{
            backdrop: {
              sx: {
                backdropFilter: 'blur(4px)',
                backgroundColor: 'rgba(0,0,0,0.1)',
              }
            },
            paper: {
              sx: {
                width: 280,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(16px)',
                borderLeft: '1px solid rgba(0, 121, 193, 0.1)',
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }
            }
          }}
        >
          <Box>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Box sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 0.8,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'linear-gradient(140deg, #0079c1, #005a90)',
                }}>
                  <FavoriteOutlined sx={{ fontSize: 14, color: '#ffffff' }} />
                </Box>
                <Typography sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.04em', color: '#005a90' }}>
                  CRISIS <Box component="span" sx={{ color: '#0079c1' }}>RESPOND</Box>
                </Typography>
              </Stack>
              <IconButton onClick={() => setDrawerOpen(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Stack>

            <Stack spacing={2}>
              {[
                ['Platform', '#features'],
                ['Ecosystem', '#ecosystem'],
                ['Architecture', '#architecture'],
              ].map(([text, link]) => (
                <Button
                  key={text}
                  component="a"
                  href={link}
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    justifyContent: 'flex-start',
                    color: 'text.secondary',
                    fontWeight: 500,
                    textTransform: 'none',
                    fontSize: '1rem',
                    py: 1,
                    px: 1.5,
                    borderRadius: 1.5,
                    '&:hover': {
                      color: 'primary.main',
                      background: 'rgba(0, 121, 193, 0.04)',
                    }
                  }}
                >
                  {text}
                </Button>
              ))}
            </Stack>
          </Box>

          <Box sx={{ mt: 'auto', pt: 4, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <Stack spacing={1.5}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setDrawerOpen(false);
                  navigate('/login');
                }}
                sx={{
                  py: 1.2,
                  textTransform: 'none',
                  color: '#0079c1',
                  borderColor: 'rgba(0,121,193,0.3)',
                  fontWeight: 600,
                  '&:hover': { borderColor: '#0079c1', background: 'rgba(0,121,193,0.04)' }
                }}
              >
                Sign In
              </Button>
              <Button
                fullWidth
                variant="contained"
                onClick={() => {
                  setDrawerOpen(false);
                  setOpenRequest(true);
                }}
                sx={{
                  py: 1.2,
                  textTransform: 'none',
                  fontWeight: 600,
                  color: '#ffffff',
                  backgroundColor: '#0079c1',
                  boxShadow: 'none',
                  '&:hover': { backgroundColor: '#005a90' }
                }}
              >
                Request Demo
              </Button>
            </Stack>
          </Box>
        </Drawer>
      </Box>

      {/* Hero Section */}
      <Container maxWidth="xl" sx={{ pt: { xs: 15, md: 18 }, pb: 8, position: 'relative', zIndex: 2 }}>
        <Grid container spacing={6} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <Box className="hero-reveal" sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              borderRadius: 10,
              py: 0.8,
              px: 1.6,
              border: '1px solid rgba(211,47,47,0.25)',
              background: 'rgba(211,47,47,0.05)',
            }}>
              <Box className="pulse-dot" sx={{ width: 8, height: 8, borderRadius: '50%', background: '#d32f2f' }} />
              <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.66rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d32f2f', fontWeight: 700 }}>
                Live Incident Coordination
              </Typography>
            </Box>

            <Typography className="hero-reveal" sx={{
              mt: 3,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 800,
              lineHeight: 1.1,
              fontSize: { xs: '2.2rem', sm: '3.2rem', md: '4.2rem' },
              letterSpacing: '-0.02em',
              color: '#002e4d',
            }}>
              Eliminate the <br />
              <Box component="span" sx={{
                background: 'linear-gradient(90deg, #0079c1 0%, #005a90 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Fog of Crisis.
              </Box>
            </Typography>

            <Typography className="hero-reveal" sx={{ mt: 3, maxWidth: 620, color: 'text.secondary', lineHeight: 1.75, fontSize: '1.05rem' }}>
              The GIS-powered emergency operations solution for enterprise properties. 
              Deploy tactical digital twins to EOCs, executives, security personnel, and constituents to synchronize live response in real time.
            </Typography>

            <Stack className="hero-reveal" direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
              <Button
                onClick={() => setOpenRequest(true)}
                endIcon={<ArrowOutward />}
                variant="contained"
                sx={{
                  py: 1.35,
                  px: 3.2,
                  color: '#ffffff',
                  fontWeight: 600,
                  textTransform: 'none',
                  backgroundColor: '#0079c1',
                  boxShadow: 'none',
                  '&:hover': { backgroundColor: '#005a90' },
                }}
              >
                Request Demo
              </Button>
              <Button
                component="a"
                href="#ecosystem"
                startIcon={<PlayArrow />}
                variant="outlined"
                sx={{
                  py: 1.35,
                  px: 3,
                  textTransform: 'none',
                  color: '#0079c1',
                  borderColor: 'rgba(0,121,193,0.3)',
                  fontWeight: 600,
                  '&:hover': { borderColor: '#0079c1', background: 'rgba(0,121,193,0.04)' },
                }}
              >
                View Simulation
              </Button>
            </Stack>

            <Grid className="hero-reveal" container spacing={2} sx={{ mt: 4, maxWidth: 500 }}>
              {[
                ['<800ms', 'Telemetry Latency'],
                ['99.99%', 'Operations Uptime'],
                ['24/7/365', 'GIS Maintained'],
              ].map(([value, label]) => (
                <Grid key={label} size={4}>
                  <Box sx={{ borderLeft: '2px solid #0079c1', pl: 1.5 }}>
                    <Typography sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: { xs: '1.05rem', sm: '1.2rem', md: '1.3rem' }, color: '#002e4d' }}>{value}</Typography>
                    <Typography sx={{ mt: 0.5, fontFamily: 'JetBrains Mono, monospace', fontSize: { xs: '0.52rem', sm: '0.58rem' }, letterSpacing: '0.12em', color: 'text.secondary' }}>{label}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <Paper className="hero-reveal" sx={{
              overflow: 'hidden',
              borderRadius: 3,
              border: '1px solid rgba(0, 121, 193, 0.12)',
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.1)',
            }}>
              <Stack direction="row" sx={{ px: 2, py: 1.5, justifyContent: 'space-between', borderBottom: '1px solid rgba(0,121,193,0.08)' }}>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', letterSpacing: '0.16em', color: 'text.secondary', fontWeight: 700 }}>
                  TWIN · ENTERPRISE PROPERTY · FLOOR 1-18
                </Typography>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', color: '#0079c1', fontWeight: 700 }}>CH.01 // LIVE</Typography>
              </Stack>
              <Box component="img" src={heroTwinImage} alt="Digital twin visualization" sx={{ width: '100%', display: 'block' }} />

              <Paper className="panel-float-a" sx={{
                position: 'absolute',
                display: { xs: 'none', sm: 'block' },
                mt: -30,
                ml: 2,
                px: 1.4,
                py: 1,
                borderRadius: 1.4,
                bgcolor: 'rgba(255,255,255,0.95)',
                border: '1px solid #2e7d32',
                boxShadow: '0 8px 16px rgba(0,0,0,0.06)',
              }}>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.53rem', letterSpacing: '0.15em', color: 'text.secondary' }}>OCCUPANCY</Typography>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.86rem', color: '#2e7d32', fontWeight: 700 }}>847 / 1200 SAFE</Typography>
              </Paper>

              <Paper className="panel-float-b" sx={{
                position: 'absolute',
                display: { xs: 'none', sm: 'block' },
                right: 16,
                mt: -18,
                px: 1.4,
                py: 1,
                borderRadius: 1.4,
                bgcolor: 'rgba(255,255,255,0.95)',
                border: '1px solid #d32f2f',
                boxShadow: '0 8px 16px rgba(0,0,0,0.06)',
              }}>
                <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                  <Box className="pulse-dot" sx={{ width: 6, height: 6, borderRadius: '50%', background: '#d32f2f' }} />
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.53rem', letterSpacing: '0.15em', color: '#d32f2f', fontWeight: 700 }}>ALERT · FLOOR 12</Typography>
                </Stack>
                <Typography sx={{ mt: 0.4, fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: 'text.primary', fontWeight: 500 }}>Smoke detected · Zone B</Typography>
              </Paper>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Partners / Trust Banner */}
      <Box sx={{ position: 'relative', zIndex: 2, borderTop: '1px solid rgba(0, 121, 193, 0.08)', borderBottom: '1px solid rgba(0, 121, 193, 0.08)', py: 5, background: '#f8f9fa' }}>
        <Container maxWidth="xl">
          <Typography sx={{ textAlign: 'center', mb: 4, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', letterSpacing: '0.22em', color: 'text.secondary', fontWeight: 700 }}>
            POWERING CRISIS RESPONSE FOR GLOBAL PROPERTIES AND PUBLIC INFRASTRUCTURE
          </Typography>
          <Grid container spacing={2.5} sx={{ justifyContent: 'center' }}>
            {trustLogos.map((logo) => (
              <Grid key={logo.name} size={{ xs: 6, sm: 4, md: 2.4 }}>
                <Paper className="scroll-reveal" sx={{ py: 2, px: 1, textAlign: 'center', bgcolor: '#ffffff', border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'none' }}>
                  <Typography sx={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', letterSpacing: '0.12em', fontWeight: 800, color: '#002e4d' }}>{logo.name}</Typography>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.52rem', letterSpacing: '0.2em', color: 'text.secondary' }}>{logo.sub}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* GIS & Evacuation Capabilities / Features */}
      <Container id="features" maxWidth="xl" sx={{ py: { xs: 8, md: 14 }, position: 'relative', zIndex: 2 }}>
        <Typography className="scroll-reveal" sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: '#0079c1', letterSpacing: '0.24em', fontWeight: 700 }}>03 KEY CAPABILITIES</Typography>
        <Typography className="scroll-reveal" sx={{ mt: 2, maxWidth: 760, fontFamily: 'Inter, sans-serif', fontWeight: 800, lineHeight: 1.15, fontSize: { xs: '2rem', md: '3.2rem' }, color: '#002e4d' }}>
          A unified <Box component="span" sx={{ color: '#0079c1' }}>operations stack</Box> for any emergency.
        </Typography>

        <Grid container spacing={2.5} sx={{ mt: 4.5 }}>
          {moduleFeatures.map((feature) => (
            <Grid key={feature.title} size={{ xs: 12, md: 4 }}>
              <Paper className="scroll-reveal" sx={{
                height: '100%',
                p: { xs: 2.5, sm: 3.2 },
                borderRadius: 3,
                border: '1px solid rgba(0,0,0,0.06)',
                backgroundColor: '#ffffff',
                boxShadow: '0 8px 30px rgba(0,0,0,0.02)',
              }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 3 }}>
                  <Box sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1.8,
                    display: 'grid',
                    placeItems: 'center',
                    color: feature.color,
                    background: `${feature.color}10`,
                    border: `1px solid ${feature.color}35`,
                  }}>
                    {feature.icon}
                  </Box>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', letterSpacing: '0.18em', color: 'text.secondary', fontWeight: 700 }}>{feature.code}</Typography>
                </Stack>
                <Typography sx={{ fontWeight: 700, mb: 1.5, fontSize: '1.1rem', color: '#002e4d' }}>{feature.title}</Typography>
                <Typography sx={{ color: 'text.secondary', lineHeight: 1.75 }}>{feature.description}</Typography>
                <Divider sx={{ my: 2.5, borderColor: 'rgba(0,0,0,0.06)' }} />
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', letterSpacing: '0.15em', color: 'text.secondary' }}>STATUS</Typography>
                  <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', color: feature.color }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: feature.color }} />
                    <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', letterSpacing: '0.14em', fontWeight: 700 }}>OPERATIONAL</Typography>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Ecosystem Section */}
      <Container id="ecosystem" maxWidth="xl" sx={{ py: { xs: 8, md: 13 }, position: 'relative', zIndex: 2 }}>
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography className="scroll-reveal" sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: '#0079c1', letterSpacing: '0.22em', fontWeight: 700 }}>THE ECOSYSTEM</Typography>
          <Typography className="scroll-reveal" sx={{ mt: 2, fontFamily: 'Inter, sans-serif', fontWeight: 800, lineHeight: 1.15, fontSize: { xs: '2rem', md: '3rem' }, color: '#002e4d' }}>
            One source of truth. <br />
            <Box component="span" sx={{ color: '#0079c1' }}>Every device, every second.</Box>
          </Typography>
        </Box>

        <Paper className="scroll-reveal" sx={{ p: 1.2, borderRadius: 3.5, bgcolor: '#f8f9fa', border: '1px solid rgba(0,0,0,0.06)', boxShadow: 'none' }}>
          <Box component="img" src={ecosystemImage} alt="Ecosystem" sx={{ width: '100%', borderRadius: 2.5, display: 'block' }} />
          <Grid container spacing={2} sx={{ mt: { xs: 2, md: -13 }, px: { xs: 1.5, md: 4 }, pb: 2.5, position: 'relative' }}>
            {[
              ['ADMIN COMMAND', 'Operations Dashboard', 'Multi-floor live coordination center', <MonitorHeartOutlined key="admin" />],
              ['CONSTITUENTS', 'Safety Companion Portal', 'One-tap emergency communication', <LanguageOutlined key="guest" />],
              ['LIVE SIMULATOR', 'Digital Twin Simulator', '3D space hazard & smoke visualizer', <ThreeDRotationOutlined key="viz" />],
            ].map(([tag, title, desc, icon]) => (
              <Grid key={tag as string} size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 2.5, borderRadius: 2, backdropFilter: 'blur(8px)', bgcolor: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 8px 24px rgba(0,0,0,0.03)' }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                    <Box sx={{ color: '#0079c1', display: 'grid', placeItems: 'center' }}>{icon}</Box>
                    <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', color: '#0079c1', letterSpacing: '0.18em', fontWeight: 700 }}>{tag}</Typography>
                  </Stack>
                  <Typography sx={{ fontWeight: 700, color: '#002e4d' }}>{title}</Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.88rem', mt: 0.5 }}>{desc}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Container>

      {/* Infrastructure & Architecture */}
      <Container id="architecture" maxWidth="xl" sx={{ py: { xs: 8, md: 12 }, position: 'relative', zIndex: 2 }}>
        <Grid container spacing={5}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <Typography className="scroll-reveal" sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: '#0079c1', letterSpacing: '0.22em', fontWeight: 700 }}>GIS ARCHITECTURE</Typography>
            <Typography className="scroll-reveal" sx={{ mt: 2, fontFamily: 'Inter, sans-serif', fontWeight: 800, lineHeight: 1.15, fontSize: { xs: '2rem', md: '3rem' }, color: '#002e4d' }}>
              Enterprise-ready <br />
              <Box component="span" sx={{ color: '#0079c1' }}>multi-tenancy.</Box>
            </Typography>
            <Typography className="scroll-reveal" sx={{ mt: 2.5, maxWidth: 580, color: 'text.secondary', lineHeight: 1.75 }}>
              Built for compliance-heavy, high-occupancy corporate properties. Every query is geographically isolated, audit-logged, and optimized for sub-second telemetry streams.
            </Typography>

            <Paper className="scroll-reveal" sx={{ mt: 3.5, p: { xs: 2, sm: 2.4 }, borderRadius: 2, bgcolor: '#f4f6f9', border: '1px solid rgba(0,0,0,0.08)', boxShadow: 'none', overflowX: 'auto' }}>
              <Stack direction="row" spacing={0.9} sx={{ alignItems: 'center', mb: 1.5 }}>
                <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: '#d32f2f' }} />
                <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: '#ed6c02' }} />
                <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: '#2e7d32' }} />
                <Typography sx={{ ml: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', letterSpacing: '0.16em', color: 'text.secondary', fontWeight: 700 }}>DATABASE.TS</Typography>
              </Stack>
              <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.76rem', color: '#1e293b', lineHeight: 1.85, whiteSpace: 'nowrap' }}>
                const incident = await db<br />
                .queryWithContext(ctx)<br />
                .from('incidents')<br />
                .where('status', 'active');<br />
                <Box component="span" sx={{ color: 'text.secondary' }}>
                  // geographical context tenant_id auto-injected · 0ms overhead
                </Box>
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <Stack spacing={2}>
              {architecturePoints.map((point) => (
                <Paper key={point.title} className="scroll-reveal" sx={{ p: 2.6, borderRadius: 2.2, bgcolor: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                  <Stack direction="row" spacing={2}>
                    <Box sx={{ width: 44, height: 44, borderRadius: 1.4, display: 'grid', placeItems: 'center', color: '#0079c1', border: '1px solid rgba(0, 121, 193, 0.25)', bgcolor: 'rgba(0, 121, 193, 0.05)' }}>
                      {point.icon}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1.4, flexWrap: 'wrap', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontWeight: 700, color: '#002e4d' }}>{point.title}</Typography>
                        <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.64rem', color: '#2e7d32', fontWeight: 700 }}>{point.code}</Typography>
                      </Stack>
                      <Typography sx={{ mt: 0.6, color: 'text.secondary', lineHeight: 1.7, fontSize: '0.88rem' }}>{point.description}</Typography>
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Container>

      {/* Call to Action & Footer */}
      <Container id="cta" maxWidth="lg" sx={{ pt: 8, pb: 12, position: 'relative', zIndex: 2 }}>
        <Paper className="scroll-reveal" sx={{
          p: { xs: 4, md: 8 },
          textAlign: 'center',
          borderRadius: 3,
          border: '1px solid rgba(0, 121, 193, 0.1)',
          bgcolor: '#ffffff',
          backgroundImage: 'linear-gradient(130deg, rgba(0,121,193,0.06), rgba(211,47,47,0.03), rgba(46,125,50,0.03))',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.05)',
        }}>
          <Typography sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, lineHeight: 1.1, fontSize: { xs: '2rem', md: '3.2rem' }, color: '#002e4d' }}>
            Seconds save lives. <br />
            <Box component="span" sx={{ color: '#0079c1' }}>Ready to secure your property?</Box>
          </Typography>
          <Typography sx={{ mt: 2, color: 'text.secondary', maxWidth: 640, mx: 'auto', fontSize: '1rem' }}>
            Schedule a 30-minute demonstration with our systems specialists. We will model your corporate property floor plans live.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'center', mt: 4 }}>
            <Button
              variant="contained"
              onClick={() => setOpenRequest(true)}
              endIcon={<ArrowForward />}
              sx={{
                py: 1.3,
                px: 3,
                textTransform: 'none',
                fontWeight: 600,
                color: '#ffffff',
                background: '#0079c1',
                '&:hover': { background: '#005a90' },
              }}
            >
              Get Started with CrisisRespond
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/login')}
              sx={{ py: 1.3, px: 3, textTransform: 'none', color: '#0079c1', borderColor: 'rgba(0,121,193,0.3)', fontWeight: 600, '&:hover': { borderColor: '#0079c1', background: 'rgba(0,121,193,0.04)' } }}
            >
              Launch Dashboard
            </Button>
          </Stack>
        </Paper>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 5, justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: 'text.secondary', letterSpacing: '0.14em', textAlign: 'center', fontWeight: 700, mb: { xs: 1.5, md: 0 } }}>
            © 2026 CRISISRESPOND SYSTEMS INC · ALL RIGHTS RESERVED
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.5, sm: 3 }} sx={{ alignItems: 'center' }}>
            {['Security Operations', 'Regulatory Compliance', 'System Status'].map((item) => (
              <Typography key={item} sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: 'text.secondary', letterSpacing: '0.14em', fontWeight: 700, cursor: 'pointer', '&:hover': { color: 'primary.main' } }}>
                {item}
              </Typography>
            ))}
          </Stack>
        </Stack>
      </Container>

      <OnboardingRequestDialog open={openRequest} onClose={() => setOpenRequest(false)} />
    </Box>
  );
}

function OnboardingRequestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    orgName: '', orgType: 'hotel', address: '',
    contactName: '', contactEmail: '', contactPhone: '',
    expectedCapacity: '', additionalInfo: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API_URL}/platform/request-access`, {
        ...formData,
        expectedCapacity: parseInt(formData.expectedCapacity) || 0
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setFormData({
          orgName: '', orgType: 'hotel', address: '',
          contactName: '', contactEmail: '', contactPhone: '',
          expectedCapacity: '', additionalInfo: ''
        });
      }, 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      backgroundColor: '#f8f9fa',
      '& fieldset': { borderColor: 'rgba(0,0,0,0.1)' },
      '&:hover fieldset': { borderColor: 'rgba(0,121,193,0.3)' },
      '&.Mui-focused fieldset': { borderColor: '#0079c1' },
    },
    '& .MuiInputLabel-root': { color: 'text.secondary' }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2.5 } } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 3, color: '#002e4d' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Request Access / Onboard</Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pb: 4 }}>
        {success ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircle sx={{ fontSize: 64, color: '#2e7d32', mb: 2, opacity: 0.8 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#002e4d' }}>Tactical Onboarding Request Initiated</Typography>
            <Typography sx={{ color: 'text.secondary', mt: 1 }}>Request sent for structural and system coordination. Check email for updates.</Typography>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 8 }}><TextField fullWidth label="Organization Name" required sx={inputSx} value={formData.orgName} onChange={(e) => setFormData({ ...formData, orgName: e.target.value })} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><TextField select fullWidth label="Type" sx={inputSx} value={formData.orgType} onChange={(e) => setFormData({ ...formData, orgType: e.target.value })}>
                <MenuItem value="hotel">Hotel</MenuItem><MenuItem value="mall">Mall</MenuItem><MenuItem value="hospital">Hospital</MenuItem><MenuItem value="stadium">Stadium</MenuItem>
              </TextField></Grid>
              <Grid size={12}><TextField fullWidth label="Headquarters Address" multiline rows={2} required sx={inputSx} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Contact Name" required sx={inputSx} value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Contact Email" type="email" required sx={inputSx} value={formData.contactEmail} onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Phone" required sx={inputSx} value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Est. Daily Occupancy" type="number" sx={inputSx} value={formData.expectedCapacity} onChange={(e) => setFormData({ ...formData, expectedCapacity: e.target.value })} /></Grid>
              <Grid size={12}><TextField fullWidth label="Specific Security Protocols" multiline rows={2} sx={inputSx} value={formData.additionalInfo} onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })} /></Grid>
            </Grid>
            <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ mt: 4, py: 1.5, background: '#0079c1', color: '#ffffff', fontWeight: 600, '&:hover': { background: '#005a90' } }}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Submit Onboarding Request'}
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
