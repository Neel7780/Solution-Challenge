import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import WarningIcon from '@mui/icons-material/WarningAmber';
import RouteIcon from '@mui/icons-material/Route';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import { useAuthStore } from '../store/authStore';
import { useCrisisStore } from '../store/crisisStore';

const ROLE_WITH_COORDS = new Set(['responder', 'security', 'staff', 'admin', 'org_admin', 'super_admin']);

export default function LiveCrisisOverlay() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const {
    activeIncident,
    enrichment,
    coords,
    evacuationActive,
    bannerMessage,
    criticalVisible,
    roleTaskMessage,
    acknowledgeCritical,
  } = useCrisisStore();
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [nearTopExpanded, setNearTopExpanded] = useState(true);
  const [forceMinimized, setForceMinimized] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setNearTopExpanded(window.scrollY <= 24);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!evacuationActive) {
      setHoverExpanded(false);
      setForceMinimized(false);
      return;
    }

    // Show full details briefly on arrival, then collapse into compact mode.
    setHoverExpanded(true);
    setForceMinimized(false);
    const timer = window.setTimeout(() => setHoverExpanded(false), 5500);
    return () => window.clearTimeout(timer);
  }, [evacuationActive, activeIncident?.id]);

  if (!isAuthenticated || !user) return null;

  const showCoords = ROLE_WITH_COORDS.has(user.role);
  const coordText = coords?.latitude != null && coords?.longitude != null
    ? `Lat ${coords.latitude.toFixed(5)}, Lng ${coords.longitude.toFixed(5)}`
    : coords?.x != null && coords?.y != null
    ? `X ${coords.x}, Y ${coords.y}`
    : null;

  const guestRoutes = enrichment?.evacuationRoutes || activeIncident?.evacuation_routes;
  const guestPlan = guestRoutes?.guestEmergencyPlan || [];
  const guestTips = guestRoutes?.tips || [];
  const guestExits = guestRoutes?.safeExits || [];

  const isGuest = user.role === 'guest';
  const isOnGuestEmergency = location.pathname.startsWith('/guest/emergency');
  const isExpanded = !forceMinimized && (hoverExpanded || nearTopExpanded);

  return (
    <>
      {evacuationActive &&
        (forceMinimized ? (
          <Box sx={{ position: 'fixed', top: 76, right: 18, zIndex: 2000 }}>
            <Paper
              sx={{
                border: '1px solid rgba(255, 92, 92, 0.72)',
                background: 'rgba(70, 16, 22, 0.96)',
                borderRadius: '999px',
                boxShadow: '0 12px 28px rgba(0, 0, 0, 0.32)',
              }}
            >
              <IconButton
                aria-label="Expand live crisis alert"
                onClick={() => {
                  setForceMinimized(false);
                  setHoverExpanded(true);
                }}
                sx={{ color: '#ffd7d7', width: 42, height: 42 }}
              >
                <WarningIcon fontSize="small" />
              </IconButton>
            </Paper>
          </Box>
        ) : (
          <Box
            sx={{ position: 'fixed', top: 72, left: { xs: 8, sm: 16 }, right: 16, zIndex: 2000 }}
            onMouseEnter={() => {
              if (!forceMinimized) setHoverExpanded(true);
            }}
            onMouseLeave={() => setHoverExpanded(false)}
            onFocusCapture={() => {
              if (!forceMinimized) setHoverExpanded(true);
            }}
            onBlurCapture={() => setHoverExpanded(false)}
          >
            <Alert
              icon={<WarningIcon />}
              severity="error"
              sx={{
                border: '1px solid rgba(255, 92, 92, 0.65)',
                background: 'rgba(70, 16, 22, 0.92)',
                color: '#fff',
                alignItems: 'center',
                transition: 'all 220ms ease',
                py: isExpanded ? 1 : 0.45,
                '& .MuiAlert-message': { width: '100%' },
              }}
              action={
                <Stack direction="row" spacing={1}>
                  {isExpanded && (
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() => {
                        setForceMinimized(true);
                        setHoverExpanded(false);
                      }}
                    >
                      Minimize
                    </Button>
                  )}
                  {isExpanded && isGuest && !isOnGuestEmergency && (
                    <Button color="inherit" size="small" onClick={() => navigate('/guest/emergency')}>
                      Emergency View
                    </Button>
                  )}
                  {showCoords && (
                    <Button color="inherit" size="small" onClick={() => navigate('/dashboard/locations')}>
                      Open Map
                    </Button>
                  )}
                </Stack>
              }
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
                <Chip size="small" label="LIVE CRISIS" sx={{ bgcolor: 'rgba(255, 92, 92, 0.24)', color: '#fff', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }} />
                <Typography sx={{ fontWeight: 700 }}>AI Emergency Broadcast</Typography>
                <Typography
                  sx={{
                    color: 'rgba(255,255,255,0.92)',
                    display: '-webkit-box',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: isExpanded ? 'unset' : 1,
                    whiteSpace: isExpanded ? 'normal' : 'nowrap',
                    maxWidth: isExpanded ? 'none' : { xs: 210, sm: 420, md: 640 },
                  }}
                >
                  {bannerMessage}
                </Typography>
                {coordText && (
                  <Chip
                    icon={<RouteIcon />}
                    size="small"
                    label={`Coordinates: ${coordText}`}
                    sx={{ bgcolor: 'rgba(246, 211, 101, 0.22)', color: '#fbe5a3' }}
                  />
                )}
                {!isExpanded && (
                  <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
                    Hover or scroll to top to expand
                  </Typography>
                )}
              </Stack>
            </Alert>
          </Box>
        ))}

      <Dialog
        open={criticalVisible}
        onClose={acknowledgeCritical}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              border: '1px solid rgba(255, 92, 92, 0.55)',
              background: 'linear-gradient(180deg, rgba(21, 15, 20, 0.95), rgba(10, 13, 18, 0.96))',
              boxShadow: '0 0 40px rgba(255,92,92,0.22)',
            },
          },
        }}
      >
        <DialogTitle>
          <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
            <PsychologyIcon sx={{ color: 'var(--accent-orange)' }} />
            <Typography sx={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>AI Detected Live Crisis</Typography>
            <Chip label="Immediate Action Required" size="small" sx={{ bgcolor: 'rgba(255,92,92,0.2)', color: '#ffb3b3' }} />
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Typography sx={{ mb: 2.2 }}>{enrichment?.massAlertMessage || activeIncident?.mass_alert_message || bannerMessage}</Typography>

          {roleTaskMessage && !isGuest && (
            <Paper sx={{ p: 1.6, mb: 2, border: '1px solid rgba(246, 211, 101, 0.22)', bgcolor: 'rgba(246, 211, 101, 0.07)' }}>
              <Typography sx={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', fontSize: '0.72rem', color: 'var(--accent-orange)', mb: 0.5 }}>
                ROLE TASKING
              </Typography>
              <Typography>{roleTaskMessage}</Typography>
            </Paper>
          )}

          {showCoords && coordText && (
            <Paper sx={{ p: 1.6, mb: 2, border: '1px solid rgba(77, 230, 198, 0.25)', bgcolor: 'rgba(77, 230, 198, 0.07)' }}>
              <Typography sx={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', fontSize: '0.72rem', color: 'var(--accent-green)', mb: 0.5 }}>
                CRISIS COORDINATES
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{coordText}</Typography>
            </Paper>
          )}

          {isGuest && (
            <Stack spacing={1.5}>
              {guestExits.length > 0 && (
                <Box>
                  <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.1em', color: 'var(--accent-orange)', mb: 0.5 }}>
                    SAFE EXITS
                  </Typography>
                  <Typography>{guestExits.join(' • ')}</Typography>
                </Box>
              )}

              {guestPlan.length > 0 && (
                <Box>
                  <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.1em', color: 'var(--accent-orange)', mb: 0.5 }}>
                    EVACUATION PLAN
                  </Typography>
                  {guestPlan.slice(0, 5).map((step: string, idx: number) => (
                    <Typography key={`${step}-${idx}`} sx={{ mb: 0.25 }}>{`${idx + 1}. ${step}`}</Typography>
                  ))}
                </Box>
              )}

              {guestTips.length > 0 && (
                <Box>
                  <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center', mb: 0.5 }}>
                    <TipsAndUpdatesIcon sx={{ fontSize: 16, color: 'var(--accent-green)' }} />
                    <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.1em', color: 'var(--accent-green)' }}>
                      SAFETY TIPS
                    </Typography>
                  </Stack>
                  {guestTips.slice(0, 4).map((tip: string, idx: number) => (
                    <Typography key={`${tip}-${idx}`} sx={{ mb: 0.25 }}>{`• ${tip}`}</Typography>
                  ))}
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.4 }}>
          {isGuest ? (
            <Button variant="contained" color="error" onClick={() => { acknowledgeCritical(); navigate('/guest/check-in'); }}>
              Open Check-In
            </Button>
          ) : (
            <Button variant="contained" onClick={() => { acknowledgeCritical(); navigate('/dashboard/locations'); }}>
              Open Crisis Map
            </Button>
          )}
          <Button color="inherit" onClick={acknowledgeCritical}>
            Acknowledge
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
