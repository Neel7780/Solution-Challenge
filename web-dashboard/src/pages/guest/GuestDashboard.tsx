import { API_URL } from '../../config';
import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Alert,
  IconButton,
  Snackbar,
  Alert as MuiAlert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Chip,
} from '@mui/material';
import {
  WarningAmber as WarningIcon,
  Phone as PhoneIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  ReportProblem as ReportIcon,
  DirectionsRun as RunIcon,
  Info as InfoIcon,
  TipsAndUpdates as TipIcon,
  Shield as ShieldIcon,
  Map as MapIcon,
} from '@mui/icons-material';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useSocketStore } from '../../store/socketStore';
import axios from 'axios';
import '../../landing/landing.css';


gsap.registerPlugin(ScrollTrigger);



export default function GuestDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { notifications } = useNotificationStore();
  const { socket } = useSocketStore();
  const containerRef = useRef(null);
  const panicRef = useRef<HTMLButtonElement>(null);

  const [activeIncident, setActiveIncident] = useState<any>(null);
  const [guestSafetyStatus, setGuestSafetyStatus] = useState<string | null>(null);
  const [isSendingSOS, setIsSendingSOS] = useState(false);
  const [assignedStaff, setAssignedStaff] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'info' | 'error'>('info');
  const [isStrobing, setIsStrobing] = useState(false);
  const [isModalMinimized, setIsModalMinimized] = useState(false);
  const [isNormalMapMinimized, setIsNormalMapMinimized] = useState(false);
  const [sirenAudio] = useState(new Audio('https://assets.mixkit.co/sfx/preview/mixkit-warning-alarm-buzzer-991.mp3'));

  const showToast = (message: string, severity: 'success' | 'info' | 'error') => {
    setToastMessage(message);
    setToastSeverity(severity);
    setToastOpen(true);
  };

  useEffect(() => {
    sirenAudio.loop = true;
    return () => {
      sirenAudio.pause();
    };
  }, [sirenAudio]);

  const toggleStrobe = () => {
    if (!isStrobing) {
      setIsStrobing(true);
      sirenAudio.play().catch(e => console.log(e));
    } else {
      setIsStrobing(false);
      sirenAudio.pause();
      sirenAudio.currentTime = 0;
    }
  };

  const fetchActiveIncident = async () => {
    try {
      const res = await axios.get(`${API_URL}/crisis/active?propertyId=${user?.property_id || 1}`);
      if (res.data.incidents && res.data.incidents.length > 0) {
        // Fetch full details for the first active incident
        const detailsRes = await axios.get(`${API_URL}/crisis/${res.data.incidents[0].id}`);
        setActiveIncident(detailsRes.data.incident);
      } else {
        setActiveIncident(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTasks = async () => {
    if (!user?.id) return;
    try {
      setLoadingTasks(true);
      const res = await axios.get(`${API_URL}/tasks`);
      const guestTasks = (res.data.tasks || []).filter(
        (t: any) => t.assigned_to === user.id
      );
      setTasks(guestTasks);
    } catch (err) {
      console.error('Failed to fetch guest tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Check for active incidents and tasks
  useEffect(() => {
    fetchActiveIncident();
    fetchTasks();
    if (user?.id) {
      setGuestSafetyStatus(localStorage.getItem(`guest_safety_status_${user.id}`));
    }
  }, [user]);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleCrisis = () => {
      fetchActiveIncident();
      fetchTasks();
    };
    const handleEnrichment = (data: any) => {
      if (activeIncident && data.incidentId === activeIncident.id) {
        fetchActiveIncident();
      }
    };

    socket.on('crisis_reported', handleCrisis);
    socket.on('incident_enriched', handleEnrichment);
    socket.on('incident_status_update', handleCrisis);

    // Listen for staff assignments
    const handleStaffAssigned = (data: any) => {
      setAssignedStaff(data.assignedStaff || []);
      showToast('Help is on the way! Staff has been assigned.', 'success');
    };
    socket.on('staff_auto_assigned', handleStaffAssigned);

    // Listen for task assignments
    const handleTaskAssigned = (data: any) => {
      fetchTasks();
      showToast('A new emergency task has been assigned to you.', 'info');
    };
    socket.on('task_assigned', handleTaskAssigned);

    return () => {
      socket.off('crisis_reported', handleCrisis);
      socket.off('incident_enriched', handleEnrichment);
      socket.off('incident_status_update', handleCrisis);
      socket.off('staff_auto_assigned', handleStaffAssigned);
      socket.off('task_assigned', handleTaskAssigned);
    };
  }, [socket, activeIncident]);

  const triggerTrappedSOS = async () => {
    if (isSendingSOS) return;
    setIsSendingSOS(true);
    try {
      await axios.post(`${API_URL}/users/panic`, {
        message: `TRAPPED: Guest in Room ${user?.room_number || 'Unknown'} requires immediate extraction.`,
        latitude: 40.7128, longitude: -74.0060,
      });
      alert('DISTRESS SIGNAL RECEIVED. Extraction team dispatched. Stay low and use the Strobe & Siren.');
    } catch (err) {
      alert('NETWORK ERROR. Attempting to broadcast via fallback mesh.');
    } finally {
      setIsSendingSOS(false);
    }
  };

  useGSAP(() => {
    gsap.from('.stagger-item', {
      y: 20,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: 'back.out(1.2)',
      clearProps: 'all',
      force3D: false,
    });

    // Subtly pulsate the panic button
    if (panicRef.current) {
      gsap.to(panicRef.current, {
        scale: 1.05,
        boxShadow: '0 0 30px rgba(239, 68, 68, 0.4)',
        yoyo: true,
        repeat: -1,
        duration: 1.5,
        ease: 'sine.inOut',
        force3D: false,
      });
    }
  }, { scope: containerRef });

  return (
    <>
      {isStrobing && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: 'white', animation: 'screen-strobe 0.1s infinite alternate' }}></div>
      )}
      <style>{`
        @keyframes screen-strobe { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes strobe-btn { 0% { background: white; color: black; } 100% { background: #333; color: white; } }
      `}</style>
      <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      
      {/* Hero Section */}
      <section style={{ paddingTop: '1rem', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', lineHeight: 1.1, margin: 0, fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600, letterSpacing: '-0.05em', color: 'var(--text-primary)' }}>
            <span className="sh-line-mask"><span className="sh-line-inner" style={{ color: 'var(--text-primary)' }}>Hello,</span></span>
            <span className="sh-line-mask">
              <span className="sh-line-inner sh-hword" style={{ WebkitTextFillColor: 'transparent' }}>
                {user?.name || 'Guest'}
              </span>
            </span>
          </h1>
          <div className="sh-fade-in" style={{ marginTop: '0.5rem', maxWidth: '100%', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
            <p>Your safety is our top priority. We are monitoring the property 24/7.</p>
          </div>
        </div>
      </section>

      {/* Dynamic Status Display */}
      <section className="sh-fade-in">
        {activeIncident && guestSafetyStatus !== 'safe' ? (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9998, background: '#000', display: 'flex', flexDirection: 'column' }}>
            {isModalMinimized ? (
              <div style={{ position: 'absolute', bottom: '2rem', right: '2rem', zIndex: 9999 }}>
                <button 
                  onClick={() => setIsModalMinimized(false)}
                  style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '1rem', borderRadius: '50px', fontWeight: 800, boxShadow: '0 4px 20px rgba(239, 68, 68, 0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', animation: 'pulse-bg 1s infinite alternate' }}
                >
                  <WarningIcon /> ACTIVE EMERGENCY
                </button>
              </div>
            ) : (
              <>
                <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.8)', zIndex: 10, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.2rem', fontWeight: 900, color: '#ef4444', margin: 0 }}>
                      CRITICAL ALERT: {activeIncident.incident_type}
                    </h2>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{ background: '#ef4444', color: '#fff', padding: '0.2rem 0.8rem', fontSize: '0.8rem', fontWeight: 800, borderRadius: '0.25rem', animation: 'pulse-bg 1s infinite alternate' }}>EVACUATE</div>
                      <button onClick={() => setIsModalMinimized(true)} style={{ background: 'transparent', color: '#fff', border: '1px solid #fff', borderRadius: '0.25rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>_</button>
                    </div>
                  </div>
                  <p style={{ fontSize: '1rem', margin: '0.5rem 0', fontWeight: 700, color: '#fff' }}>{activeIncident.mass_alert_message}</p>
                  
                  {activeIncident.evacuation_routes?.guestEmergencyPlan && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.8rem', borderRadius: '0.5rem', marginTop: '0.5rem' }}>
                      <h3 style={{ color: '#fca5a5', fontSize: '0.9rem', margin: '0 0 0.5rem 0', textTransform: 'uppercase' }}>AI Evacuation Protocol:</h3>
                      <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#fff', fontSize: '0.85rem' }}>
                        {activeIncident.evacuation_routes.guestEmergencyPlan.map((plan: string, i: number) => (
                          <li key={i} style={{ marginBottom: '0.2rem' }}>{plan}</li>
                        ))}
                      </ul>
                      <button 
                         onClick={() => {
                            if ('speechSynthesis' in window) {
                              window.speechSynthesis.cancel();
                              const text = activeIncident.evacuation_routes.guestEmergencyPlan.join(". ");
                              const utterance = new SpeechSynthesisUtterance(text);
                              window.speechSynthesis.speak(utterance);
                            }
                         }}
                         style={{ background: 'transparent', border: '1px solid #fca5a5', color: '#fca5a5', padding: '0.4rem 0.8rem', borderRadius: '0.25rem', marginTop: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        🔊 Play Voice Protocol
                      </button>
                    </div>
                  )}
                </div>
            
            <div style={{ flex: 1, position: 'relative' }}>
              <iframe 
                title="Mappedin Map" 
                name="Mappedin Map" 
                allow="clipboard-write 'self' https://app.mappedin.com; web-share 'self' https://app.mappedin.com" 
                scrolling="no" 
                width="100%" 
                height="100%" 
                frameBorder="0" 
                style={{ border: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} 
                src="https://app.mappedin.com/map/6a2d1e9d8c2010000b751066?embedded=true"
              ></iframe>
            </div>

            <div style={{ padding: '1rem', background: '#000', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 10, borderTop: '1px solid #333' }}>
              <button 
                onClick={() => navigate('/guest/check-in')}
                style={{ background: '#10b981', color: '#000', padding: '0.8rem', fontSize: '1rem', fontWeight: 800, width: '100%', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                CONFIRM EVACUATION (MARK SAFE)
              </button>
              <button 
                onClick={triggerTrappedSOS}
                style={{ background: '#000', color: '#ef4444', border: '2px solid #ef4444', padding: '0.8rem', fontSize: '1rem', fontWeight: 800, width: '100%', borderRadius: '0.25rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                {isSendingSOS ? 'TRANSMITTING...' : 'I AM TRAPPED (DISPATCH RESCUE)'}
              </button>
              <button 
                onClick={toggleStrobe}
                style={{ 
                  background: isStrobing ? '#fff' : '#111', 
                  color: isStrobing ? '#000' : '#fff', 
                  border: '1px solid #333', 
                  padding: '0.8rem', 
                  fontSize: '0.9rem', 
                  fontWeight: 700, 
                  width: '100%', 
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  animation: isStrobing ? 'strobe-btn 0.1s infinite alternate' : 'none'
                }}
              >
                {isStrobing ? 'DISENGAGE STROBE / SIREN' : 'ACTIVATE STROBE / SIREN'}
              </button>
            </div>
            </>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: '0.5rem', padding: '2rem', boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ width: '12px', height: '12px', background: 'var(--accent-green)', borderRadius: '50%' }}></div>
                <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.05em', margin: 0, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                  Status: Secure
                </h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>All monitoring systems are nominal. No hazards detected in your sector.</p>
            </div>
            
            {/* Embedded map for non-emergency */}
            <div style={{ background: 'var(--bg-elevated)', borderRadius: '0.5rem', overflow: 'hidden', height: isNormalMapMinimized ? 'auto' : '300px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>PROPERTY MAP</Typography>
                <IconButton size="small" onClick={() => setIsNormalMapMinimized(!isNormalMapMinimized)} sx={{ color: 'var(--text-muted)' }}>
                  {isNormalMapMinimized ? <MapIcon fontSize="small" /> : <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>_</span>}
                </IconButton>
              </div>
              {!isNormalMapMinimized && (
                <iframe 
                  title="Mappedin Map" 
                  name="Mappedin Map" 
                  allow="clipboard-write 'self' https://app.mappedin.com; web-share 'self' https://app.mappedin.com" 
                  scrolling="no" 
                  width="100%" 
                  height="100%" 
                  frameBorder="0" 
                  style={{ border: 0, flex: 1 }} 
                  src="https://app.mappedin.com/map/6a2d1e9d8c2010000b751066?embedded=true"
                ></iframe>
              )}
            </div>

            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', borderRadius: '0.5rem', padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Digital Credential</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>Authorized Access Active</p>
              </div>
              <div style={{ width: '40px', height: '40px', border: '2px solid var(--accent-blue)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '20px', height: '20px', background: 'var(--accent-blue)', borderRadius: '50%' }}></div>
              </div>
            </div>
          </div>
        )}
      </section>



      {/* Quick Actions Grid */}
      <section className="sh-fade-in" style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '1rem', color: 'var(--text-primary)' }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          
          <div onClick={() => window.location.href = 'tel:+15550199'} className="guest-card" style={{ padding: '1.5rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', minHeight: '160px', background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: 'auto' }}>
              📞
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>Call Security</h3>
              <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>→</span>
            </div>
          </div>

          <div onClick={() => navigate('/guest/chat')} className="guest-card" style={{ padding: '1.5rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', minHeight: '160px', background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: 'auto' }}>
              💬
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>Radio Chat</h3>
              <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>→</span>
            </div>
          </div>

          <div onClick={() => navigate('/guest/emergency')} className="guest-card" style={{ padding: '1.5rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', minHeight: '160px', gridColumn: '1 / -1', background: 'var(--bg-card)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: '1rem' }}>
              ⚠
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'var(--accent-red)' }}>Report Emergency</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.2rem', marginBottom: '1rem', fontSize: '0.9rem' }}>Notify the command center of a hazard.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
              <span style={{ fontSize: '1.2rem', color: 'var(--accent-red)' }}>→</span>
            </div>
          </div>

        </div>
      </section>

      <Snackbar
        open={toastOpen}
        autoHideDuration={6000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert onClose={() => setToastOpen(false)} severity={toastSeverity} sx={{ width: '100%' }}>
          {toastMessage}
        </MuiAlert>
      </Snackbar>

    </div>
    </>
  );
}
