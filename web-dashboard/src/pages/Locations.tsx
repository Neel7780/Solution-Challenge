import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip
} from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

// Fix Leaflet's default marker icons in React
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function Locations() {
  const containerRef = useRef(null);
  const [center] = useState<[number, number]>([40.7128, -74.006]); // NYC coordinates

  const locations = [
    { id: 1, name: 'Main Lobby', type: 'common_area', capacity: 200, current: 85 },
    { id: 2, name: 'Floor 1 - East Wing', type: 'room', capacity: 50, current: 42 },
    { id: 3, name: 'Floor 1 - West Wing', type: 'room', capacity: 50, current: 48 },
    { id: 4, name: 'Restaurant (Dining)', type: 'common_area', capacity: 150, current: 12 },
    { id: 5, name: 'Fitness Center / Gym', type: 'common_area', capacity: 30, current: 4 },
  ];

  const activeUsers = [
    { id: 1, name: 'John Smith', role: 'guest', zone: 'Lobby', time: '2 min ago' },
    { id: 2, name: 'Sarah Johnson', role: 'staff', zone: 'Restaurant', time: '5 min ago' },
    { id: 3, name: 'Mike Davis', role: 'security', zone: 'Floor 1', time: '1 min ago' },
    { id: 4, name: 'Emma Wilson', role: 'guest', zone: 'Gym', time: '15 min ago' },
  ];

  useGSAP(() => {
    gsap.from('.anim-panel', {
      y: 30,
      opacity: 0,
      duration: 0.6,
      stagger: 0.2,
      ease: 'power3.out',
    });
  }, { scope: containerRef });

  return (
    <Box ref={containerRef}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" sx={{ fontSize: '2rem' }}>Live Map & Tracking</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper className="glass anim-panel" sx={{ p: 2, height: 'calc(100vh - 180px)', minHeight: 500 }}>
            <Box sx={{ height: '100%', width: '100%', borderRadius: 3, overflow: 'hidden' }}>
              <MapContainer
                center={center}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                <Circle
                  center={center}
                  radius={100}
                  pathOptions={{ fillColor: '#ef4444', fillOpacity: 0.2, color: '#ef4444', weight: 2 }}
                />
                <Marker position={center}>
                  <Popup>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Grand Hotel</Typography>
                    <Typography variant="body2">Primary Property Location</Typography>
                  </Popup>
                </Marker>
              </MapContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: 'calc(100vh - 180px)', overflow: 'auto' }}>
            <Paper className="glass anim-panel" sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>Zone Occupancy</Typography>
              {locations.map((loc) => {
                const percentage = (loc.current / loc.capacity) * 100;
                let color = percentage > 90 ? '#ef4444' : percentage > 75 ? '#f59e0b' : '#3b82f6';
                return (
                  <Box key={loc.id} sx={{ mb: 3, '&:last-child': { mb: 0 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{loc.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        <span style={{ color }}>{loc.current}</span> / {loc.capacity}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={percentage}
                      sx={{
                        height: 6,
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        '& .MuiLinearProgress-bar': { backgroundColor: color },
                      }}
                    />
                  </Box>
                );
              })}
            </Paper>

            <Paper className="glass anim-panel" sx={{ p: 3, flexGrow: 1 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Last Known Locations</Typography>
              <List disablePadding>
                {activeUsers.map((user) => (
                  <ListItem key={user.id} disableGutters sx={{ borderBottom: '1px solid rgba(255,255,255,0.06)', py: 1.5 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: user.role === 'staff' || user.role === 'security' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(148, 163, 184, 0.2)', color: user.role === 'staff' || user.role === 'security' ? '#60a5fa' : '#cbd5e1' }}>
                        {user.name.charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography sx={{ fontWeight: 500 }}>{user.name}</Typography>}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">{user.zone} • {user.time}</Typography>
                        </Box>
                      }
                    />
                    <Chip size="small" label={user.role} sx={{ fontSize: '0.65rem' }} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
