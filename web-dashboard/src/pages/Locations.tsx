import React, { useState, useRef, useMemo } from 'react';
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
  Chip,
  CircularProgress
} from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const personIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const incidentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function Locations() {
  const containerRef = useRef(null);
  const [center] = useState<[number, number]>([40.7128, -74.006]); // Default center
  const { user } = useAuthStore();
  const propertyId = user?.property_id || 1;

  // Fetch Zones
  const { data: zones = [], isLoading: loadingZones } = useQuery({
    queryKey: ['zones', propertyId],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/locations/zones/${propertyId}`);
      return res.data.zones;
    },
    enabled: Boolean(propertyId),
  });

  // Fetch Active Users
  const { data: activeUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['active-users', propertyId],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/locations/active-users/${propertyId}`);
      return res.data.locations;
    },
    enabled: Boolean(propertyId),
    refetchInterval: 5000,
  });

  // Fetch Active Incidents
  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents', propertyId],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/crisis/active`, { params: { propertyId } });
      return res.data.incidents;
    },
    enabled: Boolean(propertyId),
    refetchInterval: 10000,
  });

  useGSAP(() => {
    gsap.from('.anim-panel', {
      y: 20,
      opacity: 0,
      duration: 0.6,
      stagger: 0.2,
      ease: 'power3.out',
      clearProps: 'all',
      force3D: false,
    });
  }, { scope: containerRef });

  const mapCenter = useMemo(() => {
    if (incidents.length > 0 && incidents[0].latitude && incidents[0].longitude) {
      return [Number(incidents[0].latitude), Number(incidents[0].longitude)] as [number, number];
    }
    return center;
  }, [incidents, center]);

  return (
    <Box ref={containerRef}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" sx={{ fontSize: '2rem' }}>Live Map & Tracking</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper
            className="anim-panel"
            sx={{
              p: 2,
              height: 'calc(100vh - 180px)',
              minHeight: 500,
              backgroundColor: 'rgba(18, 18, 26, 0.98)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <Box sx={{ height: '100%', width: '100%', borderRadius: 3, overflow: 'hidden' }}>
              <MapContainer
                center={mapCenter}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                
                {/* Active Incidents */}
                {incidents.map((incident: any) => (
                  <React.Fragment key={`incident-${incident.id}`}>
                    <Circle
                      center={[Number(incident.latitude), Number(incident.longitude)]}
                      radius={100}
                      pathOptions={{ fillColor: '#ef4444', fillOpacity: 0.2, color: '#ef4444', weight: 2 }}
                    />
                    <Marker 
                      position={[Number(incident.latitude), Number(incident.longitude)]}
                      icon={incidentIcon}
                    >
                      <Popup>
                        <Typography variant="subtitle2" sx={{ color: '#ef4444', fontWeight: 'bold' }}>
                          CRITICAL: {incident.incident_type.toUpperCase()}
                        </Typography>
                        <Typography variant="body2">{incident.description}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Reported: {new Date(incident.created_at).toLocaleTimeString()}
                        </Typography>
                      </Popup>
                    </Marker>
                  </React.Fragment>
                ))}

                {/* Active Users */}
                {activeUsers.map((user: any) => (
                  <Marker 
                    key={`user-${user.id}`} 
                    position={[Number(user.latitude), Number(user.longitude)]}
                    icon={personIcon}
                  >
                    <Popup>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{user.name}</Typography>
                      <Typography variant="body2">Role: {user.role}</Typography>
                      <Typography variant="body2">Status: <span style={{ color: user.user_status === 'safe' ? '#4caf50' : '#ff9800' }}>{user.user_status}</span></Typography>
                      <Typography variant="caption" color="text.secondary">
                        Last Update: {new Date(user.recorded_at).toLocaleTimeString()}
                      </Typography>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: 'calc(100vh - 180px)', overflow: 'auto' }}>
            <Paper
              className="anim-panel"
              sx={{
                p: 3,
                backgroundColor: 'rgba(18, 18, 26, 0.98)',
                border: '1px solid var(--border-medium)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <Typography variant="h6" sx={{ mb: 3 }}>Zone Occupancy</Typography>
              {loadingZones ? <CircularProgress size={24} /> : zones.map((loc: any) => {
                const percentage = (loc.current_occupancy / (loc.capacity || 1)) * 100;
                let color = percentage > 90 ? '#ef4444' : percentage > 75 ? '#f59e0b' : '#3b82f6';
                return (
                  <Box key={loc.id} sx={{ mb: 3, '&:last-child': { mb: 0 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{loc.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        <span style={{ color }}>{loc.current_occupancy}</span> / {loc.capacity}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(percentage, 100)}
                      sx={{
                        height: 6,
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        '& .MuiLinearProgress-bar': { backgroundColor: color },
                      }}
                    />
                  </Box>
                );
              })}
              {zones.length === 0 && !loadingZones && (
                <Typography variant="body2" color="text.secondary">No zones configured.</Typography>
              )}
            </Paper>

            <Paper
              className="anim-panel"
              sx={{
                p: 3,
                flexGrow: 1,
                backgroundColor: 'rgba(18, 18, 26, 0.98)',
                border: '1px solid var(--border-medium)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <Typography variant="h6" sx={{ mb: 2 }}>Recently Active Personnel</Typography>
              <List disablePadding>
                {loadingUsers ? <CircularProgress size={24} /> : activeUsers.slice(0, 10).map((user: any) => (
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
                          <Typography variant="caption" color="text.secondary">
                            {user.zone_name || 'Unknown'} • {new Date(user.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Box>
                      }
                    />
                    <Chip size="small" label={user.role} sx={{ fontSize: '0.65rem' }} />
                  </ListItem>
                ))}
                {activeUsers.length === 0 && !loadingUsers && (
                  <Typography variant="body2" color="text.secondary">No active personnel detected.</Typography>
                )}
              </List>
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
