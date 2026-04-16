import React from 'react';
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

export default function Users() {
  const users = [
    { id: 1, name: 'John Smith', email: 'john@hotel.com', role: 'guest', room: '301', status: 'active', phone: '+1 555-0101' },
    { id: 2, name: 'Sarah Johnson', email: 'sarah@hotel.com', role: 'staff', room: '101', status: 'active', phone: '+1 555-0102' },
    { id: 3, name: 'Mike Davis', email: 'mike@hotel.com', role: 'security', room: '102', status: 'active', phone: '+1 555-0103' },
    { id: 4, name: 'Emma Wilson', email: 'emma@hotel.com', role: 'guest', room: '156', status: 'evacuated', phone: '+1 555-0104' },
    { id: 5, name: 'Tom Brown', email: 'tom@hotel.com', role: 'admin', room: '100', status: 'active', phone: '+1 555-0105' },
    { id: 6, name: 'Lisa Chen', email: 'lisa@hotel.com', role: 'staff', room: '103', status: 'active', phone: '+1 555-0106' },
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'security':
        return 'warning';
      case 'staff':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Users
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />}>
          Add User
        </Button>
      </Box>

      <TextField
        fullWidth
        placeholder="Search users..."
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      <Paper>
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
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar>{user.name.charAt(0)}</Avatar>
                      <Box>
                        <Typography fontWeight="bold">{user.name}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.role}
                      color={getRoleColor(user.role) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{user.room}</TableCell>
                  <TableCell>{user.phone}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.status}
                      color={user.status === 'active' ? 'success' : 'warning'}
                      size="small"
                    />
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
