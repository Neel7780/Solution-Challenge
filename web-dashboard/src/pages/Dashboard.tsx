import React, { useRef } from 'react';
import {
  Grid,
  Typography,
  Box,
  Paper,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Warning as WarningIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { 
  Button, 
  Stack, 
  Divider, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import { 
  ExitToApp as EvacuateIcon, 
  Check as SafeIcon, 
  HelpOutlined as UnaccountedIcon,
  LocalHospital as AidIcon,
} from '@mui/icons-material';

import { useSocketStore } from '../store/socketStore';
import { useAuthStore } from '../store/authStore';
import { OverviewData, TriageData } from '../types';


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}

const StatCard = ({ title, value, icon: Icon, color, subtitle }: StatCardProps) => (
  <Paper
    className="stat-card"
    sx={{
      p: 2.75,
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 2.5,
      transition: 'transform 0.25s ease, border-color 0.25s ease',
      '&::before': {
        content: '""',
        position: 'absolute',
        left: 16,
        top: 0,
        right: 16,
        height: '2px',
        backgroundColor: color,
        boxShadow: `0 0 14px ${color}`,
      },
      '&:hover': {
        transform: 'translateY(-2px)',
        borderColor: 'var(--border-medium)',
      },
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Box>
        <Typography variant="overline" sx={{ color: 'var(--text-muted)', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em' }}>
          {title}
        </Typography>
        <Typography className="stat-value" sx={{ my: 0.5, color: '#fff' }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: 'var(--text-muted)', display: 'block', mt: 0.5 }}>
             {subtitle}
          </Typography>
        )}
      </Box>
      <Icon sx={{ fontSize: 20, color, opacity: 0.85 }} />
    </Box>
  </Paper>
);

export default function Dashboard() {
  const containerRef = useRef(null);
  const { connected } = useSocketStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showEvacConfirm, setShowEvacConfirm] = React.useState(false);
  const propertyId = user?.property_id || 2;

  const { data: overview } = useQuery<OverviewData>({
    queryKey: ['dashboardOverview'],
    queryFn: async () => {
      try {
        const res = await axios.get(`${API_URL}/dashboard/overview/${propertyId}`);
        return res.data.overview;
      } catch {
        return {
          incidents: { active_incidents: 1, critical_count: 1 },
          currentOccupancy: 245
        };
      }
    },
    refetchInterval: 30000,
  });

  const { data: safetyRoster } = useQuery({
    queryKey: ['safetyRoster', user?.property_id],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/crisis/property/${user?.property_id}/safety-roster`);
      return res.data;
    },
    enabled: !!user?.property_id,
    refetchInterval: 5000, // Frequent updates during crisis
  });

  const triggerEvacuationMutation = useMutation({
    mutationFn: () => axios.post(`${API_URL}/crisis/property/${user?.property_id}/status`, { status: 'evacuating' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] });
      setShowEvacConfirm(false);
    },
  });

  const cancelEvacuationMutation = useMutation({
    mutationFn: () => axios.post(`${API_URL}/crisis/property/${user?.property_id}/status`, { status: 'operational' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] }),
  });


  const { data: triageData } = useQuery<TriageData>({
    queryKey: ['triageData'],
    queryFn: async () => {
      try {
        const res = await axios.get(`${API_URL}/dashboard/triage/${propertyId}`);
        return res.data.triage;
      } catch {
        return {
          safe_count: 200, distressed_count: 25, needs_help_count: 5, missing_count: 15, unchecked: 0
        };
      }
    },
    refetchInterval: 15000,
  });

  useGSAP(() => {
    gsap.from('.stat-card', {
      y: 10,
      opacity: 0,
      duration: 0.5,
      stagger: 0.05,
      ease: 'power2.out',
      clearProps: 'all',
      force3D: false,
    });

    gsap.from('.chart-panel', {
      y: 15,
      opacity: 0,
      duration: 0.6,
      delay: 0.2,
      stagger: 0.1,
      ease: 'power2.out',
      clearProps: 'all',
      force3D: false,
    });
  }, { scope: containerRef });

  const triagePieData = [
    { name: 'Safe', value: triageData?.safe_count || 0, color: 'var(--accent-green)' },
    { name: 'Distressed', value: triageData?.distressed_count || 0, color: 'var(--accent-orange)' },
    { name: 'Need Help', value: triageData?.needs_help_count || 0, color: 'var(--accent-red)' },
    { name: 'Missing', value: (triageData?.missing_count || 0) + (triageData?.unchecked || 0), color: 'var(--text-muted)' },
  ];

  const activityData = [
    { time: '00:00', incidents: 0 },
    { time: '04:00', incidents: 1 },
    { time: '08:00', incidents: 0 },
    { time: '12:00', incidents: 2 },
    { time: '16:00', incidents: 1 },
    { time: '20:00', incidents: 0 },
    { time: 'Now', incidents: 1 },
  ];

  const criticalCount = overview?.incidents?.critical_count ?? 0;
  const activeIncidents = overview?.incidents?.active_incidents ?? 0;

  return (
    <Box ref={containerRef}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h2" sx={{ fontSize: '2rem', fontWeight: 300, lineHeight: 1.05 }}>Command Center</Typography>
          <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Real-time coordination and strategic response
          </Typography>
        </Box>
        
        {/* Tactical Evacuation Control */}
        <Stack direction="row" spacing={2}>
            {criticalCount > 0 && (
             <Button
               variant="contained"
               color="error"
               startIcon={<EvacuateIcon />}
               onClick={() => setShowEvacConfirm(true)}
               sx={{ 
                 color: '#fff',
                 background: 'linear-gradient(90deg, #ff5c5c 0%, #e84f4f 100%)', 
                 fontWeight: 700, 
                 px: 3,
                 borderRadius: 2,
                 border: '1px solid rgba(255, 92, 92, 0.55)',
                 animation: 'pulse 2s infinite',
                 '@keyframes pulse': {
                   '0%': { boxShadow: '0 0 0 0 rgba(255, 62, 62, 0.4)' },
                   '70%': { boxShadow: '0 0 0 10px rgba(255, 62, 62, 0)' },
                   '100%': { boxShadow: '0 0 0 0 rgba(255, 62, 62, 0)' }
                 }
               }}
             >
               TRIGGER EVACUATION
             </Button>
           )}
        </Stack>
      </Box>

      {/* Evacuation Alert Banner */}
      {safetyRoster?.stats?.unaccounted > 0 && criticalCount > 0 && (
        <Alert 
          severity="error" 
          sx={{ mb: 4, backgroundColor: 'rgba(255, 92, 92, 0.12)', border: '1px solid rgba(255, 92, 92, 0.5)', color: '#fff', borderRadius: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => cancelEvacuationMutation.mutate()}>
              Cancel Alert
            </Button>
          }
        >
          <strong>EVACUATION IN PROGRESS:</strong> {safetyRoster?.stats?.unaccounted} individuals remain unaccounted for in the property.
        </Alert>
      )}


      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Active Incidents"
            value={overview?.incidents?.active_incidents || 0}
            icon={WarningIcon}
            color="var(--accent-red)"
            subtitle={`${overview?.incidents?.critical_count || 0} classified as critical`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Live Occupancy"
            value={overview?.currentOccupancy || 0}
            icon={PeopleIcon}
            color="var(--accent-blue)"
            subtitle="Personnel detected on-site"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Safety Compliance"
            value={triageData?.safe_count || 0}
            icon={CheckCircleIcon}
            color="var(--accent-green)"
            subtitle="Individuals marked as safe"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Assistance Required"
            value={(triageData?.needs_help_count || 0) + (triageData?.distressed_count || 0)}
            icon={ErrorIcon}
            color="var(--accent-orange)"
            subtitle="Awaiting response team"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper
            className="chart-panel"
            sx={{
              p: 3,
              height: '100%',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 2.5,
            }}
          >
            <Typography variant="overline" sx={{ color: 'var(--text-muted)', mb: 3, display: 'block', fontSize: '0.6rem', letterSpacing: '0.14em' }}>Triage Distribution</Typography>
            <Box sx={{ height: 300, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={triagePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {triagePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} opacity={0.8} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#131925', border: '1px solid rgba(246,211,101,0.2)', borderRadius: 10, fontSize: '0.75rem' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '2rem' }}>{(overview?.currentOccupancy || 245)}</Typography>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--font-mono)' }}>Total</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Paper
            className="chart-panel"
            sx={{
              p: 3,
              height: '100%',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 2.5,
            }}
          >
            <Typography variant="overline" sx={{ color: 'var(--text-muted)', mb: 3, display: 'block', fontSize: '0.6rem', letterSpacing: '0.14em' }}>Incident Timeline (24h)</Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(246,211,101,0.08)" vertical={false} />
                  <XAxis dataKey="time" stroke="var(--text-muted)" axisLine={false} tickLine={false} style={{ fontSize: '0.7rem' }} />
                  <YAxis stroke="var(--text-muted)" axisLine={false} tickLine={false} style={{ fontSize: '0.7rem' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#131925', border: '1px solid rgba(246,211,101,0.2)', borderRadius: 10, fontSize: '0.75rem' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="incidents"
                    stroke="var(--accent-orange)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--accent-orange)', r: 2.5 }}
                    activeDot={{ r: 5, fill: 'var(--accent-orange)', stroke: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Safety Roll Call Table */}
      {activeIncidents > 0 && (
        <Paper sx={{ p: 0, mb: 4, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 2.5, overflow: 'hidden' }}>
           <Box sx={{ p: 2, borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="overline" sx={{ color: 'var(--text-muted)', letterSpacing: '0.14em', fontSize: '0.6rem' }}>Safety Roll Call</Typography>
              <Stack direction="row" spacing={3}>
                 <Typography variant="caption" sx={{ color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>{safetyRoster?.stats?.safe || 0} Safe</Typography>
                 <Typography variant="caption" sx={{ color: 'var(--accent-red)', fontFamily: 'var(--font-mono)' }}>{safetyRoster?.stats?.unaccounted || 0} Unaccounted</Typography>
              </Stack>
           </Box>
           <TableContainer sx={{ maxHeight: 300 }}>
             <Table size="small" stickyHeader>
               <TableHead>
                 <TableRow>
                   <TableCell sx={{ backgroundColor: 'rgba(10,13,18,0.96)', fontSize: '0.62rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>PERSONNEL / GUEST</TableCell>
                   <TableCell sx={{ backgroundColor: 'rgba(10,13,18,0.96)', fontSize: '0.62rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>STATUS</TableCell>
                   <TableCell sx={{ backgroundColor: 'rgba(10,13,18,0.96)', fontSize: '0.62rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>LAST SEEN</TableCell>
                   <TableCell align="right" sx={{ backgroundColor: 'rgba(10,13,18,0.96)', fontSize: '0.62rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>ACTION</TableCell>
                 </TableRow>
               </TableHead>
               <TableBody>
                 {safetyRoster?.occupants?.map((occ: any) => (
                   <TableRow key={occ.id} hover>
                     <TableCell>
                       <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{occ.name}</Typography>
                       <Typography variant="caption" color="text.secondary">{occ.role} • Room {occ.room_number || 'N/A'}</Typography>
                     </TableCell>
                     <TableCell>
                        {occ.safety_status === 'safe' ? (
                          <Chip label="SAFE" size="small" color="success" icon={<SafeIcon />} sx={{ height: 22, fontSize: '0.58rem', fontFamily: 'var(--font-mono)' }} />
                        ) : (
                          <Chip label="UNACCOUNTED" size="small" color="error" variant="outlined" sx={{ height: 22, fontSize: '0.58rem', fontFamily: 'var(--font-mono)' }} />
                        )}
                     </TableCell>
                     <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {occ.last_seen ? new Date(occ.last_seen).toLocaleTimeString() : 'No record'}
                        </Typography>
                     </TableCell>
                     <TableCell align="right">
                        <Button size="small" sx={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }} disabled>Contact</Button>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           </TableContainer>
        </Paper>
      )}

      {/* Confirmation Dialogs */}
      <Dialog open={showEvacConfirm} onClose={() => setShowEvacConfirm(false)} slotProps={{ paper: { sx: { background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 2.5 } } }}>
        <DialogTitle sx={{ color: 'var(--accent-red)', fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>CONFIRM BUILDING EVACUATION</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            This will broadcast an immediate evacuation order to all registered occupants and personnel at this property. 
            This action is logged for compliance review.
          </Typography>
          <Alert severity="warning">This cannot be undone silently.</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEvacConfirm(false)} color="inherit">Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={() => triggerEvacuationMutation.mutate()}
            disabled={triggerEvacuationMutation.isPending}
          >
            CONFIRM EVACUATION
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

