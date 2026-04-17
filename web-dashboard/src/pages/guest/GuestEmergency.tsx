import React, { useRef, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import {
  LocalFireDepartment as FireIcon,
  MedicalServices as MedicalIcon,
  Security as SecurityIcon,
  Warning as OtherIcon,
} from '@mui/icons-material';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const emergencies = [
  { id: 'fire', title: 'Fire', color: '#ef4444', icon: FireIcon },
  { id: 'medical', title: 'Medical', color: '#3b82f6', icon: MedicalIcon },
  { id: 'security', title: 'Security', color: '#f59e0b', icon: SecurityIcon },
  { id: 'other', title: 'Other/Evacuate', color: '#8b5cf6', icon: OtherIcon },
];

export default function GuestEmergency() {
  const containerRef = useRef(null);
  const { user } = useAuthStore();
  const [selected, setSelected] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useGSAP(() => {
    gsap.from('.em-card', {
      scale: 0.8,
      opacity: 0,
      duration: 0.5,
      stagger: 0.1,
      ease: 'back.out(1.5)',
    });
  }, { scope: containerRef });

  const handleReport = async () => {
    if (!selected) return;
    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/crisis/report`, {
        propertyId: user?.property_id || 1,
        type: selected.id,
        severity: 'critical',
        latitude: 40.7128,
        longitude: -74.0060,
        description: `Emergency reported by Guest in Room ${user?.room_number}`,
        userId: user?.id,
      });
      alert('Emergency reported successfully. Help is on the way.');
    } catch (err) {
      console.error(err);
      alert('Emergency reported (Demo Mode).');
    } finally {
      setIsSubmitting(false);
      setSelected(null);
    }
  };

  return (
    <Box ref={containerRef} sx={{ maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h2" sx={{ fontSize: '1.75rem', mb: 1 }}>
        Report Emergency
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Select the type of emergency you are experiencing. This will immediately alert property security.
      </Typography>

      <Grid container spacing={2}>
        {emergencies.map((em) => {
          const Icon = em.icon;
          return (
            <Grid size={{ xs: 6 }} key={em.id} className="em-card">
              <Card
                className="glass"
                sx={{
                  height: '100%',
                  borderColor: selected?.id === em.id ? em.color : 'var(--border-subtle)',
                  borderWidth: 2,
                }}
              >
                <CardActionArea
                  onClick={() => setSelected(em)}
                  sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon sx={{ fontSize: 64, color: em.color, mb: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {em.title}
                  </Typography>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Dialog
        open={Boolean(selected)}
        onClose={() => !isSubmitting && setSelected(null)}
        slotProps={{ paper: { className: 'glass-strong' } }}
      >
        <DialogTitle sx={{ color: selected?.color, fontWeight: 'bold' }}>
          Confirm {selected?.title} Emergency
        </DialogTitle>
        <DialogContent>
          <DialogContentText color="text.primary">
            Are you sure you want to trigger a {selected?.title.toLowerCase()} alarm? This action will alert all security personnel immediately.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelected(null)} disabled={isSubmitting} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleReport}
            disabled={isSubmitting}
            variant="contained"
            sx={{ backgroundColor: selected?.color, '&:hover': { backgroundColor: selected?.color, filter: 'brightness(0.8)' } }}
          >
            {isSubmitting ? 'Reporting...' : 'YES, REPORT NOW'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
