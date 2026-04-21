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
} from '@mui/material';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
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
    color: '#f6d365',
  },
  {
    code: 'MOD.02',
    icon: <PsychologyAltOutlined />,
    title: 'Llama 3.3 Intelligence',
    description: 'AI predicts bottlenecks and drafts evacuation routes from density and hazard telemetry.',
    color: '#4de6c6',
  },
  {
    code: 'MOD.03',
    icon: <ShieldOutlined />,
    title: 'Instant Staff Dispatch',
    description: 'Smart routing auto-assigns responders to high-risk zones with mobile escalation.',
    color: '#ff5c5c',
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

  useGSAP(() => {
    gsap.from('.reveal', {
      y: 22,
      opacity: 0,
      duration: 0.8,
      stagger: 0.08,
      ease: 'power3.out',
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
        color: '#f5f7fa',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#0a0d12',
        backgroundImage: `
          radial-gradient(ellipse at top, rgba(246, 211, 101, 0.18), transparent 55%),
          linear-gradient(rgba(246, 211, 101, 0.055) 1px, transparent 1px),
          linear-gradient(90deg, rgba(246, 211, 101, 0.055) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 64px 64px, 64px 64px',
      }}
    >
      <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.55) 100%)' }} />

      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          borderBottom: '1px solid rgba(246, 211, 101, 0.12)',
          background: 'rgba(10, 13, 18, 0.7)',
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
                background: 'linear-gradient(140deg, rgba(246, 211, 101, 0.95), rgba(246, 211, 101, 0.35))',
              }}>
                <FavoriteOutlined sx={{ fontSize: 18, color: '#121417' }} />
              </Box>
              <Box>
                <Typography sx={{ fontFamily: 'Orbitron, Inter, sans-serif', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.08em' }}>
                  CRISIS <Box component="span" sx={{ color: '#f6d365' }}>RESPOND</Box>
                </Typography>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.56rem', color: 'rgba(245,247,250,0.65)', letterSpacing: '0.2em' }}>
                  v3.3 // LIVE
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
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
                    sx={{ color: 'rgba(245,247,250,0.7)', textTransform: 'none', '&:hover': { color: '#f5f7fa' } }}
                  >
                    {text}
                  </Button>
                ))}
              </Stack>
              <Button onClick={() => navigate('/login')} sx={{ color: 'rgba(245,247,250,0.75)', textTransform: 'none' }}>
                Sign In
              </Button>
              <Button
                variant="contained"
                onClick={() => setOpenRequest(true)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  color: '#111',
                  background: 'linear-gradient(90deg, #f6d365 0%, #f7c98a 100%)',
                  '&:hover': { background: 'linear-gradient(90deg, #f7dea0 0%, #f5be74 100%)' },
                }}
              >
                Request Demo
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ pt: { xs: 15, md: 18 }, pb: 8, position: 'relative', zIndex: 2 }}>
        <Grid container spacing={6} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <Box className="reveal" sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              borderRadius: 10,
              py: 0.8,
              px: 1.6,
              border: '1px solid rgba(255,92,92,0.45)',
              background: 'rgba(255,92,92,0.1)',
            }}>
              <Box className="pulse-dot" sx={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5c5c' }} />
              <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.66rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#ff8f8f' }}>
                Live Incident Coordination
              </Typography>
            </Box>

            <Typography className="reveal" sx={{
              mt: 3,
              fontFamily: 'Fraunces, serif',
              fontWeight: 300,
              lineHeight: 1.04,
              fontSize: { xs: '2.8rem', md: '4.35rem' },
              letterSpacing: '-0.02em',
            }}>
              Eliminate the <br />
              <Box component="span" sx={{
                background: 'linear-gradient(90deg, #f6d365 0%, #f7c98a 50%, #fff0cc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Fog of Crisis.
              </Box>
            </Typography>

            <Typography className="reveal" sx={{ mt: 3, maxWidth: 620, color: 'rgba(245,247,250,0.74)', lineHeight: 1.75 }}>
              The AI-powered digital twin platform for enterprise emergency coordination.
              Synchronize security, staff, and guests in real time across every floor.
            </Typography>

            <Stack className="reveal" direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
              <Button
                onClick={() => setOpenRequest(true)}
                endIcon={<ArrowOutward />}
                variant="contained"
                sx={{
                  py: 1.35,
                  px: 3.2,
                  color: '#121417',
                  fontWeight: 700,
                  textTransform: 'none',
                  background: 'linear-gradient(90deg, #f6d365 0%, #f7c98a 100%)',
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
                  color: '#f5f7fa',
                  borderColor: 'rgba(245,247,250,0.18)',
                }}
              >
                View Simulation
              </Button>
            </Stack>

            <Grid className="reveal" container spacing={2} sx={{ mt: 4, maxWidth: 500 }}>
              {[
                ['<800ms', 'Latency'],
                ['99.99%', 'Uptime'],
                ['24/7', 'Monitored'],
              ].map(([value, label]) => (
                <Grid key={label} size={4}>
                  <Box sx={{ borderLeft: '1px solid rgba(246,211,101,0.35)', pl: 1.5 }}>
                    <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: { xs: '1.1rem', md: '1.35rem' } }}>{value}</Typography>
                    <Typography sx={{ mt: 0.5, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', letterSpacing: '0.18em', color: 'rgba(245,247,250,0.6)' }}>{label}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <Paper className="reveal" sx={{
              overflow: 'hidden',
              borderRadius: 3,
              border: '1px solid rgba(246,211,101,0.16)',
              background: 'linear-gradient(180deg, rgba(21,24,32,0.88), rgba(10,13,18,0.92))',
            }}>
              <Stack direction="row" sx={{ px: 2, py: 1.5, justifyContent: 'space-between', borderBottom: '1px solid rgba(246,211,101,0.14)' }}>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', letterSpacing: '0.16em', color: 'rgba(245,247,250,0.68)' }}>
                  TWIN · MARRIOTT NYC · FLOOR 1-18
                </Typography>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', color: '#f6d365' }}>CH.01</Typography>
              </Stack>
              <Box component="img" src={heroTwinImage} alt="Digital twin visualization" sx={{ width: '100%', display: 'block' }} />

              <Paper className="panel-float-a" sx={{
                position: 'absolute',
                mt: -30,
                ml: 2,
                px: 1.4,
                py: 1,
                borderRadius: 1.4,
                bgcolor: 'rgba(15,19,26,0.86)',
                border: '1px solid rgba(77,230,198,0.4)',
              }}>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.53rem', letterSpacing: '0.15em', color: 'rgba(245,247,250,0.6)' }}>OCCUPANCY</Typography>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.86rem', color: '#4de6c6', fontWeight: 700 }}>847 / 1200</Typography>
              </Paper>

              <Paper className="panel-float-b" sx={{
                position: 'absolute',
                right: 16,
                mt: -18,
                px: 1.4,
                py: 1,
                borderRadius: 1.4,
                bgcolor: 'rgba(15,19,26,0.86)',
                border: '1px solid rgba(255,92,92,0.42)',
              }}>
                <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                  <Box className="pulse-dot" sx={{ width: 6, height: 6, borderRadius: '50%', background: '#ff5c5c' }} />
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.53rem', letterSpacing: '0.15em', color: '#ff8f8f' }}>ALERT · FLOOR 12</Typography>
                </Stack>
                <Typography sx={{ mt: 0.4, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: '#f5f7fa' }}>Smoke detected · Zone B</Typography>
              </Paper>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      <Box sx={{ position: 'relative', zIndex: 2, borderTop: '1px solid rgba(246,211,101,0.12)', borderBottom: '1px solid rgba(246,211,101,0.12)', py: 5, background: 'rgba(12,16,22,0.52)' }}>
        <Container maxWidth="xl">
          <Typography sx={{ textAlign: 'center', mb: 4, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', letterSpacing: '0.22em', color: 'rgba(245,247,250,0.62)' }}>
            POWERING SAFETY FOR GLOBAL HOTEL CHAINS AND HOSPITAL NETWORKS
          </Typography>
          <Grid container spacing={2.5}>
            {trustLogos.map((logo) => (
              <Grid key={logo.name} size={{ xs: 6, md: 2.4 }}>
                <Paper className="reveal" sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(19,24,32,0.6)', border: '1px solid rgba(245,247,250,0.08)' }}>
                  <Typography sx={{ fontFamily: 'Orbitron, Inter, sans-serif', fontSize: '0.8rem', letterSpacing: '0.12em', fontWeight: 700 }}>{logo.name}</Typography>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.52rem', letterSpacing: '0.2em', color: 'rgba(245,247,250,0.6)' }}>{logo.sub}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Container id="features" maxWidth="xl" sx={{ py: { xs: 10, md: 14 }, position: 'relative', zIndex: 2 }}>
        <Typography className="reveal" sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: '#f6d365', letterSpacing: '0.24em' }}>03 MODULES</Typography>
        <Typography className="reveal" sx={{ mt: 2, maxWidth: 760, fontFamily: 'Fraunces, serif', fontWeight: 300, lineHeight: 1.12, fontSize: { xs: '2rem', md: '3.2rem' } }}>
          A unified <Box component="span" sx={{ color: '#f6d365' }}>command stack</Box> for any incident.
        </Typography>

        <Grid container spacing={2.5} sx={{ mt: 4.5 }}>
          {moduleFeatures.map((feature) => (
            <Grid key={feature.title} size={{ xs: 12, md: 4 }}>
              <Paper className="reveal" sx={{
                height: '100%',
                p: 3.2,
                borderRadius: 2.5,
                border: '1px solid rgba(245,247,250,0.1)',
                background: 'linear-gradient(180deg, rgba(22,27,35,0.9), rgba(15,19,26,0.75))',
              }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 3 }}>
                  <Box sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1.8,
                    display: 'grid',
                    placeItems: 'center',
                    color: feature.color,
                    background: `${feature.color}20`,
                    border: `1px solid ${feature.color}66`,
                  }}>
                    {feature.icon}
                  </Box>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', letterSpacing: '0.18em', color: 'rgba(245,247,250,0.6)' }}>{feature.code}</Typography>
                </Stack>
                <Typography sx={{ fontWeight: 600, mb: 1.5 }}>{feature.title}</Typography>
                <Typography sx={{ color: 'rgba(245,247,250,0.72)', lineHeight: 1.75 }}>{feature.description}</Typography>
                <Divider sx={{ my: 2.5, borderColor: 'rgba(245,247,250,0.1)' }} />
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', letterSpacing: '0.15em', color: 'rgba(245,247,250,0.56)' }}>STATUS</Typography>
                  <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', color: feature.color }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: feature.color, boxShadow: `0 0 10px ${feature.color}` }} />
                    <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', letterSpacing: '0.14em' }}>OPERATIONAL</Typography>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Container id="ecosystem" maxWidth="xl" sx={{ py: { xs: 8, md: 13 }, position: 'relative', zIndex: 2 }}>
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography className="reveal" sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: '#4de6c6', letterSpacing: '0.22em' }}>THE ECOSYSTEM</Typography>
          <Typography className="reveal" sx={{ mt: 2, fontFamily: 'Fraunces, serif', fontWeight: 300, lineHeight: 1.15, fontSize: { xs: '2rem', md: '3rem' } }}>
            One source of truth. <br />
            <Box component="span" sx={{ color: '#f6d365' }}>Every device, every second.</Box>
          </Typography>
        </Box>

        <Paper className="reveal" sx={{ p: 1.2, borderRadius: 3, bgcolor: 'rgba(15,19,26,0.7)', border: '1px solid rgba(245,247,250,0.12)' }}>
          <Box component="img" src={ecosystemImage} alt="Ecosystem" sx={{ width: '100%', borderRadius: 2.2, display: 'block' }} />
          <Grid container spacing={2} sx={{ mt: -13, px: { xs: 2, md: 4 }, pb: 2.5, position: 'relative' }}>
            {[
              ['ADMIN', 'Web Dashboard', 'Multi-floor live ops', <MonitorHeartOutlined key="admin" />],
              ['GUEST', 'iPhone SOS App', 'One-tap emergency', <LanguageOutlined key="guest" />],
              ['VIZ', 'Godot Simulator', '3D digital twin', <ThreeDRotationOutlined key="viz" />],
            ].map(([tag, title, desc, icon]) => (
              <Grid key={tag as string} size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 2, borderRadius: 1.8, backdropFilter: 'blur(8px)', bgcolor: 'rgba(10,13,18,0.7)', border: '1px solid rgba(245,247,250,0.12)' }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                    <Box sx={{ color: '#f6d365', display: 'grid', placeItems: 'center' }}>{icon}</Box>
                    <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', color: '#f6d365', letterSpacing: '0.18em' }}>{tag}</Typography>
                  </Stack>
                  <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
                  <Typography sx={{ color: 'rgba(245,247,250,0.68)', fontSize: '0.9rem' }}>{desc}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Container>

      <Container id="architecture" maxWidth="xl" sx={{ py: { xs: 8, md: 12 }, position: 'relative', zIndex: 2 }}>
        <Grid container spacing={5}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <Typography className="reveal" sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: '#f6d365', letterSpacing: '0.22em' }}>INFRASTRUCTURE</Typography>
            <Typography className="reveal" sx={{ mt: 2, fontFamily: 'Fraunces, serif', fontWeight: 300, lineHeight: 1.15, fontSize: { xs: '2rem', md: '3rem' } }}>
              Enterprise-ready <br />
              <Box component="span" sx={{ color: '#f6d365' }}>multi-tenancy.</Box>
            </Typography>
            <Typography className="reveal" sx={{ mt: 2.5, maxWidth: 580, color: 'rgba(245,247,250,0.72)', lineHeight: 1.75 }}>
              Built for compliance-heavy properties. Every query is authorized, every event auditable,
              every tenant isolated by design.
            </Typography>

            <Paper className="reveal" sx={{ mt: 3.5, p: 2.4, borderRadius: 2, bgcolor: 'rgba(12,16,22,0.85)', border: '1px solid rgba(245,247,250,0.1)' }}>
              <Stack direction="row" spacing={0.9} sx={{ alignItems: 'center', mb: 1.5 }}>
                <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: 'rgba(255,92,92,0.8)' }} />
                <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: 'rgba(246,211,101,0.8)' }} />
                <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: 'rgba(77,230,198,0.8)' }} />
                <Typography sx={{ ml: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', letterSpacing: '0.16em', color: 'rgba(245,247,250,0.58)' }}>TENANT.TS</Typography>
              </Stack>
              <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.76rem', color: '#f5f7fa', lineHeight: 1.85 }}>
                const incident = await db<br />
                .queryWithContext(ctx)<br />
                .from('incidents')<br />
                .where('status', 'active');<br />
                <Box component="span" sx={{ color: 'rgba(245,247,250,0.58)' }}>
                  // tenant_id auto-injected · 0ms overhead
                </Box>
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <Stack spacing={2}>
              {architecturePoints.map((point) => (
                <Paper key={point.title} className="reveal" sx={{ p: 2.6, borderRadius: 2.2, bgcolor: 'rgba(16,20,28,0.8)', border: '1px solid rgba(245,247,250,0.1)' }}>
                  <Stack direction="row" spacing={2}>
                    <Box sx={{ width: 44, height: 44, borderRadius: 1.4, display: 'grid', placeItems: 'center', color: '#f6d365', border: '1px solid rgba(246,211,101,0.4)', bgcolor: 'rgba(246,211,101,0.1)' }}>
                      {point.icon}
                    </Box>
                    <Box>
                      <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1.4, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontWeight: 700 }}>{point.title}</Typography>
                        <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.64rem', color: '#4de6c6' }}>{point.code}</Typography>
                      </Stack>
                      <Typography sx={{ mt: 0.6, color: 'rgba(245,247,250,0.7)', lineHeight: 1.7 }}>{point.description}</Typography>
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Container>

      <Container id="cta" maxWidth="lg" sx={{ pt: 8, pb: 12, position: 'relative', zIndex: 2 }}>
        <Paper className="reveal" sx={{
          p: { xs: 4, md: 8 },
          textAlign: 'center',
          borderRadius: 3,
          border: '1px solid rgba(245,247,250,0.14)',
          bgcolor: 'rgba(15,19,26,0.78)',
          backgroundImage: 'linear-gradient(130deg, rgba(246,211,101,0.12), rgba(255,92,92,0.1), rgba(77,230,198,0.08))',
        }}>
          <Typography sx={{ fontFamily: 'Fraunces, serif', fontWeight: 300, lineHeight: 1.1, fontSize: { xs: '2rem', md: '3.2rem' } }}>
            Seconds save lives. <br />
            <Box component="span" sx={{ color: '#f6d365' }}>Ready to secure your property?</Box>
          </Typography>
          <Typography sx={{ mt: 2, color: 'rgba(245,247,250,0.7)' }}>
            Schedule a 30-minute demo with our solutions team. We will model your floorplan live.
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
                fontWeight: 700,
                color: '#121417',
                background: 'linear-gradient(90deg, #f6d365 0%, #f7c98a 100%)',
              }}
            >
              Get Started with CrisisRespond
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/login')}
              sx={{ py: 1.3, px: 3, textTransform: 'none', color: '#f5f7fa', borderColor: 'rgba(245,247,250,0.2)' }}
            >
              Launch Dashboard
            </Button>
          </Stack>
        </Paper>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 5, justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: 'rgba(245,247,250,0.56)', letterSpacing: '0.14em', textAlign: { xs: 'center', md: 'left' } }}>
            © 2026 CRISISRESPOND SYSTEMS · ALL RIGHTS RESERVED
          </Typography>
          <Stack direction="row" spacing={3}>
            {['Security', 'Compliance', 'Status'].map((item) => (
              <Typography key={item} sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: 'rgba(245,247,250,0.62)', letterSpacing: '0.14em' }}>
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
      backgroundColor: 'rgba(255,255,255,0.02)',
      '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
    },
    '& .MuiInputLabel-root': { color: 'var(--text-secondary)' }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { background: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 } } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 400 }}>Onboard Organization</Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: 'var(--text-muted)' }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pb: 4 }}>
        {success ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircle sx={{ fontSize: 64, color: 'var(--accent-green)', mb: 2, opacity: 0.8 }} />
            <Typography variant="h6" sx={{ fontWeight: 400 }}>Protocol Initiated</Typography>
            <Typography sx={{ color: 'var(--text-muted)', mt: 1 }}>Request sent for tactical review. Check email for updates.</Typography>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            {error && <Alert severity="error" sx={{ mb: 3, background: 'rgba(255, 62, 62, 0.1)', color: 'var(--accent-red)', border: '1px solid rgba(255, 62, 62, 0.2)' }}>{error}</Alert>}
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
            <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ mt: 4, py: 1.5, background: '#fff', color: '#000', fontWeight: 600, '&:hover': { background: '#e2e8f0' } }}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Submit Onboarding Request'}
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
