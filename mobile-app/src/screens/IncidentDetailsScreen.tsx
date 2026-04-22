import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';

type IncidentDetailsScreenRouteProp = RouteProp<RootStackParamList, 'IncidentDetails'>;

interface IncidentDetailsScreenProps {
  route: IncidentDetailsScreenRouteProp;
  navigation: any;
}

export default function IncidentDetailsScreen({ route, navigation }: IncidentDetailsScreenProps) {
  const { incidentId } = route.params;
  const { user } = useAuth();
  const [incident, setIncident] = useState<any>(null);
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);

  useEffect(() => {
    fetchIncidentDetails();
  }, [incidentId]);

  const fetchIncidentDetails = async () => {
    try {
      const response = await axios.get(`${API_URL}/crisis/incidents/${incidentId}/details`);
      setIncident(response.data.incident);
      setCheckIns(response.data.checkIns);
    } catch (error) {
      console.error('Error fetching incident details:', error);
      Alert.alert('Error', 'Failed to load incident details.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (status === 'resolved' && user?.role !== 'org_admin' && user?.role !== 'admin' && user?.role !== 'super_admin') {
        Alert.alert('Access Denied', 'Only administrators can resolve incidents.');
        return;
    }

    setUpdating(true);
    try {
      await axios.put(`${API_URL}/crisis/incidents/${incidentId}/status`, {
        status,
        resolutionReportText: status === 'resolved' ? 'Incident resolved via mobile responder app.' : undefined
      });
      Alert.alert('Success', `Incident status updated to ${status}.`);
      fetchIncidentDetails();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update status.');
    } finally {
      setUpdating(false);
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#d32f2f" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header Info */}
      <View style={[styles.header, { backgroundColor: getSeverityColor(incident.severity) }]}>
        <Text style={styles.headerType}>{incident.incident_type.toUpperCase()}</Text>
        <Text style={styles.headerId}>#{incident.id}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{incident.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{incident.description}</Text>
          <View style={styles.infoRow}>
            <Icon name="access-time" size={18} color="#666" />
            <Text style={styles.infoText}>
              Reported: {new Date(incident.created_at).toLocaleString()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="location-on" size={18} color="#666" />
            <Text style={styles.infoText}>Zone: {incident.zone_name || 'Generic'}</Text>
          </View>
        </View>

        {/* Responder Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Responder Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.acknowledgeButton]}
              onPress={() => handleUpdateStatus('acknowledged')}
              disabled={updating || incident.status !== 'active'}
            >
              <Text style={styles.actionButtonText}>Acknowledge</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.containedButton]}
              onPress={() => handleUpdateStatus('contained')}
              disabled={updating || incident.status === 'contained' || incident.status === 'resolved'}
            >
              <Text style={styles.actionButtonText}>Contained</Text>
            </TouchableOpacity>
          </View>
          
          {(user?.role === 'admin' || user?.role === 'org_admin' || user?.role === 'super_admin') && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.resolveButton]}
              onPress={() => handleUpdateStatus('resolved')}
              disabled={updating || incident.status === 'resolved'}
            >
              <Text style={styles.actionButtonText}>Mark as Resolved</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Check-ins Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Check-ins ({checkIns.length})</Text>
            <TouchableOpacity onPress={fetchIncidentDetails}>
                <Icon name="refresh" size={20} color="#d32f2f" />
            </TouchableOpacity>
          </View>
          
          {checkIns.length === 0 ? (
            <Text style={styles.emptyText}>No check-ins yet.</Text>
          ) : (
            checkIns.map((item, index) => (
              <View key={index} style={styles.checkInItem}>
                <Icon 
                  name={item.status === 'safe' ? 'check-circle' : 'warning'} 
                  size={24} 
                  color={item.status === 'safe' ? '#4caf50' : '#f44336'} 
                />
                <View style={styles.checkInContent}>
                  <Text style={styles.checkInName}>{item.name}</Text>
                  <Text style={styles.checkInSub}>Room: {item.room_number || 'N/A'} • {item.role}</Text>
                </View>
                <Text style={styles.checkInTime}>
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  headerType: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerId: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: '#444',
    lineHeight: 22,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionButton: {
    flex: 0.48,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acknowledgeButton: {
    backgroundColor: '#1976d2',
  },
  containedButton: {
    backgroundColor: '#ff9800',
  },
  resolveButton: {
    backgroundColor: '#388e3c',
    width: '100%',
    paddingVertical: 14,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  checkInItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkInContent: {
    flex: 1,
    marginLeft: 12,
  },
  checkInName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  checkInSub: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  checkInTime: {
    fontSize: 12,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 10,
  },
});
