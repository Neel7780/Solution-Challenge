import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  FormControlLabel,
  Switch,
  Stack,
  Divider,
} from '@mui/material';
import { LayersOutlined, CorporateFareOutlined, MapOutlined } from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap, ImageOverlay } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// Fix Leaflet's default marker icons in React
import L from 'leaflet';
import 'leaflet-imageoverlay-rotated';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export const PROPERTY_CONFIG = {
  ANCHOR_LAT: 40.7128,      // The real-world Lat of Godot's (0,0)
  ANCHOR_LNG: -74.0060,     // The real-world Lng of Godot's (0,0)
  SCALE_LAT: 0.000008983,   // ~1 meter in degrees latitude
  SCALE_LNG: 0.000011831,   // ~1 meter in degrees longitude
  ROTATION_RAD: 0.25,       // Building offset from True North in radians
};

export const MAP_BOUNDS = {
  xMin: -12.0,
  xMax: 8.0,
  yMin: -18.0,
  yMax: 13.0
};

export const GODOT_MAX_X = 800;
export const GODOT_MAX_Y = 600;

// Georeference Translation Bridge: Godot (x, y) -> LatLng
export function godotToLatLng(x: number, y: number) {
  const theta = PROPERTY_CONFIG.ROTATION_RAD;
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);

  // Rotate Godot coordinates (x is East, y is South in Godot coordinates)
  // East offset (meters) = x * cos(theta) - y * sin(theta)
  // North offset (meters) = -x * sin(theta) - y * cos(theta)
  const eastOffset = x * cosTheta - y * sinTheta;
  const northOffset = -x * sinTheta - y * cosTheta;

  const lat = PROPERTY_CONFIG.ANCHOR_LAT + northOffset * PROPERTY_CONFIG.SCALE_LAT;
  const lng = PROPERTY_CONFIG.ANCHOR_LNG + eastOffset * PROPERTY_CONFIG.SCALE_LNG;

  return [lat, lng] as [number, number];
}

// Convert coordinates robustly (supports real GPS, Godot world, and old pixels)
export const getGeoreferencedLatLng = (item: any) => {
  const lat = Number(item.latitude);
  const lng = Number(item.longitude);

  if (isNaN(lat) || isNaN(lng)) {
    return [PROPERTY_CONFIG.ANCHOR_LAT, PROPERTY_CONFIG.ANCHOR_LNG] as [number, number];
  }

  // 1. Real GPS coordinates (New York area)
  if (lat > 40.0 && lat < 41.5 && lng > -74.5 && lng < -73.0) {
    return [lat, lng] as [number, number];
  }

  // 2. Godot world coordinates
  if (lat >= -50 && lat <= 50 && lng >= -50 && lng <= 50) {
    return godotToLatLng(lat, lng);
  }

  // 3. Legacy pixel coordinates
  const worldX = -9.0 + (lng / 800) * 14.0;
  const worldY = -15.0 + (lat / 600) * 25.0;
  return godotToLatLng(worldX, worldY);
};

// Inverse Georeference: LatLng -> Godot (x, y)
export function latLngToGodot(lat: number, lng: number) {
  const theta = PROPERTY_CONFIG.ROTATION_RAD;
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);

  // Relative offsets in degrees
  const dLat = lat - PROPERTY_CONFIG.ANCHOR_LAT;
  const dLng = lng - PROPERTY_CONFIG.ANCHOR_LNG;

  // Relative offsets in meters
  const northOffset = dLat / PROPERTY_CONFIG.SCALE_LAT;
  const eastOffset = dLng / PROPERTY_CONFIG.SCALE_LNG;

  // Rotate back (inverse rotation)
  const x = eastOffset * cosTheta - northOffset * sinTheta;
  const y = -eastOffset * sinTheta - northOffset * cosTheta;

  return [x, y] as [number, number];
}

