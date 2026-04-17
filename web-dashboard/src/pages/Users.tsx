import React, { useRef } from 'react';
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
  Avatar,
  Button,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export default function Users() {
  const containerRef = useRef(null);
  
  const users = [
    { id: 1, name: 'John Smith', email: 'john@hotel.com', role: 'guest', room: '301', status: 'active', phone: '+1 555-0101' },
    { id: 2, name: 'Sarah Johnson', email: 'sarah@hotel.com', role: 'staff', room: '101', status: 'active', phone: '+1 555-0102' },
    { id: 3, name: 'Mike Davis', email: 'mike@hotel.com', role: 'security', room: '102', status: 'active', phone: '+1 555-0103' },
    { id: 4, name: 'Emma Wilson', email: 'emma@hotel.com', role: 'guest', room: '156', status: 'evacuated', phone: '+1 555-0104' },
    { id: 5, name: 'Tom Brown', email: 'tom@hotel.com', role: 'admin', room: '100', status: 'active', phone: '+1 555-0105' },
    { id: 6, name: 'Lisa Chen', email: 'lisa@hotel.com', role: 'staff', room: '103', status: 'active', phone: '+1 555-0106' },
  ];

  useGSAP(() => {
    gsap.from('.table-row', {
      x: -20,
      opacity: 0,
      duration: 0.4,
      stagger: 0.05,
      ease: 'power2.out',
    });
  }, { scope: containerRef });

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'admin': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', label: 'Admin' };
      case 'security': return { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', label: 'Security' };
      case 'staff': return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', label: 'Staff' };
      default: return { bg: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', label: 'Guest' };
    }
  };

  return (
    <Box ref={containerRef}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h2" sx={{ fontSize: '2rem' }}>
          Personnel Management
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />}>
          Add User
        </Button>
      </Box>

      <TextField
        fullWidth
        placeholder="Search users by name, email, or room..."
        sx={{ mb: 4, '& .MuiOutlinedInput-root': { background: 'rgba(255,255,255,0.02)' } }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          },
        }}
      />

      <Paper className="glass">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Room</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => {
                const roleStyle = getRoleStyle(user.role);
                return (
                  <TableRow key={user.id} className="table-row" hover sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ background: roleStyle.bg, color: roleStyle.color, fontWeight: 700 }}>
                          {user.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 'bold', color: 'text.primary' }}>{user.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={roleStyle.label}
                        sx={{ background: roleStyle.bg, color: roleStyle.color, fontWeight: 700 }}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.room || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.phone || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.status}
                        variant="outlined"
                        color={user.status === 'active' ? 'success' : 'warning'}
                        size="small"
                        sx={{ fontWeight: 600, textTransform: 'uppercase' }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
