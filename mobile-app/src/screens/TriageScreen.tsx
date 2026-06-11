import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_URL } from '../config';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';

type TriageScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

interface TriageScreenProps {
  navigation: TriageScreenNavigationProp;
}

export default function TriageScreen({ navigation }: TriageScreenProps) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    fetchIncidents();

    if (socket) {
      socket.on('new_crisis', (data: any) => {
        setIncidents((prev) => [data.incident, ...prev]);
      });

      socket.on('incident_status_update', (data: any) => {
        fetchIncidents(); // Refresh to get updated list
      });
    }

    return () => {
      if (socket) {
        socket.off('new_crisis');
        socket.off('incident_status_update');
      }
    };
  }, [socket]);

  const fetchIncidents = async () => {
    try {
      const response = await axios.get(`${API_URL}/crisis/active`);
      setIncidents(response.data.incidents);
    } catch (error) {
      console.error('Error fetching active incidents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchIncidents();
  };

  const getSeverityColor = (severity: string, status?: string) => {
    if (status === 'resolved' || status === 'contained') {
      return '#4caf50';
    }
    switch (severity?.toLowerCase()) {
      case 'critical':
        return '#d32f2f';
      case 'high':
        return '#f44336';
      case 'medium':
        return '#ff9800';
      case 'low':
        return '#4caf50';
      default:
        return '#9e9e9e';
    }
  };

  const renderIncidentItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.incidentCard}
      onPress={() => navigation.navigate('IncidentDetails', { incidentId: item.id })}
    >
      <View style={[styles.severityBar, { backgroundColor: getSeverityColor(item.severity, item.status) }]} />
      <View style={styles.incidentContent}>
        <View style={styles.incidentHeader}>
          <Text style={styles.incidentType}>{item.incident_type.toUpperCase()}</Text>
          <Text style={styles.incidentTime}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Text style={styles.incidentDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.incidentFooter}>
          <View style={styles.locationRow}>
            <Icon name="location-on" size={16} color="#666" />
            <Text style={styles.locationText}>{item.zone_name || 'Generic Location'}</Text>
          </View>
          <View style={[styles.statusBadge, { borderColor: getSeverityColor(item.severity, item.status) }]}>
            <Text style={[styles.statusText, { color: getSeverityColor(item.severity, item.status) }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
      <Icon name="chevron-right" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#d32f2f" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Incident Triage</Text>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>{incidents.length} Active</Text>
        </View>
      </View>

      {incidents.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="check-circle" size={64} color="#4caf50" />
          <Text style={styles.emptyTitle}>All Clear</Text>
          <Text style={styles.emptySubtext}>No active incidents at this property.</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchIncidents}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={incidents}
          renderItem={renderIncidentItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#d32f2f']} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  activeBadge: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: '#d32f2f',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 12,
  },
  incidentCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
    paddingRight: 8,
  },
  severityBar: {
    width: 6,
    height: '100%',
  },
  incidentContent: {
    flex: 1,
    padding: 12,
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  incidentType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  incidentTime: {
    fontSize: 12,
    color: '#999',
  },
  incidentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  incidentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
