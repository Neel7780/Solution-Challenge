import React, { useState, useRef } from 'react';
import {
  Alert,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  IconButton,
  Stack,
  Tabs,
  Tab,
} from '@mui/material';
import { Add as AddIcon, MoreVert as MoreIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface Incident {
  id: number;
  incident_type: string;
  severity: string;
  status: string;
  created_at: string;
  description: string;
  reported_by_name: string;
  zone_name: string;
}

interface PublicReport {
  id: number;
  property_id: number;
  incident_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string | null;
  reporter_name: string | null;
  reporter_contact: string | null;
  source_ip: string;
  status: 'pending_review' | 'escalated' | 'dismissed';
  created_at: string;
}

export default function Incidents() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'incidents' | 'public-reports'>('incidents');
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const containerRef = useRef(null);
  const canReviewPublicReports = ['admin', 'security', 'responder'].includes(user?.role || '');

  const { data: incidents, isLoading } = useQuery<Incident[]>({
    queryKey: ['incidents'],
    queryFn: async () => {
      try {
        const res = await axios.get(`${API_URL}/crisis/active`);
        return res.data.incidents;
      } catch {
        return [
          { id: 101, incident_type: 'fire', severity: 'critical', status: 'active', created_at: new Date().toISOString(), description: 'Kitchen fire on floor 1', reported_by_name: 'John Doe', zone_name: 'Kitchen' },
          { id: 102, incident_type: 'medical', severity: 'high', status: 'contained', created_at: new Date(Date.now() - 3600000).toISOString(), description: 'Guest fainted in lobby', reported_by_name: 'Jane Smith', zone_name: 'Lobby' }
        ];
      }
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (id: number) => axios.post(`${API_URL}/crisis/${id}/resolve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incidents'] }),
  });

  const { data: publicReports = [], isLoading: loadingPublicReports, isError: publicReportsError } = useQuery<PublicReport[]>({
    queryKey: ['public-reports'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/crisis/public-reports`, {
        params: { status: 'pending_review' },
      });
      return res.data.reports;
    },
    enabled: canReviewPublicReports,
  });

  const reviewPublicReportMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'escalate' | 'dismiss' }) =>
      axios.patch(`${API_URL}/crisis/public-reports/${id}`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-reports'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });

  useGSAP(() => {
    gsap.from('.table-row', {
      x: -20,
      opacity: 0,
      duration: 0.4,
      stagger: 0.05,
      ease: 'power2.out',
    });
  }, { scope: containerRef, dependencies: [incidents?.length] });

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical': return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
      case 'high': return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
      case 'medium': return { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' };
      default: return { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' };
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active': return { color: '#ef4444', borderColor: '#ef4444' };
      case 'contained': return { color: '#f59e0b', borderColor: '#f59e0b' };
      case 'resolved': return { color: '#22c55e', borderColor: '#22c55e' };
      default: return { color: '#94a3b8', borderColor: '#94a3b8' };
    }
  };

  return (
    <Box ref={containerRef}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'center' }}>
        <Typography variant="h2" sx={{ fontSize: '2rem' }}>
          Incident Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
          sx={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
        >
          Report Incident
        </Button>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, value) => setActiveTab(value)}
        sx={{ mb: 2 }}
      >
        <Tab value="incidents" label="Active Incidents" />
        {canReviewPublicReports && <Tab value="public-reports" label="Public Reports Queue" />}
      </Tabs>

      {activeTab === 'incidents' && (
      <Paper
        sx={{
          backgroundColor: 'rgba(18, 18, 26, 0.98)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Type / Zone</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Time Reported</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {incidents?.map((incident: Incident) => {
                const sevStyle = getSeverityStyle(incident.severity);
                const statStyle = getStatusStyle(incident.status);
                return (
                  <TableRow key={incident.id} className="table-row" hover sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell sx={{ fontWeight: 'mono', color: 'text.secondary' }}>#{incident.id}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                        {incident.incident_type}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {incident.zone_name || 'General Area'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={incident.severity}
                        size="small"
                        sx={{ color: sevStyle.color, backgroundColor: sevStyle.bg, fontWeight: 700, textTransform: 'uppercase' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={incident.status}
                        size="small"
                        variant="outlined"
                        sx={{ color: statStyle.color, borderColor: statStyle.borderColor, fontWeight: 600, textTransform: 'uppercase' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {incident.status === 'active' && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          onClick={() => resolveMutation.mutate(incident.id)}
                          sx={{ mr: 1 }}
                        >
                          Resolve
                        </Button>
                      )}
                      <IconButton size="small" color="inherit">
                        <MoreIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      )}

      {activeTab === 'public-reports' && canReviewPublicReports && (
        <Paper
          sx={{
            backgroundColor: 'rgba(18, 18, 26, 0.98)',
            border: '1px solid var(--border-medium)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {publicReportsError && (
            <Alert severity="error" sx={{ m: 2 }}>
              Failed to load public reports.
            </Alert>
          )}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Report ID</TableCell>
                  <TableCell>Type / Severity</TableCell>
                  <TableCell>Reporter</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell align="right">Review</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {publicReports.map((report) => (
                  <TableRow key={report.id} hover>
                    <TableCell>#{report.id}</TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography sx={{ textTransform: 'capitalize', fontWeight: 600 }}>
                          {report.incident_type}
                        </Typography>
                        <Chip label={report.severity} size="small" variant="outlined" sx={{ width: 'fit-content', textTransform: 'uppercase' }} />
                        {report.description && (
                          <Typography variant="caption" color="text.secondary">
                            {report.description}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{report.reporter_name || 'Anonymous'}</Typography>
                      <Typography variant="caption" color="text.secondary">{report.reporter_contact || 'No contact'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">IP: {report.source_ip}</Typography>
                      <Typography variant="caption" color="text.secondary">Property {report.property_id}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{new Date(report.created_at).toLocaleString()}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        color="error"
                        variant="contained"
                        sx={{ mr: 1 }}
                        disabled={reviewPublicReportMutation.isPending}
                        onClick={() => reviewPublicReportMutation.mutate({ id: report.id, action: 'escalate' })}
                      >
                        Escalate
                      </Button>
                      <Button
                        size="small"
                        color="inherit"
                        variant="outlined"
                        disabled={reviewPublicReportMutation.isPending}
                        onClick={() => reviewPublicReportMutation.mutate({ id: report.id, action: 'dismiss' })}
                      >
                        Dismiss
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {loadingPublicReports && (
                  <TableRow>
                    <TableCell colSpan={6}>Loading public reports...</TableCell>
                  </TableRow>
                )}
                {!loadingPublicReports && publicReports.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>No public reports pending review.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              backgroundColor: 'rgba(18, 18, 26, 0.98)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-card)',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>Report New Incident</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label="Incident Type" defaultValue="fire">
                <MenuItem value="fire">Fire</MenuItem>
                <MenuItem value="medical">Medical</MenuItem>
                <MenuItem value="security">Security</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label="Severity" defaultValue="high">
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline rows={4} label="Description" placeholder="Provide details about the incident..." />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" color="error">Report Incident</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
