import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://YOUR_SERVER_IP:3000/api';

export default function StatusScreen() {
  const { user } = useAuth();
  const [activeIncidents, setActiveIncidents] = useState([]);
  const [myCheckIns, setMyCheckIns] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStatusData();
  }, []);

  const fetchStatusData = async () => {
    try {
      // Get active incidents
      const incidentsRes = await axios.get(`${API_URL}/crisis/active`);
      setActiveIncidents(incidentsRes.data.incidents);

      // Get my check-ins (would need endpoint for this)
      // For now, we'll skip this
    } catch (error) {
      console.log('Status fetch error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStatusData();
    setRefreshing(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'safe':
        return { name: 'check-circle', color: '#4caf50' };
      case 'needs_help':
        return { name: 'help', color: '#ff9800' };
      case 'distressed':
        return { name: 'warning', color: '#f44336' };
      default:
        return { name: 'help-outline', color: '#999' };
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return '#d32f2f';
      case 'high':
        return '#f44336';
      case 'medium':
        return '#ff9800';
      default:
        return '#4caf50';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Status Monitor</Text>

      {/* My Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>My Status</Text>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Icon name="person" size={24} color="#666" />
            <Text style={styles.statusLabel}>Name:</Text>
            <Text style={styles.statusValue}>{user?.name}</Text>
          </View>
          <View style={styles.statusRow}>
            <Icon name="meeting-room" size={24} color="#666" />
            <Text style={styles.statusLabel}>Room:</Text>
            <Text style={styles.statusValue}>{user?.room_number || 'N/A'}</Text>
          </View>
          <View style={styles.statusRow}>
            <Icon name="verified-user" size={24} color="#666" />
            <Text style={styles.statusLabel}>Role:</Text>
            <Text style={styles.statusValue}>{user?.role}</Text>
          </View>
        </View>
      </View>

      {/* Active Incidents */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Active Incidents</Text>

        {activeIncidents.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="check-circle" size={48} color="#4caf50" />
            <Text style={styles.emptyText}>No active incidents</Text>
            <Text style={styles.emptySubtext}>All clear at the moment</Text>
          </View>
        ) : (
          activeIncidents.map((incident) => (
            <View key={incident.id} style={styles.incidentCard}>
              <View style={styles.incidentHeader}>
                <View
                  style={[
                    styles.severityBadge,
                    { backgroundColor: getSeverityColor(incident.severity) },
                  ]}
                >
                  <Text style={styles.severityText}>{incident.severity.toUpperCase()}</Text>
                </View>
                <Text style={styles.incidentType}>
                  {incident.incident_type.toUpperCase()}
                </Text>
              </View>

              <Text style={styles.incidentDescription}>{incident.description}</Text>

              <View style={styles.incidentFooter}>
                <Text style={styles.incidentTime}>
                  Reported: {new Date(incident.created_at).toLocaleTimeString()}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Safety Tips */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Safety Tips</Text>
        <View style={styles.tipsCard}>
          <View style={styles.tipItem}>
            <Icon name="location-on" size={20} color="#1976d2" />
            <Text style={styles.tipText}>Know your nearest exits</Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="phone" size={20} color="#1976d2" />
            <Text style={styles.tipText}>Save emergency contacts</Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="meeting-room" size={20} color="#1976d2" />
            <Text style={styles.tipText}>Stay in your room during lockdown</Text>
          </View>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    backgroundColor: '#fff',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  statusCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusLabel: {
    marginLeft: 12,
    color: '#666',
    width: 60,
  },
  statusValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#4caf50',
  },
  emptySubtext: {
    color: '#999',
    marginTop: 4,
  },
  incidentCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  incidentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  severityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  incidentType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  incidentDescription: {
    color: '#666',
    marginBottom: 8,
  },
  incidentFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  },
  incidentTime: {
    fontSize: 12,
    color: '#999',
  },
  tipsCard: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tipText: {
    marginLeft: 12,
    color: '#1976d2',
  },
});