// Convert coordinates robustly to flat schematic coordinate [y, x]
export const getSchematicLatLng = (item: any) => {
  const lat = Number(item.latitude);
  const lng = Number(item.longitude);

  if (isNaN(lat) || isNaN(lng)) {
    return [
      (MAP_BOUNDS.yMin + MAP_BOUNDS.yMax) / 2,
      (MAP_BOUNDS.xMin + MAP_BOUNDS.xMax) / 2
    ] as [number, number];
  }

  // 1. Real GPS coordinates: invert to get Godot world units [x, y], then return [y, x]
  if (lat > 40.0 && lat < 41.5 && lng > -74.5 && lng < -73.0) {
    const [x, y] = latLngToGodot(lat, lng);
    return [y, x] as [number, number];
  }

  // 2. Godot world coordinates: return [y, x] (lat is x, lng is y)
  if (lat >= -50 && lat <= 50 && lng >= -50 && lng <= 50) {
    return [lng, lat] as [number, number];
  }

  // 3. Legacy pixel coordinates
  const worldX = -9.0 + (lng / 800) * 14.0;
  const worldY = -15.0 + (lat / 600) * 25.0;
  return [worldY, worldX] as [number, number];
};

// Component to dynamically fit layout bounds
function FitBoundsComponent({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds);
  }, [map, bounds]);
  return null;
}

// Custom React-Leaflet component to render rotated ImageOverlay
interface RotatedImageOverlayProps {
  url: string;
  topLeft: [number, number];
  topRight: [number, number];
  bottomLeft: [number, number];
  opacity?: number;
  interactive?: boolean;
}

function RotatedImageOverlay({
  url,
  topLeft,
  topRight,
  bottomLeft,
  opacity = 1.0,
  interactive = true,
}: RotatedImageOverlayProps) {
  const map = useMap();
  const overlayRef = useRef<any>(null);

  useEffect(() => {
    if (!(L.imageOverlay as any).rotated) {
      console.error('Leaflet.ImageOverlay.Rotated plugin is not loaded');
      return;
    }

    const topleftLatLng = L.latLng(topLeft);
    const toprightLatLng = L.latLng(topRight);
    const bottomleftLatLng = L.latLng(bottomLeft);

    const overlay = (L.imageOverlay as any).rotated(
      url,
      topleftLatLng,
      toprightLatLng,
      bottomleftLatLng,
      {
        opacity,
        interactive,
      }
    ).addTo(map);

    overlayRef.current = overlay;

    return () => {
      if (overlayRef.current && map) {
        map.removeLayer(overlayRef.current);
      }
    };
  }, [map, url, topLeft, topRight, bottomLeft, opacity, interactive]);

  return null;
}

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

const exitIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function getFloorOfUser(user: any) {
  const name = (user.zone_name || '').toLowerCase();
  if (name.includes('floor 2') || name.startsWith('2') || name.includes('room 2') || name.includes('suite 2')) return '2';
  if (name.includes('floor 3') || name.startsWith('3') || name.includes('room 3') || name.includes('suite 3')) return '3';
  return '1';
}

function getFloorOfIncident(incident: any) {
  const desc = (incident.description || '').toLowerCase();
  if (desc.includes('floor 2') || desc.includes('level 2') || desc.includes('f2') || desc.includes('zone b')) return '2';
  if (desc.includes('floor 3') || desc.includes('level 3') || desc.includes('f3') || desc.includes('zone c')) return '3';
  return '1';
}

