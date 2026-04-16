import React, { useState } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export default function Incidents() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: incidents, isLoading } = useQuery(
    'incidents',
    () => axios.get(`${API_URL}/crisis/active`).then((res) => res.data.incidents)
  );

  const resolveMutation = useMutation(
    (id: number) => axios.post(`${API_URL}/crisis/${id}/resolve`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('incidents');
      },
    }
  );

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'error';
      case 'contained':
        return 'warning';
      case 'resolved':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Incidents
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Report Incident
        </Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Reported</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {incidents?.map((incident: any) => (
                <TableRow key={incident.id}>
                  <TableCell>#{incident.id}</TableCell>
                  <TableCell>
                    <Typography textTransform="capitalize">
                      {incident.incident_type}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={incident.severity}
                      color={getSeverityColor(incident.severity) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={incident.status}
                      color={getStatusColor(incident.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(incident.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>{incident.description}</TableCell>
                  <TableCell align="right">
                    {incident.status === 'active' && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        onClick={() => resolveMutation.mutate(incident.id)}
                      >
                        Resolve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Report New Incident</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Incident Type"
                defaultValue="fire"
              >
                <MenuItem value="fire">Fire</MenuItem>
                <MenuItem value="medical">Medical</MenuItem>
                <MenuItem value="security">Security</MenuItem>
                <MenuItem value="evacuation">Evacuation</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Severity"
                defaultValue="high"
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error">Report Incident</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
