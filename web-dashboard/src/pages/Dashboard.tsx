import React, { useEffect } from 'react';
import { Grid, Paper, Typography, Box, LinearProgress } from '@mui/material';
import {
  Warning as WarningIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSocketStore } from '../store/socketStore';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
  <Paper
    sx={{
      p: 3,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 140,
    }}
  >
    <Box>
      <Typography color="textSecondary" variant="overline">
        {title}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 'bold', color }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="textSecondary">
          {subtitle}
        </Typography>
      )}
    </Box>
    <Box
      sx={{
        backgroundColor: `${color}20`,
        borderRadius: '50%',
        p: 2,
      }}
    >
      <Icon sx={{ fontSize: 40, color }} />
    </Box>
  </Paper>
);

export default function Dashboard() {
  const { connected } = useSocketStore();

  const { data: overview, isLoading } = useQuery(
    'dashboardOverview',
    () => axios.get(`${API_URL}/dashboard/overview/1`).then((res) => res.data.overview),
    { refetchInterval: 30000 }
  );

  const { data: triageData } = useQuery(
    'triageData',
    () => axios.get(`${API_URL}/dashboard/triage/1`).then((res) => res.data.triage),
    { refetchInterval: 15000 }
  );

  // Sample data for chart
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
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Command Center Dashboard
        {connected && (
          <Box
            component="span"
            sx={{
              ml: 2,
              px: 1.5,
              py: 0.5,
              backgroundColor: 'success.main',
              borderRadius: 1,
              fontSize: '0.75rem',
            }}
          >
            LIVE
          </Box>
        )}
      </Typography>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Incidents"
            value={overview?.incidents?.active_incidents || 0}
            icon={WarningIcon}
            color="#f44336"
            subtitle={`${overview?.incidents?.critical_count || 0} critical`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Current Occupancy"
            value={overview?.currentOccupancy || 0}
            icon={PeopleIcon}
            color="#1976d2"
            subtitle="people on-site"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Marked Safe"
            value={triageData?.safe_count || 0}
            icon={CheckCircleIcon}
            color="#4caf50"
            subtitle="checked in"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Need Help"
            value={(triageData?.needs_help_count || 0) + (triageData?.distressed_count || 0)}
            icon={ErrorIcon}
            color="#ff9800"
            subtitle="awaiting assistance"
          />
        </Grid>

        {/* Triage Counter */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
              Triage Counter
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Safe</Typography>
                <Typography color="success.main" fontWeight="bold">
                  {triageData?.safe_count || 0}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={75}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: '#333',
                  '& .MuiLinearProgress-bar': { backgroundColor: '#4caf50' },
                }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Distressed / Needs Help</Typography>
                <Typography color="warning.main" fontWeight="bold">
                  {(triageData?.distressed_count || 0) + (triageData?.needs_help_count || 0)}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={15}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: '#333',
                  '& .MuiLinearProgress-bar': { backgroundColor: '#ff9800' },
                }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Missing / Unchecked</Typography>
                <Typography color="error.main" fontWeight="bold">
                  {(triageData?.missing_count || 0) + (triageData?.unchecked || 0)}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={10}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: '#333',
                  '& .MuiLinearProgress-bar': { backgroundColor: '#f44336' },
                }}
              />
            </Box>

            <Box
              sx={{
                mt: 4,
                p: 2,
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                borderRadius: 1,
                borderLeft: '4px solid #ff9800',
              }}
            >
              <Typography variant="body2" color="warning.main">
                ⚠️ {triageData?.needs_help_count || 0} people need immediate assistance
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Activity Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
              Incident Activity (24h)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="time" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e1e',
                    border: '1px solid #333',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="incidents"
                  stroke="#d32f2f"
                  strokeWidth={2}
                  dot={{ fill: '#d32f2f' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Recent Incidents */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
              Recent Incidents
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333' }}>
                    <th style={{ textAlign: 'left', padding: '12px' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>Severity</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>Time</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '12px' }}>Fire</td>
                    <td style={{ padding: '12px' }}>
                      <Box
                        sx={{
                          px: 1,
                          py: 0.5,
                          backgroundColor: '#d32f2f',
                          borderRadius: 1,
                          display: 'inline-block',
                        }}
                      >
                        Critical
                      </Box>
                    </td>
                    <td style={{ padding: '12px' }}>Active</td>
                    <td style={{ padding: '12px' }}>10 min ago</td>
                    <td style={{ padding: '12px' }}>Kitchen fire reported on floor 3</td>
                  </tr>
                </tbody>
              </table>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