export default function Locations() {
  const containerRef = useRef(null);
  const [center] = useState<[number, number]>([40.7128, -74.006]); // Default center
  const { user } = useAuthStore();
  const propertyId = user?.property_id || 1;

  // GIS Controls State
  const [viewMode, setViewMode] = useState<'global' | 'schematic'>('global');
  const [showIncidents, setShowIncidents] = useState(true);
  const [showPersonnel, setShowPersonnel] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState('1');

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
      return getGeoreferencedLatLng(incidents[0]);
    }
    return center;
  }, [incidents, center]);

  const topLeft = useMemo(() => godotToLatLng(MAP_BOUNDS.xMin, MAP_BOUNDS.yMin), []);
  const topRight = useMemo(() => godotToLatLng(MAP_BOUNDS.xMax, MAP_BOUNDS.yMin), []);
  const bottomLeft = useMemo(() => godotToLatLng(MAP_BOUNDS.xMin, MAP_BOUNDS.yMax), []);

  // Map database zones by ID for fast lookup
  const zonesById = useMemo(() => {
    const map: { [id: number]: any } = {};
    zones.forEach((z: any) => {
      map[z.id] = z;
    });
    return map;
  }, [zones]);

  // Safe Exit Assembly Points (Dynamic from DB + Mock Fallback)
  const assemblyPoints = useMemo(() => {
    const dbExits = zones.filter(
      (z: any) => z.zone_type === 'safe_zone' || z.zone_type === 'assembly_point' || z.zone_type === 'exit'
    );
    if (dbExits.length > 0) {
      return dbExits.map((z: any) => {
        let lat = mapCenter[0];
        let lng = mapCenter[1];
        if (z.coordinates) {
          try {
            const geom = typeof z.coordinates === 'string' ? JSON.parse(z.coordinates) : z.coordinates;
            if (geom.type === 'Point') {
              lat = geom.coordinates[1];
              lng = geom.coordinates[0];
            } else if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
              const coordsList = geom.coordinates[0];
              if (Array.isArray(coordsList) && coordsList.length > 0) {
                const firstPoint = coordsList[0];
                lng = firstPoint[0];
                lat = firstPoint[1];
              }
            }
          } catch (e) {
            console.error('Failed to parse zone coordinates:', e);
          }
        }
        return {
          id: z.id,
          name: z.name,
          latitude: lat,
          longitude: lng,
          capacity: z.capacity,
          occupancy: z.current_occupancy
        };
      });
    }

    return [
      { id: 'mock-a', name: 'SAFE ASSEMBLY GATE A (NORTH)', latitude: mapCenter[0] + 0.0012, longitude: mapCenter[1] - 0.0012, capacity: 400, occupancy: 0 },
      { id: 'mock-b', name: 'SAFE ASSEMBLY GATE B (SOUTH)', latitude: mapCenter[0] - 0.0012, longitude: mapCenter[1] + 0.0012, capacity: 600, occupancy: 0 }
    ];
  }, [zones, mapCenter]);

  // Filter Data Dynamically by Floor
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc: any) => {
      const zone = zonesById[inc.zone_id];
      if (zone) {
        return String(zone.floor_number || 1) === selectedFloor;
      }
      return getFloorOfIncident(inc) === selectedFloor;
    });
  }, [incidents, zonesById, selectedFloor]);

  const filteredUsers = useMemo(() => {
    return activeUsers.filter((u: any) => {
      const zone = zonesById[u.zone_id];
      if (zone) {
        return String(zone.floor_number || 1) === selectedFloor;
      }
      return getFloorOfUser(u) === selectedFloor;
    });
  }, [activeUsers, zonesById, selectedFloor]);

  const filteredZones = useMemo(() => {
    return zones.filter((z: any) => String(z.floor_number || 1) === selectedFloor);
  }, [zones, selectedFloor]);

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
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-soft)',
            }}
          >
            <Box sx={{ height: '100%', width: '100%', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
              <MapContainer
                key={viewMode}
                center={viewMode === 'global' ? mapCenter : [GODOT_MAX_Y / 2, GODOT_MAX_X / 2]}
                zoom={viewMode === 'global' ? 16 : 0}
                crs={viewMode === 'global' ? L.CRS.EPSG3857 : L.CRS.Simple}
                style={{ height: '100%', width: '100%' }}
              >
                {viewMode === 'global' ? (
                  <>
                    <TileLayer
                      attribution='&copy; OpenStreetMap contributors'
                      url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    />

                    {/* Rotated Indoor Floor Plan Overlay */}
                    <RotatedImageOverlay
                      url={`/assets/maps/floor${selectedFloor}.jpg`}
                      topLeft={topLeft}
                      topRight={topRight}
                      bottomLeft={bottomLeft}
                      opacity={0.8}
                    />
                  </>
                ) : (
                  <>
                    {/* Flat Floor Plan ImageOverlay */}
                    <ImageOverlay
                      url={`/assets/maps/floor${selectedFloor}.jpg`}
                      bounds={[[0, 0], [GODOT_MAX_Y, GODOT_MAX_X]]}
                      opacity={0.9}
                    />
                    <FitBoundsComponent bounds={[[0, 0], [GODOT_MAX_Y, GODOT_MAX_X]]} />
                  </>
                )}
                
                {/* Active Incidents & Buffers */}
                {showIncidents && filteredIncidents.map((incident: any) => {
                  const pos = viewMode === 'global' ? getGeoreferencedLatLng(incident) : getSchematicLatLng(incident);
                  return (
                    <React.Fragment key={`incident-${incident.id}`}>
                      <Circle
                        center={pos}
                        radius={viewMode === 'global' ? 15 : 20}
                        pathOptions={{ fillColor: '#d32f2f', fillOpacity: 0.15, color: '#d32f2f', weight: 1.5 }}
                      />
                      <Marker 
                        position={pos}
                        icon={incidentIcon}
                      >
                        <Popup>
                          <Typography variant="subtitle2" sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
                            CRITICAL: {incident.incident_type.toUpperCase()} (LEVEL {selectedFloor})
                          </Typography>
                          <Typography variant="body2">{incident.description}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Reported: {new Date(incident.created_at).toLocaleTimeString()}
                          </Typography>
                        </Popup>
                      </Marker>
                    </React.Fragment>
                  );
                })}

                {/* Evacuation Paths to Exit Assembly Areas */}
                {showRoutes && filteredIncidents.map((incident: any) => {
                  const incPos = viewMode === 'global' ? getGeoreferencedLatLng(incident) : getSchematicLatLng(incident);
                  return assemblyPoints.map((exit: any) => {
                    const exitPos = viewMode === 'global' ? [exit.latitude, exit.longitude] as [number, number] : getSchematicLatLng(exit);
                    return (
                      <Polyline
                        key={`paths-${incident.id}-${exit.id}`}
                        positions={[incPos, exitPos]}
                        pathOptions={{ color: '#2e7d32', weight: 2.5, dashArray: '6, 12', opacity: 0.8 }}
                      />
                    );
                  });
                })}

                {/* Exit Assembly Gates */}
                {showZones && assemblyPoints.map((exit: any) => {
                  const pos = viewMode === 'global' ? [exit.latitude, exit.longitude] as [number, number] : getSchematicLatLng(exit);
                  return (
                    <Marker key={`exit-${exit.id}`} position={pos} icon={exitIcon}>
                      <Popup>
                        <Typography variant="subtitle2" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                          {exit.name.toUpperCase()}
                        </Typography>
                        <Typography variant="body2">Capacity: {exit.capacity} people</Typography>
                        <Typography variant="caption" color="text.secondary">Status: Clear & Accessible</Typography>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Tracked Personnel */}
                {showPersonnel && filteredUsers.map((user: any) => {
                  const pos = viewMode === 'global' ? getGeoreferencedLatLng(user) : getSchematicLatLng(user);
                  return (
                    <Marker 
                      key={`user-${user.id}`} 
                      position={pos}
                      icon={personIcon}
                    >
                      <Popup>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{user.name}</Typography>
                        <Typography variant="body2">Role: {user.role}</Typography>
                        <Typography variant="body2">Status: <span style={{ color: user.user_status === 'safe' ? '#2e7d32' : '#ed6c02' }}>{user.user_status}</span></Typography>
                        <Typography variant="caption" color="text.secondary">
                          Last Update: {new Date(user.recorded_at).toLocaleTimeString()}
                        </Typography>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              {/* Floating Esri-Style Control Box */}
              <Paper
                elevation={3}
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  zIndex: 1000,
                  width: 210,
                  backgroundColor: 'var(--bg-glass)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid var(--border-medium)',
                  boxShadow: 'var(--shadow-soft)',
                  borderRadius: 2,
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)', mb: 1, display: 'flex', alignItems: 'center', gap: 0.8, fontSize: '0.82rem' }}>
                    <MapOutlined fontSize="small" sx={{ color: 'var(--accent-blue)' }} />
                    VIEW MODE
                  </Typography>
                  <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(e, val) => val && setViewMode(val as 'global' | 'schematic')}
                    aria-label="View mode select"
                    size="small"
                    fullWidth
                  >
                    <ToggleButton value="global" sx={{ py: 0.5, fontSize: '0.68rem', fontWeight: 700 }}>GLOBAL</ToggleButton>
                    <ToggleButton value="schematic" sx={{ py: 0.5, fontSize: '0.68rem', fontWeight: 700 }}>INDOOR</ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 0.8, fontSize: '0.82rem' }}>
                    <LayersOutlined fontSize="small" sx={{ color: 'var(--accent-blue)' }} />
                    TACTICAL GIS LAYERS
                  </Typography>
                </Box>

                <Stack spacing={0.6}>
                  <FormControlLabel
                    control={<Switch size="small" checked={showIncidents} onChange={(e) => setShowIncidents(e.target.checked)} color="error" />}
                    label={<Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 500 }}>Alert Zones</Typography>}
                    sx={{ m: 0 }}
                  />
                  <FormControlLabel
                    control={<Switch size="small" checked={showPersonnel} onChange={(e) => setShowPersonnel(e.target.checked)} color="primary" />}
                    label={<Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 500 }}>Staff Tracking</Typography>}
                    sx={{ m: 0 }}
                  />
                  <FormControlLabel
                    control={<Switch size="small" checked={showZones} onChange={(e) => setShowZones(e.target.checked)} color="success" />}
                    label={<Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 500 }}>Assembly Areas</Typography>}
                    sx={{ m: 0 }}
                  />
                  <FormControlLabel
                    control={<Switch size="small" checked={showRoutes} onChange={(e) => setShowRoutes(e.target.checked)} color="success" />}
                    label={<Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 500 }}>Evacuation Paths</Typography>}
                    sx={{ m: 0 }}
                  />
                </Stack>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)', mb: 1, display: 'flex', alignItems: 'center', gap: 0.8, fontSize: '0.82rem' }}>
                    <CorporateFareOutlined fontSize="small" sx={{ color: 'var(--accent-blue)' }} />
                    LEVEL FOCUS
                  </Typography>
                  <ToggleButtonGroup
                    value={selectedFloor}
                    exclusive
                    onChange={(e, val) => val && setSelectedFloor(val)}
                    aria-label="Floor level focus select"
                    size="small"
                    fullWidth
                  >
                    <ToggleButton value="1" sx={{ py: 0.5, fontSize: '0.72rem', fontWeight: 700 }}>L1</ToggleButton>
                    <ToggleButton value="2" sx={{ py: 0.5, fontSize: '0.72rem', fontWeight: 700 }}>L2</ToggleButton>
                    <ToggleButton value="3" sx={{ py: 0.5, fontSize: '0.72rem', fontWeight: 700 }}>L3</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Paper>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: 'calc(100vh - 180px)', overflow: 'auto' }}>
            <Paper
              className="anim-panel"
              sx={{
                p: 3,
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                boxShadow: 'var(--shadow-soft)',
              }}
            >
              <Typography variant="h6" sx={{ mb: 3 }}>Zone Occupancy (Level {selectedFloor})</Typography>
              {loadingZones ? <CircularProgress size={24} /> : filteredZones.map((loc: any) => {
                const percentage = (loc.current_occupancy / (loc.capacity || 1)) * 100;
                let color = percentage > 90 ? '#d32f2f' : percentage > 75 ? '#ed6c02' : '#0079c1';
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
                        backgroundColor: 'rgba(0,0,0,0.06)',
                        '& .MuiLinearProgress-bar': { backgroundColor: color },
                      }}
                    />
                  </Box>
                );
              })}
              {filteredZones.length === 0 && !loadingZones && (
                <Typography variant="body2" color="text.secondary">No zones configured for Level {selectedFloor}.</Typography>
              )}
            </Paper>

            <Paper
              className="anim-panel"
              sx={{
                p: 3,
                flexGrow: 1,
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                boxShadow: 'var(--shadow-soft)',
              }}
            >
              <Typography variant="h6" sx={{ mb: 2 }}>Active Level Staff ({filteredUsers.length})</Typography>
              <List disablePadding>
                {loadingUsers ? <CircularProgress size={24} /> : filteredUsers.slice(0, 10).map((user: any) => (
                  <ListItem key={user.id} disableGutters sx={{ borderBottom: '1px solid var(--border-subtle)', py: 1.5 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: user.role === 'staff' || user.role === 'security' ? 'rgba(0, 121, 193, 0.1)' : 'rgba(0,0,0,0.04)', color: user.role === 'staff' || user.role === 'security' ? '#0079c1' : '#5f6368' }}>
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
                {filteredUsers.length === 0 && !loadingUsers && (
                  <Typography variant="body2" color="text.secondary">No active personnel detected on Level {selectedFloor}.</Typography>
                )}
              </List>
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
