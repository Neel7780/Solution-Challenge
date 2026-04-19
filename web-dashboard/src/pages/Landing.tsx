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
} from '@mui/material';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import {
  ShieldOutlined as Shield,
  LocationOnOutlined as LocationOn,
  SpeedOutlined as Speed,
  NotificationsActiveOutlined as NotificationsActive,
  SecurityOutlined as Security,
  HotelOutlined as Hotel,
  ArrowForward as ArrowForward,
  CheckCircle as CheckCircle,
  Business as BusinessIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const features = [
  {
    icon: <Shield />,
    title: 'Incident Command',
    description: 'Centralized telemetry for real-time coordination across global security networks.',
  },
  {
    icon: <LocationOn />,
    title: 'Geospatial Intelligence',
    description: 'Sub-second tracking of incident hotspots and occupant distribution via PostGIS.',
  },
  {
    icon: <NotificationsActive />,
    title: 'Broadcast Protocol',
    description: 'Multi-channel mass notifications across SMS, Push, and WebSockets.',
  },
  {
    icon: <Speed />,
    title: 'Sub-Second Latency',
    description: 'High-performance real-time data synchronization for immediate tactical response.',
  },
  {
    icon: <Security />,
    title: 'Enterprise RBAC',
    description: 'Hierarchical multi-tenant security architecture for global organizations.',
  },
  {
    icon: <Hotel />,
    title: 'Occupant Safety',
    description: 'Dedicated safety portal with zero-tap panic triggers and automated triage.',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const [openRequest, setOpenRequest] = useState(false);

  useGSAP(() => {
    gsap.from('.hero-text', {
      y: 40,
      opacity: 0,
      duration: 1,
      stagger: 0.2,
      ease: 'power4.out',
    });
    
    gsap.to('.hero-glow', {
      opacity: 0.6,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }, { scope: heroRef });

  return (
    <Box sx={{ minHeight: '100vh', background: '#000', color: '#fff', position: 'relative', overflow: 'hidden' }}>
      {/* Precision Grid Background */}
      <Box sx={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
        zIndex: 0,
      }} />

      {/* Decorative Glows */}
      <Box className="hero-glow" sx={{
        position: 'absolute', top: '15%', left: '10%', width: '40vw', height: '40vw',
        background: 'radial-gradient(circle, rgba(255, 62, 62, 0.08) 0%, transparent 70%)',
        filter: 'blur(80px)', zIndex: 1, pointerEvents: 'none'
      }} />
      <Box className="hero-glow" sx={{
        position: 'absolute', bottom: '10%', right: '5%', width: '35vw', height: '35vw',
        background: 'radial-gradient(circle, rgba(0, 245, 140, 0.05) 0%, transparent 70%)',
        filter: 'blur(80px)', zIndex: 1, pointerEvents: 'none', animationDelay: '1s'
      }} />

      {/* Navbar */}
      <Box sx={{ 
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, 
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)'
      }}>
        <Container maxWidth="xl">
          <Stack direction="row" sx={{ height: 64, alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 1 }}>
              CRISIS<Box component="span" sx={{ color: 'var(--accent-red)' }}>RESPOND</Box>
            </Typography>
            <Stack direction="row" spacing={3}>
              <Button onClick={() => navigate('/login')} sx={{ color: 'var(--text-secondary)', fontWeight: 400 }}>Sign In</Button>
              <Button 
                variant="contained" 
                onClick={() => setOpenRequest(true)}
                sx={{ background: '#fff', color: '#000', '&:hover': { background: '#e2e8f0' } }}
              >
                Get Started
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Hero Content */}
      <Container maxWidth="lg" ref={heroRef} sx={{ pt: 20, pb: 12, position: 'relative', zIndex: 2 }}>
        <Stack spacing={4} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <Chip 
            label="Multi-tenant Enterprise Protocol" 
            className="hero-text"
            sx={{ 
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em'
            }} 
          />
          <Typography variant="h1" className="hero-text" sx={{ 
            fontSize: { xs: '3rem', md: '5rem' }, fontWeight: 400, lineHeight: 1,
            background: 'linear-gradient(180deg, #FFFFFF 0%, rgba(255, 255, 255, 0.6) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', maxWidth: 900
          }}>
            Strategic Emergency <br /> 
            <Box component="span" sx={{ color: 'var(--accent-red)', WebkitTextFillColor: 'var(--accent-red)' }}>Response Infrastructure.</Box>
          </Typography>
          
          <Typography variant="h5" className="hero-text" sx={{ 
            color: 'var(--text-secondary)', maxWidth: 650, fontWeight: 300, lineHeight: 1.6, fontSize: '1.1rem' 
          }}>
            The high-precision crisis management platform for mission-critical venues. 
            Instant situational awareness, occupant telemetry, and tactical command.
          </Typography>

          <Stack direction="row" spacing={2} className="hero-text" sx={{ mt: 2 }}>
            <Button 
              size="large" variant="contained" 
              onClick={() => setOpenRequest(true)}
              sx={{ background: 'var(--accent-red)', px: 4, py: 1.2 }}
            >
              Onboard Organization
            </Button>
            <Button 
              size="large" variant="outlined" 
              onClick={() => navigate('/login')}
              sx={{ borderColor: 'rgba(255,255,255,0.1)', color: '#fff', px: 4 }}
            >
              Launch Dashboard
            </Button>
          </Stack>
        </Stack>

        {/* Feature Bento Grid */}
        <Grid container spacing={2} sx={{ mt: 15 }}>
          {features.map((f, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Paper sx={{ 
                p: 4, height: '100%', background: 'rgba(255,255,255,0.01)', 
                border: '1px solid rgba(255,255,255,0.03)', borderRadius: 2,
                transition: 'border-color 0.3s ease',
                '&:hover': { borderColor: 'rgba(255,255,255,0.1)' }
              }}>
                <Box sx={{ color: 'var(--accent-red)', mb: 2, opacity: 0.8, '& .MuiSvgIcon-root': { fontSize: 28 } }}>
                  {f.icon}
                </Box>
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 500, mb: 1 }}>{f.title}</Typography>
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.description}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Footer */}
      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.05)', py: 6, mt: 10 }}>
        <Container maxWidth="lg">
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              © 2025 CRISISRESPOND PROTOCOL. ALL RIGHTS RESERVED.
            </Typography>
            <Stack direction="row" spacing={4}>
              {['Status', 'Documentation', 'Enterprise', 'Terms'].map(t => (
                <Typography key={t} sx={{ color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', '&:hover': { color: '#fff' } }}>
                  {t}
                </Typography>
              ))}
            </Stack>
          </Stack>
        </Container>
      </Box>

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
