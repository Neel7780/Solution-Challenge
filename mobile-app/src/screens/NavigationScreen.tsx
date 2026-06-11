import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline, Circle } from 'react-native-maps';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { useSocket } from '../context/SocketContext';
import { API_URL } from '../config';
import { getDistanceInMeters, godotToLatLng, latLngToGodot, getGeoreferencedLatLng } from '../utils/georef';
import { findClosestNodeOffline, findShortestPathOffline, Hazard } from '../utils/pathfinding';
import { speakGuidance, stopSpeech } from '../utils/voiceGuidance';
import { NavigationNode } from '../types/navigation';

export default function NavigationScreen({ navigation }: any) {
  const { user } = useAuth();
  const { location } = useLocation();
  const { socket, connected } = useSocket();

  const [loading, setLoading] = useState<boolean>(true);
  const [routePath, setRoutePath] = useState<NavigationNode[]>([]);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [distanceRemaining, setDistanceRemaining] = useState<number>(0);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [offlineMode, setOfflineMode] = useState<boolean>(false);

  const propertyId = user?.property_id || 2;
  const currentFloor = Number(user?.room_number?.startsWith('2') ? 2 : 1);

  // Convert current GPS location to Godot coordinates
  const currentGodotCoords = useMemo(() => {
    if (!location?.latitude || !location?.longitude) return null;
    return latLngToGodot(location.latitude, location.longitude);
  }, [location]);

  // Fetch active incidents to find active hazards
  const fetchHazards = async () => {
    try {
      const res = await axios.get(`${API_URL}/crisis/active`, { params: { propertyId } });
      const activeHazards: Hazard[] = res.data.incidents.map((row: any) => {
        const lat = Number(row.latitude);
        const lng = Number(row.longitude);
        const gCoords = latLngToGodot(lat, lng);
        let hFloor = 1;
        if (row.description.includes('floor 2') || row.description.includes('Floor 2') || row.description.includes('F2') || row.description.includes('R20')) {
          hFloor = 2;
        }
        return {
          x: gCoords.x,
          y: gCoords.y,
          floor: hFloor,
          radius: 5.0,
        };
      });
      setHazards(activeHazards);
      return activeHazards;
    } catch (e) {
      console.warn('Failed to fetch active hazards from backend, routing offline:', e);
      return [];
    }
  };

  // Perform route calculation (checks backend first, falls back to offline matrix)
  const calculateRoute = async (currentHazards?: Hazard[]) => {
    if (!location?.latitude || !location?.longitude || !currentGodotCoords) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const activeHazards = currentHazards || (await fetchHazards());

    try {
      const response = await axios.post(`${API_URL}/navigation/route`, {
        x: currentGodotCoords.x,
        y: currentGodotCoords.y,
        floor: currentFloor,
        propertyId,
      });

      const data = response.data;
      if (data.success) {
        setRoutePath(data.path);
        setInstructions(data.instructions);
        setCurrentStep(0);
        setDistanceRemaining(Math.round(data.distance));
        setOfflineMode(false);
        
        if (data.shelterInPlace) {
          Alert.alert('SHELTER IN PLACE', data.instructions[0]);
          triggerVoice(data.instructions[0]);
        } else if (data.instructions.length > 0) {
          triggerVoice(data.instructions[0]);
        }
      }
    } catch (e) {
      // Offline fallback: Use client-side Dijkstra graph matrix
      console.warn('Backend routing failed, switching to offline dijkstra pathfinding:', e);
      setOfflineMode(true);

      const startNode = await findClosestNodeOffline(currentGodotCoords.x, currentGodotCoords.y, currentFloor);
      if (startNode) {
        const route = await findShortestPathOffline(startNode.id, activeHazards);
        if (route) {
          const { generateVoiceInstructions } = await import('../utils/voiceGuidance');
          const localInstructions = generateVoiceInstructions(route.path);
          setRoutePath(route.path);
          setInstructions(localInstructions);
          setCurrentStep(0);
          setDistanceRemaining(Math.round(route.distance));
          
          if (localInstructions.length > 0) {
            triggerVoice(localInstructions[0]);
          }
        } else {
          const sipMessage = 'ALL EXIT PATHS BLOCKED. Shelter in place immediately, seal the door, and wait for emergency responders.';
          setRoutePath([]);
          setInstructions([sipMessage]);
          setCurrentStep(0);
          setDistanceRemaining(0);
          triggerVoice(sipMessage);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Trigger Local Voice Guidance (expo-speech TTS)
  const triggerVoice = (text: string) => {
    if (isMuted) return;
    speakGuidance(text);
  };

  // Calculate route on mount / when location changes
  useEffect(() => {
    fetchHazards().then((activeHazards) => {
      calculateRoute(activeHazards);
    });
  }, [propertyId]);

  // Recalculate automatically if user drifts away from path or enters a new node
  useEffect(() => {
    if (!currentGodotCoords || routePath.length === 0 || !location?.latitude || !location?.longitude) return;

    // 1. Check if user arrived at a waypoint node
    const nextNode = routePath[currentStep + 1];
    if (nextNode) {
      const distToNextNode = getDistanceInMeters(
        location.latitude,
        location.longitude,
        godotToLatLng(nextNode.x, nextNode.y).latitude,
        godotToLatLng(nextNode.x, nextNode.y).longitude
      );

      if (distToNextNode <= 3.5) { // Arrived within 3.5 meters of waypoint
        const newStep = currentStep + 1;
        setCurrentStep(newStep);
        if (instructions[newStep]) {
          triggerVoice(instructions[newStep]);
        }

        // Send navigation status via WebSockets
        if (socket && connected) {
          const isReachedExit = nextNode.type === 'exit';
          socket.emit('evacuation_status_update', {
            userId: user?.id || user?._id,
            name: user?.name || 'Guest',
            status: isReachedExit ? 'reached_exit' : 'at_waypoint',
            currentWaypoint: nextNode.name,
            targetExit: routePath[routePath.length - 1]?.name || 'Exit',
            propertyId,
          });
        }
        return;
      }
    }

    // 2. Check path divergence: Recalculate if user drifts > 8 meters from the path
    const closestNodeOnPath = routePath[currentStep];
    if (closestNodeOnPath) {
      const distToPath = getDistanceInMeters(
        location.latitude,
        location.longitude,
        godotToLatLng(closestNodeOnPath.x, closestNodeOnPath.y).latitude,
        godotToLatLng(closestNodeOnPath.x, closestNodeOnPath.y).longitude
      );

      if (distToPath > 8.0) {
        console.log('User drifted from suggested path, recalculating...');
        calculateRoute();
      }
    }
  }, [location, currentStep, routePath]);

  // Emit initial 'evacuating' status on screen open
  useEffect(() => {
    if (socket && connected && routePath.length > 0) {
      socket.emit('evacuation_status_update', {
        userId: user?.id || user?._id,
        name: user?.name || 'Guest',
        status: 'evacuating',
        currentWaypoint: routePath[currentStep]?.name || 'Room',
        targetExit: routePath[routePath.length - 1]?.name || 'Exit',
        propertyId,
      });
    }

    return () => {
      stopSpeech();
    };
  }, [routePath]);

  // Map route nodes to Leaflet-compatible LatLng coordinates for rendering the polyline
  const polylineCoordinates = useMemo(() => {
    return routePath.map((n) => {
      const latlng = godotToLatLng(n.x, n.y);
      return { latitude: latlng.latitude, longitude: latlng.longitude };
    });
  }, [routePath]);

  const mapCenter = useMemo(() => {
    if (location?.latitude && location?.longitude) {
      return { latitude: location.latitude, longitude: location.longitude };
    }
    return { latitude: 40.7128, longitude: -74.0060 };
  }, [location]);

  return (
    <SafeAreaView style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Calculating safest path...</Text>
        </View>
      )}

      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          ...mapCenter,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        }}
        showsUserLocation
        followsUserLocation
        zoomEnabled={true}
        scrollEnabled={true}
        pitchEnabled={true}
        rotateEnabled={true}
      >
        {/* Render Hazards */}
        {hazards.filter(h => h.floor === currentFloor).map((h, i) => {
          const latlng = godotToLatLng(h.x, h.y);
          return (
            <Circle
              key={`hazard-${i}`}
              center={{ latitude: latlng.latitude, longitude: latlng.longitude }}
              radius={h.radius}
              fillColor="rgba(239, 68, 68, 0.2)"
              strokeColor="rgba(239, 68, 68, 0.5)"
              strokeWidth={1.5}
            />
          );
        })}

        {/* Render Route Waypoints */}
        {routePath.map((node, i) => {
          const latlng = godotToLatLng(node.x, node.y);
          return (
            <Marker
              key={`node-${node.id}`}
              coordinate={{ latitude: latlng.latitude, longitude: latlng.longitude }}
              title={node.name}
              description={node.type.toUpperCase()}
            >
              <View style={[styles.nodeMarker, node.type === 'exit' ? styles.exitMarker : {}]}>
                <Icon
                  name={node.type === 'exit' ? 'directions-run' : node.type === 'stairwell' ? 'import-export' : 'fiber-manual-record'}
                  size={14}
                  color="#fff"
                />
              </View>
            </Marker>
          );
        })}

        {/* Render Safe Egress Path */}
        {polylineCoordinates.length > 0 && (
          <Polyline
            coordinates={polylineCoordinates}
            strokeColor="#10b981"
            strokeWidth={5}
            lineDashPattern={[5, 10]}
          />
        )}
      </MapView>

      {/* Floating Instructions Panel */}
      <View style={styles.floatingPanel}>
        <View style={styles.panelHeader}>
          <Icon name="navigation" size={24} color="#10b981" />
          <Text style={styles.panelTitle}>INDOOR NAVIGATION</Text>
          {offlineMode && (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineText}>OFFLINE</Text>
            </View>
          )}
        </View>

        <Text style={styles.instructionText}>
          {instructions[currentStep] || 'Evacuating...'}
        </Text>

        <View style={styles.footerRow}>
          <Text style={styles.footerLabel}>
            Distance Remaining: <Text style={styles.footerValue}>{distanceRemaining} meters</Text>
          </Text>

          <View style={styles.controlButtons}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => {
                setIsMuted(!isMuted);
                if (!isMuted) stopSpeech();
                else if (instructions[currentStep]) triggerVoice(instructions[currentStep]);
              }}
            >
              <Icon name={isMuted ? 'volume-off' : 'volume-up'} size={20} color="#5f6368" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.circleBtn} onPress={() => calculateRoute()}>
              <Icon name="refresh" size={20} color="#5f6368" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f9',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.85)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  floatingPanel: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  offlineBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  offlineText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
  instructionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    lineHeight: 22,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  footerLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  footerValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  controlButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitMarker: {
    backgroundColor: '#10b981',
  },
});
