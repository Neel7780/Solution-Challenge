import React, { useRef, useState } from 'react';
import {
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  InfoOutlined as InfoIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface OnboardingRequest {
  id: number;
  org_name: string;
  org_type: string;
  address: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  expected_capacity: number;
  additional_info: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function PlatformAdmin() {
  const containerRef = useRef(null);
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'requests' | 'organizations'>('requests');

  const { data: requests = [], isLoading: loadingRequests } = useQuery<OnboardingRequest[]>({
    queryKey: ['onboarding-requests'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/platform/requests`);
      return res.data.requests;
    },
    enabled: activeTab === 'requests',
  });

  const { data: organizations = [], isLoading: loadingOrgs } = useQuery({
    queryKey: ['platform-organizations'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/platform/organizations`);
      return res.data.organizations;
    },
    enabled: activeTab === 'organizations',
  });

  const reviewMutation = useMutation({

    mutationFn: ({ id, action }: { id: number; action: 'approved' | 'rejected' }) =>
      axios.patch(`${API_URL}/platform/requests/${id}`, { action }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-requests'] });
      if (data.data.credentials) {
        setCredentials(data.data.credentials);
      }
    },
  });

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
  }, { scope: containerRef, dependencies: [requests.length] });

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'pending': return <Chip label="PENDING" size="small" color="warning" sx={{ fontWeight: 700 }} />;
      case 'approved': return <Chip label="APPROVED" size="small" color="success" sx={{ fontWeight: 700 }} />;
      case 'rejected': return <Chip label="REJECTED" size="small" color="error" sx={{ fontWeight: 700 }} />;
      default: return <Chip label={status} size="small" />;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Box ref={containerRef}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Box>
          <Typography variant="h2" sx={{ fontSize: '2rem', mb: 1 }}>Platform Administration</Typography>
          <Typography color="text.secondary">
            {activeTab === 'requests' 
              ? 'Manage organization onboarding requests and system access.' 
              : 'Strategic oversight of all onboarded enterprise entities.'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Box sx={{ 
            backgroundColor: 'rgba(255,255,255,0.02)', 
            borderRadius: 1, 
            p: 0.5,
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <Button 
              size="small" 
              onClick={() => setActiveTab('requests')}
              sx={{ 
                fontSize: '0.65rem', px: 2, py: 0.5, minWidth: 0,
                color: activeTab === 'requests' ? '#fff' : 'var(--text-muted)',
                backgroundColor: activeTab === 'requests' ? 'rgba(255,255,255,0.05)' : 'transparent',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' }
              }}
            >
              Requests
            </Button>
            <Button 
              size="small" 
              onClick={() => setActiveTab('organizations')}
              sx={{ 
                fontSize: '0.65rem', px: 2, py: 0.5, minWidth: 0,
                color: activeTab === 'organizations' ? '#fff' : 'var(--text-muted)',
                backgroundColor: activeTab === 'organizations' ? 'rgba(255,255,255,0.05)' : 'transparent',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' }
              }}
            >
              Organizations
            </Button>
          </Box>
        </Stack>
      </Box>

      <Paper
        sx={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        <TableContainer>
          <Table>
            {activeTab === 'requests' ? (
              <>
                <TableHead>
                  <TableRow>
                    <TableCell>Organization</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Submitted</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingRequests ? (
                    <TableRow><TableCell colSpan={6} align="center">Loading requests...</TableCell></TableRow>
                  ) : requests.map((req) => (
                    <TableRow key={req.id} className="table-row" hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600 }}>{req.org_name}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{req.address}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{req.contact_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{req.contact_email}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{req.org_type}</Typography>
                        <Typography variant="caption" color="text.secondary">Cap: {req.expected_capacity}</Typography>
                      </TableCell>
                      <TableCell>{getStatusChip(req.status)}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{new Date(req.created_at).toLocaleDateString()}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => setSelectedRequest(req)}>
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {req.status === 'pending' && (
                            <>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<CheckIcon />}
                                onClick={() => reviewMutation.mutate({ id: req.id, action: 'approved' })}
                                disabled={reviewMutation.isPending}
                              >
                                Approve
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<CloseIcon />}
                                onClick={() => reviewMutation.mutate({ id: req.id, action: 'rejected' })}
                                disabled={reviewMutation.isPending}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loadingRequests && requests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                        <Typography color="text.secondary">No onboarding requests found.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </>
            ) : (
              <>
                <TableHead>
                  <TableRow>
                    <TableCell>Organization</TableCell>
                    <TableCell>Contact Email</TableCell>
                    <TableCell>Tier</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingOrgs ? (
                    <TableRow><TableCell colSpan={6} align="center">Loading organizations...</TableCell></TableRow>
                  ) : organizations.map((org: any) => (
                    <TableRow key={org.id} className="table-row" hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600 }}>{org.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{org.contact_email}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={org.subscription_tier.toUpperCase()} 
                          size="small" 
                          variant="outlined"
                          sx={{ borderColor: 'var(--accent-blue)', color: 'var(--accent-blue)', fontWeight: 700 }} 
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={org.status.toUpperCase()} 
                          size="small" 
                          color={org.status === 'active' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{new Date(org.created_at).toLocaleDateString()}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" variant="outlined" onClick={() => {/* TODO: Manage org */}}>
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loadingOrgs && organizations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                        <Typography color="text.secondary">No organizations found.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </>
            )}
          </Table>
        </TableContainer>
      </Paper>


      {/* Details Dialog */}
      <Dialog open={Boolean(selectedRequest)} onClose={() => setSelectedRequest(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Request Details</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Organization Info</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedRequest.org_name}</Typography>
                <Typography variant="body2">{selectedRequest.address}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Contact Person</Typography>
                <Typography variant="body1">{selectedRequest.contact_name}</Typography>
                <Typography variant="body2">{selectedRequest.contact_email}</Typography>
                <Typography variant="body2">{selectedRequest.contact_phone}</Typography>
              </Box>
              {selectedRequest.additional_info && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Additional Info</Typography>
                  <Typography variant="body2">{selectedRequest.additional_info}</Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedRequest(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Credentials Dialog (Post-Approval) */}
      <Dialog open={Boolean(credentials)} onClose={() => setCredentials(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: 'var(--accent-green)' }}>Onboarding Successful!</DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 3 }}>
            The organization has been created and the admin account is ready.
          </Alert>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Please share these temporary credentials with the organization contact.
          </Typography>
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <Typography variant="caption" color="text.secondary">Admin Email</Typography>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontWeight: 'mono' }}>{credentials?.email}</Typography>
                <IconButton size="small" onClick={() => copyToClipboard(credentials?.email || '')}><CopyIcon fontSize="small" /></IconButton>
              </Stack>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <Typography variant="caption" color="text.secondary">Temporary Password</Typography>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontWeight: 'mono', color: 'var(--accent-red)' }}>{credentials?.password}</Typography>
                <IconButton size="small" onClick={() => copyToClipboard(credentials?.password || '')}><CopyIcon fontSize="small" /></IconButton>
              </Stack>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCredentials(null)} variant="contained">Done</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
