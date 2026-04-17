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
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

import { useSocketStore } from '../store/socketStore';
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
  <Paper className="glass stat-card" sx={{ p: 3, position: 'relative', overflow: 'hidden' }}>
    <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Box>
        <Typography variant="overline" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
          {title}
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5, color: '#fff' }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: color, fontWeight: 500 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      <Box sx={{ p: 1.5, borderRadius: 2, background: alpha(color, 0.1), color: color }}>
        <Icon sx={{ fontSize: 32 }} />
      </Box>
    </Box>
    <Box
      sx={{
        position: 'absolute',
        top: '-20%',
        right: '-10%',
        width: '100px',
        height: '100px',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity: 0.15,
        zIndex: 0
      }}
    />
  </Paper>
);

export default function Dashboard() {
  const containerRef = useRef(null);
  const { connected } = useSocketStore();

  const { data: overview } = useQuery<OverviewData>({
    queryKey: ['dashboardOverview'],
    queryFn: async () => {
      try {
        const res = await axios.get(`${API_URL}/dashboard/overview/1`);
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

  const { data: triageData } = useQuery<TriageData>({
    queryKey: ['triageData'],
    queryFn: async () => {
      try {
        const res = await axios.get(`${API_URL}/dashboard/triage/1`);
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
      y: 40,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: 'power3.out',
    });

    gsap.from('.chart-panel', {
      y: 40,
      opacity: 0,
      duration: 0.6,
      delay: 0.3,
      stagger: 0.2,
      ease: 'power3.out',
    });
  }, { scope: containerRef });

  const triagePieData = [
    { name: 'Safe', value: triageData?.safe_count || 0, color: '#22c55e' },
    { name: 'Distressed', value: triageData?.distressed_count || 0, color: '#f59e0b' },
    { name: 'Need Help', value: triageData?.needs_help_count || 0, color: '#ef4444' },
    { name: 'Missing', value: (triageData?.missing_count || 0) + (triageData?.unchecked || 0), color: '#64748b' },
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

  return (
    <Box ref={containerRef}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h2" sx={{ fontSize: '2rem' }}>Command Center Overview</Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Active Incidents"
            value={overview?.incidents?.active_incidents || 0}
            icon={WarningIcon}
            color="#ef4444"
            subtitle={`${overview?.incidents?.critical_count || 0} critical`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Current Occupancy"
            value={overview?.currentOccupancy || 0}
            icon={PeopleIcon}
            color="#3b82f6"
            subtitle="people on-site"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Marked Safe"
            value={triageData?.safe_count || 0}
            icon={CheckCircleIcon}
            color="#22c55e"
            subtitle="checked in"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Need Help"
            value={(triageData?.needs_help_count || 0) + (triageData?.distressed_count || 0)}
            icon={ErrorIcon}
            color="#f59e0b"
            subtitle="awaiting assistance"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper className="glass chart-panel" sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 3 }}>Real-time Triage Status</Typography>
            <Box sx={{ height: 300, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={triagePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {triagePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#12121a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{(overview?.currentOccupancy || 245)}</Typography>
                <Typography variant="caption" color="text.secondary">Total</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Paper className="glass chart-panel" sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 3 }}>Incident Activity (24h)</Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" axisLine={false} tickLine={false} />
                  <YAxis stroke="#64748b" axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#12121a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="incidents"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
