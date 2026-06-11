import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import MapView, { Marker, Callout, Polyline } from 'react-native-maps';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { API_URL } from '../config';

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
  const [loading, setLoading] = useState<boolean>(true);

  const propertyId = user?.property_id || 2;

  useEffect(() => {
    fetchIncidents();
    fetchZones();
  }, [propertyId]);

  // Poll for location updates of simulated guest
  useEffect(() => {
    let intervalId: any;
    
    const fetchGuestLocationHistory = async () => {
      if (!user?.id && !user?._id) return;
      try {
        const uId = user.id || user._id;
        const res = await axios.get(`${API_URL}/locations/history/${uId}`);
        const history = res.data.history;
        if (history && history.length > 0) {
          const georef = getGeoreferencedLatLng(history[0].latitude, history[0].longitude);
          setGuestCoords(georef);
        }
      } catch (err) {
        console.log('Error fetching location history on mobile map:', err);
      }
    };

    fetchGuestLocationHistory();
    intervalId = setInterval(fetchGuestLocationHistory, 5000);

    return () => clearInterval(intervalId);
  }, [user]);

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

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return '#d32f2f';
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      default: return '#4caf50';
    }
  };

  const displayLocation = guestCoords || location;
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
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: displayLocation.latitude,
          longitude: displayLocation.longitude,
          latitudeDelta: 0.004,
          longitudeDelta: 0.004,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* Custom Marker for Simulated guest location */}
        {guestCoords && (
          <Marker
            coordinate={guestCoords}
            title="You (Simulation)"
            description={`Room ${user?.room_number || 'N/A'}`}
          >
            <View style={styles.userDotContainer}>
              <View style={styles.userDotPulse} />
              <View style={styles.userDot} />
            </View>
          </Marker>
        )}

        {/* Active Emergency Markers */}
        {incidents.map((incident) => {
          const coords = getGeoreferencedLatLng(incident.latitude, incident.longitude);
          const isResolved = incident.status === 'resolved' || incident.status === 'contained';
          return (
            <Marker
              key={incident.id}
              coordinate={coords}
              pinColor={isResolved ? '#4caf50' : getSeverityColor(incident.severity)}
            >
              <Callout onPress={() => navigation.navigate('IncidentDetails', { incidentId: incident.id })}>
                <View style={styles.callout}>
                  <Text style={[styles.calloutTitle, isResolved && { color: '#2e7d32' }]}>
                    {isResolved ? '✅ ' : '🚨 '}{incident.incident_type.toUpperCase()}
                  </Text>
                  <Text style={styles.calloutDesc}>{incident.description}</Text>
                  <Text style={styles.calloutLink}>Tap for details</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}

        {/* Exit Gate Assembly Points */}
        {exitPoints.map((exit) => (
          <Marker
            key={exit.id}
            coordinate={{
              latitude: exit.latitude,
              longitude: exit.longitude,
            }}
            title={exit.name}
            description={`Capacity: ${exit.capacity || 'N/A'}`}
          >
            <View style={styles.exitMarker}>
              <Text style={styles.exitMarkerText}>EXIT</Text>
            </View>
          </Marker>
        ))}

        {/* Evacuation Polyline Path */}
        {nearestExit && activeIncident && (
          <Polyline
            coordinates={[
              { latitude: displayLocation.latitude, longitude: displayLocation.longitude },
              { latitude: nearestExit.latitude, longitude: nearestExit.longitude },
            ]}
            strokeColor="#10b981"
            strokeWidth={4}
            lineDashPattern={[6, 10]}
          />
        )}
      </MapView>

      {/* Floating Evacuation Status Panel */}
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
            Follow the green evacuation path towards {nearestExit.name}.
          </Text>
          <View style={styles.safetyTipRow}>
            <Icon name="warning" size={14} color="#fbbf24" />
            <Text style={styles.safetyTipText}>Do not use elevators. Stay low to avoid smoke.</Text>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.refreshButton} onPress={() => { fetchIncidents(); fetchZones(); }}>
        <Icon name="refresh" size={24} color="#333" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  map: {
    flex: 1,
  },
  callout: {
    padding: 8,
    width: 200,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  calloutDesc: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  calloutLink: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  refreshButton: {
    position: 'absolute',
    top: 16,
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
  exitMarker: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  exitMarkerText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  userDotContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#3b82f6',
    borderWidth: 2,
    borderColor: '#ffffff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  userDotPulse: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.6)',
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
});
