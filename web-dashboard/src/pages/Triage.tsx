import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  IconButton,
} from '@mui/material';
import {
  CheckCircle as SafeIcon,
  Warning as DistressedIcon,
  Help as HelpIcon,
  Search as MissingIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const TriageCard = ({ title, count, icon: Icon, color, bgColor }: any) => (
  <Paper
    sx={{
      p: 3,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      backgroundColor: bgColor,
    }}
  >
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        backgroundColor: `${color}20`,
      }}
    >
      <Icon sx={{ fontSize: 32, color }} />
    </Box>
    <Box>
      <Typography variant="overline" color="textSecondary">
        {title}
      </Typography>
      <Typography variant="h3" sx={{ fontWeight: 'bold', color }}>
        {count}
      </Typography>
    </Box>
  </Paper>
);

export default function Triage() {
  const { data: triageData } = useQuery(
    'triageData',
    () => axios.get(`${API_URL}/dashboard/triage/1`).then((res) => res.data.triage),
    { refetchInterval: 10000 }
  );

  const triageGroups = [
    {
      title: 'Safe',
      count: triageData?.safe_count || 0,
      icon: SafeIcon,
      color: '#4caf50',
      bgColor: '#1b5e1b20',
    },
    {
      title: 'Distressed',
      count: triageData?.distressed_count || 0,
      icon: DistressedIcon,
      color: '#ff9800',
      bgColor: '#e6510020',
    },
    {
      title: 'Need Help',
      count: triageData?.needs_help_count || 0,
      icon: HelpIcon,
      color: '#ff5722',
      bgColor: '#bf360c20',
    },
    {
      title: 'Missing',
      count: (triageData?.missing_count || 0) + (triageData?.unchecked || 0),
      icon: MissingIcon,
      color: '#f44336',
      bgColor: '#b71c1c20',
    },
  ];

  // Sample data for users table
  const users = [
    { id: 1, name: 'John Smith', room: '301', status: 'safe', time: '2 min ago', role: 'guest' },
    { id: 2, name: 'Sarah Johnson', room: '205', status: 'needs_help', time: '5 min ago', role: 'guest' },
    { id: 3, name: 'Mike Davis', room: '412', status: 'safe', time: '1 min ago', role: 'staff' },
    { id: 4, name: 'Emma Wilson', room: '156', status: 'missing', time: '-', role: 'guest' },
    { id: 5, name: 'Tom Brown', room: '278', status: 'distressed', time: '3 min ago', role: 'guest' },
  ];

  const getStatusChip = (status: string) => {
    const config: any = {
      safe: { color: 'success', icon: SafeIcon, label: 'Safe' },
      distressed: { color: 'warning', icon: DistressedIcon, label: 'Distressed' },
      needs_help: { color: 'error', icon: HelpIcon, label: 'Needs Help' },
      missing: { color: 'default', icon: MissingIcon, label: 'Missing' },
    };
    const { color, label } = config[status] || config.missing;

    return <Chip label={label} color={color} size="small" />;
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Triage Management
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {triageGroups.map((group) => (
          <Grid item xs={12} sm={6} md={3} key={group.title}>
            <TriageCard {...group} />
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
          Personnel Status
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Room</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Update</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {user.name.charAt(0)}
                      </Avatar>
                      {user.name}
                    </Box>
                  </TableCell>
                  <TableCell>{user.room}</TableCell>
                  <TableCell>
                    <Chip label={user.role} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{getStatusChip(user.status)}</TableCell>
                  <TableCell>{user.time}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small">
                      <MessageIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
