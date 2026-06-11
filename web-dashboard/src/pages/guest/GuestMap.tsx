import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  DirectionsRun as RunIcon,
  Warning as WarningIcon,
  Explore as ExploreIcon,
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-imageoverlay-rotated';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Georeference constants matching Locations.tsx
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

export function godotToLatLng(x: number, y: number) {
  const theta = PROPERTY_CONFIG.ROTATION_RAD;
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);

  const eastOffset = x * cosTheta - y * sinTheta;
  const northOffset = -x * sinTheta - y * cosTheta;

  const lat = PROPERTY_CONFIG.ANCHOR_LAT + northOffset * PROPERTY_CONFIG.SCALE_LAT;
  const lng = PROPERTY_CONFIG.ANCHOR_LNG + eastOffset * PROPERTY_CONFIG.SCALE_LNG;

  return [lat, lng] as [number, number];
}

export const getGeoreferencedLatLng = (item: any) => {
  const lat = Number(item.latitude);
  const lng = Number(item.longitude);

  if (isNaN(lat) || isNaN(lng)) {
    return [PROPERTY_CONFIG.ANCHOR_LAT, PROPERTY_CONFIG.ANCHOR_LNG] as [number, number];
  }

  if (lat > 40.0 && lat < 41.5 && lng > -74.5 && lng < -73.0) {
    return [lat, lng] as [number, number];
  }

  if (lat >= -50 && lat <= 50 && lng >= -50 && lng <= 50) {
    return godotToLatLng(lat, lng);
  }

  // Legacy pixel translation
  const worldX = -9.0 + (lng / 800) * 14.0;
  const worldY = -15.0 + (lat / 600) * 25.0;
  return godotToLatLng(worldX, worldY);
};

// Rotated ImageOverlay wrapper for React-Leaflet
interface RotatedImageOverlayProps {
  url: string;
  topLeft: [number, number];
  topRight: [number, number];
  bottomLeft: [number, number];
  opacity?: number;
}

function RotatedImageOverlay({
  url,
  topLeft,
  topRight,
  bottomLeft,
  opacity = 1.0,
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
        interactive: false,
      }
    ).addTo(map);

    overlayRef.current = overlay;

    return () => {
      if (overlayRef.current && map) {
        map.removeLayer(overlayRef.current);
      }
    };
  }, [map, url, topLeft, topRight, bottomLeft, opacity]);

  return null;
}

// Map center autofit
function FitBoundsComponent({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds);
  }, [map, bounds]);
  return null;
}

// Custom Marker Icons
const userIcon = new L.DivIcon({
  className: 'custom-user-icon',
  html: `<div style="
    width: 22px;
    height: 22px;
    background-color: #3b82f6;
    border: 3px solid #fff;
    border-radius: 50%;
    box-shadow: 0 0 12px rgba(59, 130, 246, 0.8);
    position: relative;
  ">
    <div style="
      position: absolute;
      width: 34px;
      height: 34px;
      border: 2px solid #3b82f6;
      border-radius: 50%;
      top: -9px;
      left: -9px;
      animation: pulse 1.5s infinite;
      opacity: 0;
    "></div>
  </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

const incidentIcon = L.divIcon({
  className: 'custom-incident-icon',
  html: `<div style="
    width: 26px;
    height: 26px;
    background-color: #ef4444;
    border: 2px solid #fff;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.8);
    animation: flash 1.2s infinite alternate;
  ">
    <span style="color: white; font-size: 14px; font-weight: bold; line-height: 1;">🔥</span>
  </div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13]
});

const exitIcon = L.divIcon({
  className: 'custom-exit-icon',
  html: `<div style="
    width: 50px;
    height: 22px;
    background-color: #10b981;
    border: 2px solid #fff;
    border-radius: 4px;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
  ">
    <span style="color: white; font-size: 10px; font-weight: bold; letter-spacing: 0.05em;">EXIT</span>
  </div>`,
  iconSize: [50, 22],
  iconAnchor: [25, 11]
});

