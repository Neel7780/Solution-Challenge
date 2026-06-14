import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { API_URL } from '../config';
import { useSocket } from '../context/SocketContext';
import { WebView } from 'react-native-webview';

// Georeference constants matching Locations.tsx and GuestMap.tsx
const PROPERTY_CONFIG = {
  ANCHOR_LAT: 40.7128,      // The real-world Lat of Godot's (0,0)
  ANCHOR_LNG: -74.0060,     // The real-world Lng of Godot's (0,0)
  SCALE_LAT: 0.000008983,   // ~1 meter in degrees latitude
  SCALE_LNG: 0.000011831,   // ~1 meter in degrees longitude
  ROTATION_RAD: 0.25,       // Building offset from True North in radians
};

const godotToLatLng = (x: number, y: number): [number, number] => {
  const theta = PROPERTY_CONFIG.ROTATION_RAD;
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);

  const eastOffset = x * cosTheta - y * sinTheta;
  const northOffset = -x * sinTheta - y * cosTheta;

  const lat = PROPERTY_CONFIG.ANCHOR_LAT + northOffset * PROPERTY_CONFIG.SCALE_LAT;
  const lng = PROPERTY_CONFIG.ANCHOR_LNG + eastOffset * PROPERTY_CONFIG.SCALE_LNG;

  return [lat, lng];
};

const getGeoreferencedLatLng = (latVal: any, lngVal: any): { latitude: number; longitude: number } => {
  const lat = Number(latVal);
  const lng = Number(lngVal);

  if (isNaN(lat) || isNaN(lng)) {
    return { latitude: PROPERTY_CONFIG.ANCHOR_LAT, longitude: PROPERTY_CONFIG.ANCHOR_LNG };
  }

  if (lat > 40.0 && lat < 41.5 && lng > -74.5 && lng < -73.0) {
    return { latitude: lat, longitude: lng };
  }

  if (lat >= -50 && lat <= 50 && lng >= -50 && lng <= 50) {
    const [gLat, gLng] = godotToLatLng(lat, lng);
    return { latitude: gLat, longitude: gLng };
  }

  // Legacy pixel translation
  const worldX = -9.0 + (lng / 800) * 14.0;
  const worldY = -15.0 + (lat / 600) * 25.0;
  const [gLat, gLng] = godotToLatLng(worldX, worldY);
  return { latitude: gLat, longitude: gLng };
};

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

