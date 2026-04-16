import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
} from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery } from 'react-query';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export default function Locations() {
  const [center] = useState([40.7128, -74.006]); // NYC coordinates

  const { data: zones } = useQuery(
    'zones',
    () => axios.get(`${API_URL}/locations/zones/1`).then((res) => res.data.zones)
  );

  const { data: occupancy } = useQuery(
    'occupancy',
    () => axios.get(`${API_URL}/locations/occupancy/1`).then((res) => res.data)
  );

  const locations = [
    { id: 1, name: 'Lobby', type: 'common_area', capacity: 200, current: 45 },
    { id: 2, name: 'Floor 1 - East Wing', type: 'room', capacity: 50, current: 42 },
    { id: 3, name: 'Floor 1 - West Wing', type: 'room', capacity: 50, current: 38 },
    { id: 4, name: 'Restaurant', type: 'common_area', capacity: 150, current: 89 },
    { id: 5, name: 'Gym', type: 'common_area', capacity: 30, current: 12 },
    { id: 6, name: 'Pool Area', type: 'common_area', capacity: 40, current: 8 },
  ];

  const activeUsers = [
    { id: 1, name: 'John Smith', role: 'guest', zone: 'Lobby', time: '2 min ago' },
    { id: 2, name: 'Sarah Johnson', role: 'staff', zone: 'Restaurant', time: '5 min ago' },
    { id: 3, name: 'Mike Davis', role: 'security', zone: 'Floor 1', time: '1 min ago' },
    { id: 4, name: 'Emma Wilson', role: 'guest', zone: 'Gym', time: '15 min ago' },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Location Tracking
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 500 }}>
            <MapContainer
              center={center as any}
              zoom={13}
              style={{ height: '100%', width: '100%', borderRadius: 8 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Circle
                center={center as any}
                radius={500}
                pathOptions={{ fillColor: 'red', fillOpacity: 0.2, color: 'red' }}
              />
              <Marker position={center as any}>
                <Popup>Property Location</Popup>
              </Marker>
            </MapContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Zone Occupancy
            </Typography>
            {locations.map((loc) => (
              <Box key={loc.id} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">{loc.name}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {loc.current}/{loc.capacity}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(loc.current / loc.capacity) * 100}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#333',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor:
                        loc.current / loc.capacity > 0.8 ? '#f44336' : '#4caf50',
                    },
                  }}
                />
              </Box>
            ))}
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Active Users
            </Typography>
            <List dense>
              {activeUsers.map((user) => (
                <ListItem key={user.id}>
                  <ListItemAvatar>
                    <Avatar>{user.name.charAt(0)}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.name}
                    secondary={`${user.zone} • ${user.time}`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
