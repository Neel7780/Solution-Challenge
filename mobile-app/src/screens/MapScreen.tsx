import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { API_URL } from '../config';

export default function MapScreen({ navigation }: any) {
  const { user } = useAuth();
  const { location } = useLocation();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchIncidents();
  }, []);

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

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return '#d32f2f';
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      default: return '#4caf50';
    }
  };

  if (loading || !location) {
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
        // provider={PROVIDER_GOOGLE} // Use default provider for now to avoid setup issues
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {incidents.map((incident) => (
          incident.latitude && incident.longitude && (
            <Marker
              key={incident.id}
              coordinate={{
                latitude: parseFloat(incident.latitude),
                longitude: parseFloat(incident.longitude),
              }}
              pinColor={getSeverityColor(incident.severity)}
            >
              <Callout onPress={() => navigation.navigate('IncidentDetails', { incidentId: incident.id })}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{incident.incident_type.toUpperCase()}</Text>
                  <Text style={styles.calloutDesc}>{incident.description}</Text>
                  <Text style={styles.calloutLink}>Tap for details</Text>
                </View>
              </Callout>
            </Marker>
          )
        ))}
      </MapView>

      <TouchableOpacity style={styles.refreshButton} onPress={fetchIncidents}>
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
});