export default function MapScreen({ navigation }: any) {
  const { user } = useAuth();
  const { location } = useLocation();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [guestCoords, setGuestCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [guestLocationUpdatedAt, setGuestLocationUpdatedAt] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMapMinimized, setIsMapMinimized] = useState<boolean>(false);

  const { socket, connected } = useSocket();
  const propertyId = user?.property_id || 2;

  const fetchIncidents = async () => {
    try {
      const response = await axios.get(`${API_URL}/crisis/active`);
      setIncidents(response.data.incidents);
    } catch (error) {
      console.error('Error fetching incidents for map:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchZones = async () => {
    try {
      const response = await axios.get(`${API_URL}/locations/zones/${propertyId}`);
      setZones(response.data.zones || []);
    } catch (error) {
      console.error('Error fetching zones on mobile map:', error);
    }
  };

  const fetchLocationData = async () => {
    const isResponder = user?.role === 'responder' || user?.role === 'security' || user?.role === 'staff' || user?.role === 'admin' || user?.role === 'org_admin' || user?.role === 'super_admin';
    // Fetch own guest simulation location
    if (user?.id || user?._id) {
      try {
        const uId = user.id || user._id;
        const res = await axios.get(`${API_URL}/locations/history/${uId}`);
        const history = res.data.history;
        if (history && history.length > 0) {
          const georef = getGeoreferencedLatLng(history[0].latitude, history[0].longitude);
          setGuestCoords(georef);
          setGuestLocationUpdatedAt(history[0].recorded_at || null);
        }
      } catch (err) {
        console.log('Error fetching location history on mobile map:', err);
      }
    }

    // Fetch all active users if responder
    if (isResponder) {
      try {
        const res = await axios.get(`${API_URL}/locations/active-users/${propertyId}`);
        setActiveUsers(res.data.locations || []);
      } catch (err) {
        console.log('Error fetching active users on mobile map:', err);
      }
    }
  };

  useEffect(() => {
    fetchIncidents();
    fetchZones();
    fetchLocationData();
  }, [propertyId]);

  // Socket listener for live updates
  useEffect(() => {
    if (!socket || !connected) return;

    socket.on('crisis_reported', fetchIncidents);
    socket.on('incident_status_update', fetchIncidents);
    socket.on('property_status_update', fetchIncidents);
    socket.on('location_update', fetchLocationData);

    return () => {
      socket.off('crisis_reported', fetchIncidents);
      socket.off('incident_status_update', fetchIncidents);
      socket.off('property_status_update', fetchIncidents);
      socket.off('location_update', fetchLocationData);
    };
  }, [socket, connected]);

  // Poll for location updates as fallback
  useEffect(() => {
    const intervalId = setInterval(fetchLocationData, 10000); // reduced polling frequency since we have sockets
    return () => clearInterval(intervalId);
  }, [user, propertyId]);


  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return '#d32f2f';
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      default: return '#4caf50';
    }
  };

  const displayLocation = guestCoords || location || { latitude: PROPERTY_CONFIG.ANCHOR_LAT, longitude: PROPERTY_CONFIG.ANCHOR_LNG };
  const activeIncident = incidents.length > 0 ? incidents[0] : null;

  // Safe Exit Assembly Points (Dynamic from DB + Fallback)
  const exitPoints = useMemo(() => {
    const dbExits = zones.filter(
      (z: any) => z.zone_type === 'safe_zone' || z.zone_type === 'assembly_point' || z.zone_type === 'exit'
    );
    if (dbExits.length > 0) {
      return dbExits.map((z: any) => {
        let lat = PROPERTY_CONFIG.ANCHOR_LAT;
        let lng = PROPERTY_CONFIG.ANCHOR_LNG;
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
            console.error('Failed to parse zone coordinates on mobile map:', e);
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
  }, [zones]);

  // Find nearest exit
  const nearestExit = useMemo(() => {
    if (!displayLocation || exitPoints.length === 0) return null;
    let nearest = exitPoints[0];
    let minDistance = Infinity;

    exitPoints.forEach((exit) => {
      const dist = getDistanceInMeters(displayLocation.latitude, displayLocation.longitude, exit.latitude, exit.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = exit;
      }
    });

    return {
      ...nearest,
      distance: minDistance,
    };
  }, [exitPoints, displayLocation]);



  const nearestExitLabel = nearestExit ? `${nearestExit.name} · ${nearestExit.distance}m` : 'Calculating route';
  const guestLocationLabel = guestCoords
    ? `Live guest${guestLocationUpdatedAt ? ` · ${new Date(guestLocationUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`
    : 'Guest location idle';

  if (loading || !displayLocation) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#d32f2f" />
        <Text style={styles.loadingText}>Loading Map & Location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View style={styles.topHud}>
        <View style={styles.topHudText}>
          <Text style={styles.kicker}>Mobile Map</Text>
          <Text style={styles.hudTitle}>Voyager evacuation overview</Text>
          <Text style={styles.hudSubtitle}>Leaflet in a WebView with CartoDB Voyager tiles.</Text>
        </View>
        <View style={styles.hudPills}>
          <View style={styles.hudPill}>
            <Text style={styles.hudPillLabel}>Incidents</Text>
            <Text style={styles.hudPillValue}>{incidents.length}</Text>
          </View>
          <View style={styles.hudPillMuted}>
            <Text style={styles.hudPillLabelMuted}>Guest</Text>
            <Text style={styles.hudPillValueMuted}>{guestLocationLabel}</Text>
          </View>
          <View style={styles.hudPillAccent}>
            <Text style={styles.hudPillLabelLight}>Nearest Exit</Text>
            <Text style={styles.hudPillValueLight}>{nearestExitLabel}</Text>
          </View>
        </View>
      </View>

      <View style={{ flex: 1, marginTop: 100 }}>
        {isMapMinimized ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Icon name="map" size={48} color="#94a3b8" />
            <Text style={{ color: '#94a3b8', marginTop: 12, fontSize: 16, fontWeight: 'bold' }}>Map Minimized</Text>
            <Text style={{ color: '#64748b', marginTop: 4, fontSize: 12 }}>Tap the eye icon to expand</Text>
          </View>
        ) : (
          <WebView 
            source={{ uri: 'https://app.mappedin.com/map/6a2d1e9d8c2010000b751066?embedded=true' }}
            style={styles.map}
            javaScriptEnabled={true}
          />
        )}
      </View>
      <TouchableOpacity style={styles.refreshButton} onPress={() => { fetchIncidents(); fetchZones(); }}>
        <Icon name="refresh" size={24} color="#333" />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.refreshButton, { top: 156 }]} onPress={() => setIsMapMinimized(!isMapMinimized)}>
        <Icon name={isMapMinimized ? "visibility" : "visibility-off"} size={24} color="#333" />
      </TouchableOpacity>

      {activeIncident && nearestExit && (
        <View style={styles.evacuationPanel}>
          <View style={styles.evacuationHeader}>
            <View style={styles.evacuationTitleRow}>
              <Icon name="directions-run" size={20} color="#10b981" />
              <Text style={styles.evacuationTitle}>EVACUATION ROUTE ACTIVE</Text>
            </View>
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>{nearestExit.distance}m away</Text>
            </View>
          </View>
          <Text style={styles.evacuationInstructions}>
            Follow the 3D Mappedin evacuation path towards {nearestExit.name}.
          </Text>
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={() => navigation.navigate('Navigation')}
          >
            <Icon name="navigation" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.navButtonText}>Start AI Voice Navigation</Text>
          </TouchableOpacity>
          <View style={styles.safetyTipRow}>
            <Icon name="warning" size={14} color="#fbbf24" />
            <Text style={styles.safetyTipText}>Do not use elevators. Stay low to avoid smoke.</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f9',
  },
  topHud: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  topHudText: {
    flex: 1,
  },
  kicker: {
    color: '#7dd3fc',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  hudTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  hudSubtitle: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    lineHeight: 17,
  },
  hudPills: {
    alignItems: 'flex-end',
    gap: 8,
  },
  hudPill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minWidth: 98,
  },
  hudPillAccent: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.26)',
    minWidth: 98,
  },
  hudPillMuted: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minWidth: 98,
  },
  hudPillLabel: {
    color: 'rgba(255,255,255,0.64)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  hudPillLabelLight: {
    color: '#bbf7d0',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  hudPillLabelMuted: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  hudPillValue: {
    marginTop: 2,
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  hudPillValueMuted: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    fontWeight: '700',
  },
  hudPillValueLight: {
    marginTop: 2,
    color: '#ecfdf5',
    fontSize: 12,
    fontWeight: '800',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  fallbackText: {
    marginTop: 12,
    color: '#4b5563',
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  map: {
    flex: 1,
  },
  refreshButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  evacuationPanel: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#10b981',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  evacuationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  evacuationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  evacuationTitle: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  distanceBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  distanceText: {
    color: '#34d399',
    fontWeight: 'bold',
    fontSize: 12,
  },
  evacuationInstructions: {
    color: '#e2e8f0',
    fontSize: 13,
    marginBottom: 8,
  },
  safetyTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  safetyTipText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  navButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 8,
  },
  navButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
