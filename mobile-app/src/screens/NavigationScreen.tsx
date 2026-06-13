import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { useSocket } from '../context/SocketContext';
import { API_URL } from '../config';
import { getDistanceInMeters, godotToLatLng, latLngToGodot, getGeoreferencedLatLng } from '../utils/georef';
import { findClosestNodeOffline, findShortestPathOffline, Hazard } from '../utils/pathfinding';
import { speakGuidance, stopSpeech } from '../utils/voiceGuidance';
import { NavigationNode } from '../types/navigation';
import LeafletMapView, { type LeafletMapCircle, type LeafletMapMarker, type LeafletMapPolyline } from '../components/LeafletMapView';

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
  const [floorPlanDataUrl, setFloorPlanDataUrl] = useState<string | null>(null);
  const lastRecalculateTime = useRef<number>(0);

  const propertyId = user?.property_id || 2;
  const currentFloor = Number(user?.room_number?.startsWith('2') ? 2 : 1);

  // Load floorplan as Base64 to bypass Android WebView file/mixed content restrictions
  useEffect(() => {
    const loadFloorPlan = async () => {
      try {
        const asset = Asset.fromModule(currentFloor === 2 ? require('../../assets/maps/floor2.png') : require('../../assets/maps/floor1.png'));
        await asset.downloadAsync();
        if (asset.uri) {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            setFloorPlanDataUrl(reader.result as string);
          };
          reader.readAsDataURL(blob);
        }
      } catch (err) {
        console.warn('Failed to load floorplan asset:', err);
      }
    };
    loadFloorPlan();
  }, [currentFloor]);

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

  // Socket listener for live navigation updates
  useEffect(() => {
    if (!socket || !connected) return;

    const handleUpdate = () => {
      console.log('Live update received, recalculating route...');
      fetchHazards().then((activeHazards) => {
        calculateRoute(activeHazards);
      });
    };

    socket.on('crisis_reported', handleUpdate);
    socket.on('incident_status_update', handleUpdate);
    socket.on('property_status_update', handleUpdate);

    return () => {
      socket.off('crisis_reported', handleUpdate);
      socket.off('incident_status_update', handleUpdate);
      socket.off('property_status_update', handleUpdate);
    };
  }, [socket, connected]);

  // Recalculate automatically if user drifts away from path or enters a new node
  useEffect(() => {
    if (loading || !currentGodotCoords || routePath.length === 0 || !location?.latitude || !location?.longitude) return;

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

      const now = Date.now();
      if (distToPath > 8.0 && now - lastRecalculateTime.current > 15000) { // 15 seconds cooldown
        lastRecalculateTime.current = now;
        console.log('User drifted from suggested path, recalculating...');
        calculateRoute();
      }
    }
  }, [location, currentStep, routePath, loading]);

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

  const IMAGE_BOUNDS = {
    xMin: -9.0,
    xMax: 5.0,
    yMin: -15.0,
    yMax: 10.0
  };
  const GODOT_MAX_X = 800;
  const GODOT_MAX_Y = 600;

  const godotToSchematic = (x: number, y: number) => {
    const pixelX = ((x - IMAGE_BOUNDS.xMin) / (IMAGE_BOUNDS.xMax - IMAGE_BOUNDS.xMin)) * GODOT_MAX_X;
    const pixelY = (1 - ((y - IMAGE_BOUNDS.yMin) / (IMAGE_BOUNDS.yMax - IMAGE_BOUNDS.yMin))) * GODOT_MAX_Y;
    return { latitude: pixelY, longitude: pixelX };
  };

  // Map route nodes to pixel coordinates for rendering the polyline on floorplan
  const polylineCoordinates = useMemo(() => {
    return routePath.map((n) => {
      return godotToSchematic(n.x, n.y);
    });
  }, [routePath]);

  const mapCenter = useMemo(() => {
    if (location?.latitude && location?.longitude) {
      const gCoords = latLngToGodot(location.latitude, location.longitude);
      return godotToSchematic(gCoords.x, gCoords.y);
    }
    return godotToSchematic(0, 0);
  }, [location]);

  const mapMarkers = useMemo<LeafletMapMarker[]>(() => {
    const markers: LeafletMapMarker[] = [];

    if (location?.latitude && location?.longitude) {
      const gCoords = latLngToGodot(location.latitude, location.longitude);
      const schematicCoords = godotToSchematic(gCoords.x, gCoords.y);
      markers.push({
        id: 'current-location',
        latitude: schematicCoords.latitude,
        longitude: schematicCoords.longitude,
        title: 'You are here',
        description: 'Current GPS location',
        color: '#0f172a',
        label: 'ME',
      });
    }

    routePath.forEach((node) => {
      const schematicCoords = godotToSchematic(node.x, node.y);
      markers.push({
        id: `route-node-${node.id}`,
        latitude: schematicCoords.latitude,
        longitude: schematicCoords.longitude,
        title: node.name,
        description: node.type.toUpperCase(),
        color: node.type === 'exit' ? '#059669' : node.type === 'stairwell' ? '#f59e0b' : '#2563eb',
        label: node.type === 'exit' ? 'EXIT' : node.type === 'stairwell' ? 'ST' : '•',
      });
    });

    return markers;
  }, [location, routePath]);

  const mapCircles = useMemo<LeafletMapCircle[]>(() => {
    return hazards
      .filter((hazard) => hazard.floor === currentFloor)
      .map((hazard, index) => {
        const schematicCoords = godotToSchematic(hazard.x, hazard.y);
        return {
          id: `hazard-${index}`,
          latitude: schematicCoords.latitude,
          longitude: schematicCoords.longitude,
          radius: hazard.radius * 57, // Convert Godot units to pixels
          strokeColor: 'rgba(239, 68, 68, 0.6)',
          fillColor: 'rgba(239, 68, 68, 0.22)',
          fillOpacity: 0.22,
        };
      });
  }, [currentFloor, hazards]);

  const mapPolylines = useMemo<LeafletMapPolyline[]>(() => {
    if (polylineCoordinates.length === 0) return [];
    return [
      {
        id: 'route-path',
        coordinates: polylineCoordinates,
        color: '#10b981',
        weight: 5,
        dashArray: '5,10',
      },
    ];
  }, [polylineCoordinates]);

  const distanceLabel = distanceRemaining > 0 ? `${distanceRemaining}m remaining` : 'Route ready';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06111f" />
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Calculating safest path...</Text>
        </View>
      )}

      <View style={styles.topHud}>
        <View style={styles.topHudText}>
          <Text style={styles.kicker}>Indoor Navigation</Text>
          <Text style={styles.hudTitle}>Turn-by-turn evacuation</Text>
          <Text style={styles.hudSubtitle}>WebView Leaflet route guidance with live hazard overlays.</Text>
        </View>
        <View style={styles.hudPills}>
          <View style={styles.hudPillAccent}>
            <Text style={styles.hudPillLabelLight}>Distance</Text>
            <Text style={styles.hudPillValueLight}>{distanceLabel}</Text>
          </View>
          {offlineMode && (
            <View style={styles.hudPillDanger}>
              <Text style={styles.hudPillLabelDanger}>Fallback</Text>
              <Text style={styles.hudPillValueDanger}>Offline routing</Text>
            </View>
          )}
        </View>
      </View>

      <LeafletMapView
        style={styles.map}
        center={mapCenter}
        zoom={0}
        fitToData
        markers={mapMarkers}
        circles={mapCircles}
        polylines={mapPolylines}
        mode="floorplan"
        floorPlanUrl={floorPlanDataUrl || undefined}
      />

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
  topHud: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    zIndex: 20,
    backgroundColor: 'rgba(6, 17, 31, 0.84)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  topHudText: {
    flex: 1,
  },
  kicker: {
    color: '#34d399',
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
  hudPillAccent: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.26)',
    minWidth: 98,
  },
  hudPillDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.24)',
    minWidth: 98,
  },
  hudPillLabelLight: {
    color: '#bbf7d0',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  hudPillLabelDanger: {
    color: '#fecaca',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  hudPillValueLight: {
    marginTop: 2,
    color: '#ecfdf5',
    fontSize: 12,
    fontWeight: '800',
  },
  hudPillValueDanger: {
    marginTop: 2,
    color: '#fff1f2',
    fontSize: 12,
    fontWeight: '800',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 17, 31, 0.78)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  floatingPanel: {
    position: 'absolute',
    bottom: 18,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.26)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f766e',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  offlineBadge: {
    backgroundColor: '#991b1b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
    marginLeft: 'auto',
  },
  offlineText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
  instructionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
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
    color: '#475569',
  },
  footerValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  controlButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
