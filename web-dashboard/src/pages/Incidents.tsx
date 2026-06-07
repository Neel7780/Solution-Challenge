import React, { useState, useRef, useEffect } from 'react';
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
  Divider,
} from '@mui/material';
import { Add as AddIcon, MoreVert as MoreIcon, Check as CheckIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';


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
  mass_alert_message?: string;
  evacuation_routes?: {
    guestEmergencyPlan: string[];
    staffEvacuationPlan: string[];
    safeExits: string[];
    tips: string[];
  };
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
  const [openManage, setOpenManage] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [activeTab, setActiveTab] = useState<'incidents' | 'public-reports'>('incidents');
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const queryClient = useQueryClient();
  const containerRef = useRef(null);
  const canReviewPublicReports = ['admin', 'security', 'responder'].includes(user?.role || '');
  const canResolve = ['org_admin', 'super_admin', 'admin'].includes(user?.role || '');
  const [openResolveReport, setOpenResolveReport] = useState(false);
  const [resolutionReportText, setResolutionReportText] = useState('');

  // Real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    };

    socket.on('new_crisis', handleUpdate);
    socket.on('incident_status_update', handleUpdate);
    socket.on('panic_triggered', handleUpdate);

    return () => {
      socket.off('new_crisis', handleUpdate);
      socket.off('incident_status_update', handleUpdate);
      socket.off('panic_triggered', handleUpdate);
    };
  }, [socket, queryClient]);

  // Form State
  const [incidentType, setIncidentType] = useState('fire');
  const [severity, setSeverity] = useState('high');
  const [description, setDescription] = useState('');
  const [zoneId, setZoneId] = useState<number | string>('');

  const { data: incidents, isLoading } = useQuery<Incident[]>({
    queryKey: ['incidents'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/crisis/active`);
      return res.data.incidents;
    },
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['zones', user?.property_id],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/locations/zones/${user?.property_id || 1}`);
      return res.data.zones;
    },
    enabled: open,
  });

  const reportMutation = useMutation({
    mutationFn: (data: any) => axios.post(`${API_URL}/crisis/report`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      setOpen(false);
      // Reset form
      setIncidentType('fire');
      setSeverity('high');
      setDescription('');
      setZoneId('');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, resolutionReportText }: { id: number; status: string; resolutionReportText?: string }) => 
      axios.patch(`${API_URL}/crisis/${id}/status`, { status, resolutionReportText }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      setOpenManage(false);
      setSelectedIncident(null);
      setOpenResolveReport(false);
      setResolutionReportText('');
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

  const handleReport = () => {
    reportMutation.mutate({
      propertyId: user?.property_id || 1,
      type: incidentType,
      severity,
      description,
      zoneId: zoneId || null,
      latitude: 40.7128, // Default property location if not specified
      longitude: -74.006,
    });
  };

  useGSAP(() => {
    gsap.from('.table-row', {
      x: -15,
      opacity: 0,
      duration: 0.4,
      stagger: 0.05,
      ease: 'power2.out',
      clearProps: 'all',
      force3D: false,
    });
  }, { scope: containerRef, dependencies: [incidents?.length] });

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical': return { color: 'var(--accent-red)', bg: 'rgba(255, 62, 62, 0.05)', border: 'rgba(255, 62, 62, 0.2)' };
      case 'high': return { color: 'var(--accent-orange)', bg: 'rgba(251, 146, 60, 0.05)', border: 'rgba(251, 146, 60, 0.2)' };
      case 'medium': return { color: 'var(--accent-blue)', bg: 'rgba(59, 130, 246, 0.05)', border: 'rgba(59, 130, 246, 0.2)' };
      default: return { color: 'var(--text-muted)', bg: 'rgba(255, 255, 255, 0.02)', border: 'rgba(255, 255, 255, 0.1)' };
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active': return { color: 'var(--accent-red)' };
      case 'contained': return { color: 'var(--accent-orange)' };
      case 'resolved': return { color: 'var(--accent-green)' };
      default: return { color: 'var(--text-muted)' };
    }
  };

  return (
    <Box ref={containerRef}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'flex-end' }}>
        <Box>
          <Typography variant="h2" sx={{ fontSize: '1.5rem', fontWeight: 400 }}>
            Incident Management
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
            Real-time tracking and tactical resolution of active threats
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon fontSize="small" />}
          onClick={() => setOpen(true)}
          sx={{ 
            background: 'var(--accent-red)', 
            px: 3, 
            borderRadius: 1, 
            fontSize: '0.75rem',
            '&:hover': { background: '#dc2626' }
          }}
        >
          Report Incident
        </Button>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, value) => setActiveTab(value)}
        sx={{ 
          mb: 3, 
          minHeight: 40,
          '& .MuiTab-root': { fontSize: '0.75rem', minHeight: 40, textTransform: 'none', fontWeight: 400, color: 'var(--text-muted)' },
          '& .Mui-selected': { color: '#fff !important' },
          '& .MuiTabs-indicator': { backgroundColor: 'var(--accent-red)', height: 1 }
        }}
      >
        <Tab value="incidents" label="Active Incidents" />
        {canReviewPublicReports && <Tab value="public-reports" label="Public Review Queue" />}
      </Tabs>

      {activeTab === 'incidents' && (
      <Paper
        sx={{
          backgroundColor: 'transparent',
          border: '1px solid rgba(255, 255, 255, 0.04)',
          borderRadius: 1,
        }}
      >
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>ID</TableCell>
                <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>TYPE / ZONE</TableCell>
                <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>SEVERITY</TableCell>
                <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>STATUS</TableCell>
                <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>REPORTED</TableCell>
                <TableCell align="right" sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>Loading...</TableCell></TableRow>
              ) : incidents?.map((incident: Incident) => {
                const sevStyle = getSeverityStyle(incident.severity);
                const statStyle = getStatusStyle(incident.status);
                return (
                  <TableRow key={incident.id} className="table-row" hover sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.01) !important' } }}>
                    <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>#{incident.id}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 400, fontSize: '0.85rem' }}>
                        {incident.incident_type.toUpperCase()}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                        {incident.zone_name || 'General Area'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ 
                        display: 'inline-flex', 
                        px: 1, 
                        py: 0.25, 
                        borderRadius: '2px', 
                        backgroundColor: sevStyle.bg, 
                        border: `1px solid ${sevStyle.border}`,
                        color: sevStyle.color,
                        fontSize: '0.65rem',
                        fontWeight: 600
                      }}>
                        {incident.severity.toUpperCase()}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: statStyle.color }} />
                        <Typography variant="caption" sx={{ color: statStyle.color, fontWeight: 500, fontSize: '0.7rem' }}>
                          {incident.status.toUpperCase()}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
                        {new Date(incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                        {incident.status === 'active' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="info"
                            startIcon={<CheckIcon sx={{ fontSize: '12px !important' }} />}
                            onClick={() => updateStatusMutation.mutate({ id: incident.id, status: 'contained' })}
                            sx={{ fontSize: '0.65rem', py: 0, height: 24, borderRadius: 0.5, backgroundColor: 'var(--accent-blue)' }}
                          >
                            Contain
                          </Button>
                        )}
                        <IconButton 
                          size="small" 
                          sx={{ color: 'var(--text-muted)' }}
                          onClick={() => {
                            setSelectedIncident(incident);
                            setOpenManage(true);
                          }}
                        >
                          <MoreIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Stack>
                    </TableCell>

                  </TableRow>
                );
              })}
              {!isLoading && incidents?.length === 0 && (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 8, color: 'var(--text-muted)' }}>No active incidents.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      )}

      {activeTab === 'public-reports' && canReviewPublicReports && (
        <Paper
          sx={{
            backgroundColor: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            borderRadius: 1,
          }}
        >
          {publicReportsError && (
            <Alert severity="error" sx={{ m: 2, borderRadius: 1 }}>
              Failed to load public reports.
            </Alert>
          )}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>ID</TableCell>
                  <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>TYPE / SEVERITY</TableCell>
                  <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>REPORTER</TableCell>
                  <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>SOURCE IP</TableCell>
                  <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>SUBMITTED</TableCell>
                  <TableCell align="right" sx={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>REVIEW</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {publicReports.map((report) => {
                  const sevStyle = getSeverityStyle(report.severity);
                  return (
                    <TableRow key={report.id} hover sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.01) !important' } }}>
                      <TableCell sx={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>#{report.id}</TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography sx={{ textTransform: 'capitalize', fontWeight: 400, fontSize: '0.85rem' }}>
                            {report.incident_type}
                          </Typography>
                          <Box sx={{ 
                            display: 'inline-flex', 
                            width: 'fit-content',
                            px: 1, 
                            py: 0.15, 
                            borderRadius: '2px', 
                            backgroundColor: sevStyle.bg, 
                            border: `1px solid ${sevStyle.border}`,
                            color: sevStyle.color,
                            fontSize: '0.6rem',
                            fontWeight: 600
                          }}>
                            {report.severity.toUpperCase()}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{report.reporter_name || 'Anonymous'}</Typography>
                        <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{report.reporter_contact || 'No contact'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{report.source_ip}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>{new Date(report.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            disabled={reviewPublicReportMutation.isPending}
                            onClick={() => reviewPublicReportMutation.mutate({ id: report.id, action: 'escalate' })}
                            sx={{ fontSize: '0.65rem', py: 0, height: 24, borderRadius: 0.5 }}
                          >
                            Escalate
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={reviewPublicReportMutation.isPending}
                            onClick={() => reviewPublicReportMutation.mutate({ id: report.id, action: 'dismiss' })}
                            sx={{ fontSize: '0.65rem', py: 0, height: 24, borderRadius: 0.5, color: 'var(--text-muted)', borderColor: 'rgba(255,255,255,0.1)' }}
                          >
                            Dismiss
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {loadingPublicReports && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'var(--text-muted)' }}>Loading review queue...</TableCell>
                  </TableRow>
                )}
                {!loadingPublicReports && publicReports.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8, color: 'var(--text-muted)' }}>Review queue is empty.</TableCell>
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
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-soft)',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>Report New Incident</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField 
                select 
                fullWidth 
                label="Incident Type" 
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
              >
                <MenuItem value="fire">Fire</MenuItem>
                <MenuItem value="medical">Medical</MenuItem>
                <MenuItem value="security">Security</MenuItem>
                <MenuItem value="natural_disaster">Natural Disaster</MenuItem>
                <MenuItem value="evacuation">Evacuation</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField 
                select 
                fullWidth 
                label="Severity" 
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField 
                select 
                fullWidth 
                label="Affected Zone" 
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
              >
                <MenuItem value="">General / Unknown</MenuItem>
                {zones.map((zone: any) => (
                  <MenuItem key={zone.id} value={zone.id}>{zone.name} (Floor {zone.floor_number})</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField 
                fullWidth 
                multiline 
                rows={4} 
                label="Description" 
                placeholder="Provide details about the incident..." 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpen(false)} color="inherit">Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleReport}
            disabled={reportMutation.isPending}
          >
            {reportMutation.isPending ? 'Reporting...' : 'Report Incident'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Incident Dialog */}
      <Dialog
        open={openManage}
        onClose={() => setOpenManage(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-soft)',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>Manage Incident #{selectedIncident?.id}</DialogTitle>
        <DialogContent>
          {selectedIncident && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.6rem' }}>Details</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {selectedIncident.incident_type.toUpperCase()} - {selectedIncident.severity.toUpperCase()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedIncident.description}
                </Typography>
              </Box>

              {selectedIncident.evacuation_routes?.staffEvacuationPlan && (
                <Box sx={{ p: 2, borderRadius: 1, border: '1px solid rgba(59, 130, 246, 0.2)', backgroundColor: 'rgba(59, 130, 246, 0.05)' }}>
                  <Typography variant="overline" sx={{ color: 'var(--accent-blue)', display: 'block', mb: 1, fontWeight: 'bold' }}>
                    AI TACTICAL PLAN & ASSIGNMENTS
                  </Typography>
                  <Stack spacing={1}>
                    {selectedIncident.evacuation_routes.staffEvacuationPlan.map((assignment, i) => (
                      <Typography key={i} variant="caption" sx={{ display: 'block' }}>• {assignment}</Typography>
                    ))}
                  </Stack>
                </Box>
              )}
              
              <Divider sx={{ opacity: 0.1 }} />
              
              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.6rem', mb: 1, display: 'block' }}>
                  Strategic Actions
                </Typography>
                <Stack spacing={1}>
                  {selectedIncident.status === 'active' && (
                    <Button 
                      fullWidth 
                      variant="outlined" 
                      color="info"
                      onClick={() => updateStatusMutation.mutate({ id: selectedIncident.id, status: 'contained' })}
                      disabled={updateStatusMutation.isPending}
                      sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                    >
                      Mark as Contained
                    </Button>
                  )}
                  {selectedIncident.status !== 'contained' && selectedIncident.status !== 'resolved' && (
                    <Button 
                      fullWidth 
                      variant="outlined" 
                      color="warning"
                      onClick={() => updateStatusMutation.mutate({ id: selectedIncident.id, status: 'contained' })}
                      disabled={updateStatusMutation.isPending}
                      sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                    >
                      Mark as Contained
                    </Button>
                  )}
                  {canResolve ? (
                    <Button 
                      fullWidth 
                      variant="contained" 
                      color="success"
                      onClick={() => setOpenResolveReport(true)}
                      disabled={updateStatusMutation.isPending}
                      sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                    >
                      Resolve + Publish Report
                    </Button>
                  ) : (
                    <Button 
                      fullWidth 
                      variant="contained" 
                      color="success"
                      disabled
                      sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                    >
                      Resolve (Admin Only)
                    </Button>
                  )}
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenManage(false)} color="inherit" size="small">Close</Button>
        </DialogActions>
      </Dialog>

      {/* Org Admin Resolution Report Dialog */}
      <Dialog
        open={openResolveReport}
        onClose={() => !updateStatusMutation.isPending && setOpenResolveReport(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-soft)',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          Publish Resolution Report for Incident #{selectedIncident?.id}
        </DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            This report will be public and viewable without authentication.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={6}
            label="Resolution Report (Public)"
            placeholder="Summarize what happened, actions taken, and final resolution."
            value={resolutionReportText}
            onChange={(e) => setResolutionReportText(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenResolveReport(false)} color="inherit" disabled={updateStatusMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            disabled={updateStatusMutation.isPending || resolutionReportText.trim().length < 10 || !selectedIncident}
            onClick={() => {
              if (!selectedIncident) return;
              updateStatusMutation.mutate({
                id: selectedIncident.id,
                status: 'resolved',
                resolutionReportText,
              });
            }}
          >
            {updateStatusMutation.isPending ? 'Publishing...' : 'Resolve & Publish'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