// Haversine distance formula
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export default function GuestMap() {
  const { user } = useAuthStore();
  const propertyId = user?.property_id || 2;
  const [selectedFloor, setSelectedFloor] = useState('1');

  // Set default floor from room number on mount
  useEffect(() => {
    if (user?.room_number) {
      const roomStr = String(user.room_number).trim();
      if (roomStr.startsWith('2')) {
        setSelectedFloor('2');
      } else {
        setSelectedFloor('1');
      }
    }
  }, [user]);

  // Fetch Guest's Own Latest Coordinates
  const { data: locationHistory = [], isLoading: loadingLocation } = useQuery({
    queryKey: ['guest-location-history', user?.id],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/locations/history/${user?.id}`);
      return res.data.history;
    },
    enabled: Boolean(user?.id),
    refetchInterval: 3000, // Frequent updates for live tracking
  });

  // Fetch Zones (Assembly Points/Exits)
  const { data: zones = [], isLoading: loadingZones } = useQuery({
    queryKey: ['zones', propertyId],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/locations/zones/${propertyId}`);
      return res.data.zones;
    },
    enabled: Boolean(propertyId),
  });

  // Fetch Active Incidents
  const { data: incidents = [], isLoading: loadingIncidents } = useQuery({
    queryKey: ['incidents', propertyId],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/crisis/active`, { params: { propertyId } });
      return res.data.incidents;
    },
    enabled: Boolean(propertyId),
    refetchInterval: 5000,
  });

  // Current georeferenced position of the user
  const userPosition = useMemo(() => {
    if (locationHistory.length > 0) {
      return getGeoreferencedLatLng(locationHistory[0]);
    }
    // Fallback default: anchor point
    return [PROPERTY_CONFIG.ANCHOR_LAT, PROPERTY_CONFIG.ANCHOR_LNG] as [number, number];
  }, [locationHistory]);

  const mapCenter = userPosition;

  // Map Bounds for overlay
  const topLeft = useMemo(() => godotToLatLng(MAP_BOUNDS.xMin, MAP_BOUNDS.yMin), []);
  const topRight = useMemo(() => godotToLatLng(MAP_BOUNDS.xMax, MAP_BOUNDS.yMin), []);
  const bottomLeft = useMemo(() => godotToLatLng(MAP_BOUNDS.xMin, MAP_BOUNDS.yMax), []);

  // Safe Exit Assembly Points (Dynamic from DB + Mock Fallback)
  const assemblyPoints = useMemo(() => {
    const dbExits = zones.filter(
      (z: any) => z.zone_type === 'safe_zone' || z.zone_type === 'assembly_point' || z.zone_type === 'exit'
    );
    if (dbExits.length > 0) {
      return dbExits.map((z: any) => {
        let lat = userPosition[0];
        let lng = userPosition[1];
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
      { id: 'mock-a', name: 'SAFE ASSEMBLY GATE A (NORTH)', latitude: PROPERTY_CONFIG.ANCHOR_LAT + 0.0012, longitude: PROPERTY_CONFIG.ANCHOR_LNG - 0.0012, capacity: 400, occupancy: 0 },
      { id: 'mock-b', name: 'SAFE ASSEMBLY GATE B (SOUTH)', latitude: PROPERTY_CONFIG.ANCHOR_LAT - 0.0012, longitude: PROPERTY_CONFIG.ANCHOR_LNG + 0.0012, capacity: 600, occupancy: 0 }
    ];
  }, [zones, userPosition]);

  // Find nearest exit to the guest
  const nearestExit = useMemo(() => {
    if (assemblyPoints.length === 0) return null;
    let nearest = assemblyPoints[0];
    let minDistance = Infinity;

    assemblyPoints.forEach((exit: any) => {
      const dist = getDistanceInMeters(userPosition[0], userPosition[1], exit.latitude, exit.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = exit;
      }
    });

    return {
      ...nearest,
      distance: minDistance,
    };
  }, [assemblyPoints, userPosition]);

  const activeIncident = incidents.length > 0 ? incidents[0] : null;

  if (loadingLocation || loadingZones || loadingIncidents) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: 2 }}>
        <CircularProgress color="primary" />
        <Typography variant="body2" color="text.secondary">Loading live map & evacuation routes...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', height: 'calc(100vh - 150px)', width: '100%' }}>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes flash {
          0% { transform: scale(0.9); opacity: 0.9; }
          100% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 20px rgba(239, 68, 68, 1); }
        }
        .leaflet-container {
          background-color: var(--bg-card) !important;
        }
      `}</style>

      {/* Floating Floor Plan / View Mode Controls */}
      <Paper
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 1000,
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-medium)',
          backdropFilter: 'blur(10px)',
          p: 0.5,
          borderRadius: 2,
        }}
        elevation={6}
      >
        <ToggleButtonGroup
          value={selectedFloor}
          exclusive
          onChange={(e, val) => val && setSelectedFloor(val)}
          size="small"
        >
          <ToggleButton value="1" sx={{ px: 2, fontWeight: 700, color: '#fff', '&.Mui-selected': { bgcolor: 'rgba(59, 130, 246, 0.2)' } }}>FLOOR 1</ToggleButton>
          <ToggleButton value="2" sx={{ px: 2, fontWeight: 700, color: '#fff', '&.Mui-selected': { bgcolor: 'rgba(59, 130, 246, 0.2)' } }}>FLOOR 2</ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      {/* Main Map Container */}
      <MapContainer
        center={mapCenter}
        zoom={18}
        style={{ height: '100%', width: '100%', borderRadius: 12 }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Rotated Floor Plan overlay */}
        <RotatedImageOverlay
          url={`/assets/maps/floor${selectedFloor}.png`}
          topLeft={topLeft}
          topRight={topRight}
          bottomLeft={bottomLeft}
          opacity={0.85}
        />

        {/* User Marker (Pulse) */}
        <Marker position={userPosition} icon={userIcon}>
          <Popup>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>You are here</Typography>
            <Typography variant="caption" color="text.secondary">Room {user?.room_number || 'N/A'}</Typography>
          </Popup>
        </Marker>

        {/* Active Emergency Marker */}
        {activeIncident && (
          <Marker position={getGeoreferencedLatLng(activeIncident)} icon={incidentIcon}>
            <Popup>
              <Typography variant="subtitle2" sx={{ color: '#ef4444', fontWeight: 700 }}>
                🚨 {activeIncident.incident_type.toUpperCase()} HAZARD
              </Typography>
              <Typography variant="body2">{activeIncident.description}</Typography>
            </Popup>
          </Marker>
        )}

        {/* Exit Gate Assembly Points */}
        {assemblyPoints.map((exit: any) => (
          <Marker key={exit.id} position={[exit.latitude, exit.longitude]} icon={exitIcon}>
            <Popup>
              <Typography variant="subtitle2" sx={{ color: '#10b981', fontWeight: 700 }}>{exit.name}</Typography>
              <Typography variant="caption" color="text.secondary">Capacity: {exit.capacity} people</Typography>
            </Popup>
          </Marker>
        ))}

        {/* Evacuation Guideline Polyline (Directions to nearest exit) */}
        {nearestExit && activeIncident && (
          <Polyline
            positions={[userPosition, [nearestExit.latitude, nearestExit.longitude]]}
            pathOptions={{
              color: '#10b981',
              weight: 4,
              dashArray: '8, 12',
              opacity: 0.9,
            }}
          />
        )}

        <FitBoundsComponent bounds={[userPosition, ...assemblyPoints.map((e: any) => [e.latitude, e.longitude] as [number, number])]} />
      </MapContainer>

      {/* Floating Evacuation Status Panel */}
      <Card
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          zIndex: 1000,
          background: activeIncident ? 'rgba(15, 23, 42, 0.9)' : 'var(--bg-glass)',
          backdropFilter: 'blur(16px)',
          border: activeIncident ? '1.5px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-medium)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          {activeIncident ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <RunIcon sx={{ color: '#10b981' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#10b981' }}>
                    EVACUATION ROUTE ACTIVE
                  </Typography>
                </Box>
                {nearestExit && (
                  <Chip
                    label={`${nearestExit.distance} meters away`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                      color: '#34d399',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                    }}
                  />
                )}
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#fff', mb: 0.5 }}>
                  Directions to safe exit:
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                  {nearestExit 
                    ? `Follow the green dashed evacuation path towards ${nearestExit.name}.`
                    : 'Follow the evacuation signs towards the nearest exit stairwell.'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#fbbf24', fontWeight: 600, mt: 1, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.8rem' }}>
                  <WarningIcon sx={{ fontSize: 16 }} /> Do not use elevators. Stay low to avoid smoke.
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <ExploreIcon sx={{ color: 'var(--accent-blue)' }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Property Safe & Monitored
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  No active emergencies. You can view the layout of Floor {selectedFloor} above.
                </Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
