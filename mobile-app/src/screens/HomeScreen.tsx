import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import { API_URL } from '../config';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const { connected } = useSocket();
  const [activeIncident, setActiveIncident] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Get active incidents
      const incidentsRes = await axios.get(`${API_URL}/crisis/active`);
      setActiveIncident(incidentsRes.data.incidents[0] || null);

      // Get stats
      if (user?.property_id) {
        const statsRes = await axios.get(`${API_URL}/dashboard/stats/${user.property_id}`);
        setStats(statsRes.data.stats);
      }
    } catch (error) {
      console.log('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const handlePanicPress = () => {
    navigation.navigate('Panic');
  };

  const handleCheckIn = async (status: string) => {
    if (!activeIncident) {
      Alert.alert('No Active Emergency', 'There is currently no active emergency to check in for.');
      return;
    }

    try {
      await axios.post(`${API_URL}/users/checkin`, {
        incidentId: activeIncident.id,
        status,
        message: '',
      });

      Alert.alert('Check-in Successful', `You have been marked as ${status}.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to check in. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#d32f2f" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name || 'User'}</Text>
          <Text style={styles.role}>{user?.role?.toUpperCase()}</Text>
        </View>
        <View style={styles.connectionBadge}>
          <Icon
            name="circle"
            size={12}
            color={connected ? '#4caf50' : '#f44336'}
          />
          <Text style={styles.connectionText}>
            {connected ? 'Live' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* Panic Button */}
      <TouchableOpacity style={styles.panicButton} onPress={handlePanicPress}>
        <Icon name="warning" size={48} color="#fff" />
        <Text style={styles.panicText}>EMERGENCY</Text>
        <Text style={styles.panicSubtext}>Tap for immediate help</Text>
      </TouchableOpacity>

      {/* Active Incident Alert */}
      {activeIncident && (
        <View style={styles.alertBox}>
          <View style={styles.alertHeader}>
            <Icon name="error" size={24} color="#d32f2f" />
            <Text style={styles.alertTitle}>Active Emergency</Text>
          </View>
          <Text style={styles.alertText}>
            {activeIncident.incident_type.toUpperCase()}: {activeIncident.description}
          </Text>
          <View style={styles.checkInButtons}>
            <TouchableOpacity
              style={[styles.checkInButton, styles.safeButton]}
              onPress={() => handleCheckIn('safe')}
            >
              <Icon name="check-circle" size={20} color="#fff" />
              <Text style={styles.checkInText}>I'm Safe</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.checkInButton, styles.helpButton]}
              onPress={() => handleCheckIn('needs_help')}
            >
              <Icon name="help" size={20} color="#fff" />
              <Text style={styles.checkInText}>Need Help</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.mapRouteButton}
            onPress={() => navigation.navigate('Map')}
          >
            <Icon name="directions-run" size={20} color="#fff" />
            <Text style={styles.mapRouteText}>View Evacuation Map & Route</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Status')}>
          <Icon name="check-circle" size={32} color="#4caf50" />
          <Text style={styles.actionText}>Self Check-In</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('EmergencyContacts')}
        >
          <Icon name="phone" size={32} color="#388e3c" />
          <Text style={styles.actionText}>Emergency Contacts</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('SafetyGuide')}
        >
          <Icon name="info" size={32} color="#f57c00" />
          <Text style={styles.actionText}>Safety Guide</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => Alert.alert('Coming Soon', 'In-app messaging will be available in the next update.')}>
          <Icon name="chat" size={32} color="#7b1fa2" />
          <Text style={styles.actionText}>Message Staff</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Status')}>
          <Icon name="notifications" size={32} color="#1976d2" />
          <Text style={styles.actionText}>Active Alerts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Map')}>
          <Icon name="map" size={32} color="#d32f2f" />
          <Text style={styles.actionText}>Exit Routes</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      <View style={styles.activityCard}>
        <Text style={styles.activityText}>
          {activeIncident
            ? `Last incident: ${activeIncident.incident_type} - ${new Date(activeIncident.created_at).toLocaleString()}`
            : 'No recent incidents'}
        </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  role: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  connectionText: {
    fontSize: 12,
    marginLeft: 6,
    color: '#666',
  },
  panicButton: {
    backgroundColor: '#d32f2f',
    margin: 16,
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  panicText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  panicSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  alertBox: {
    backgroundColor: '#ffebee',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginLeft: 8,
  },
  alertText: {
    color: '#333',
    marginBottom: 12,
  },
  checkInButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 0.48,
    justifyContent: 'center',
  },
  safeButton: {
    backgroundColor: '#4caf50',
  },
  helpButton: {
    backgroundColor: '#ff9800',
  },
  checkInText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  actionCard: {
    width: '46%',
    backgroundColor: '#fff',
    margin: '2%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityText: {
    color: '#666',
  },
  mapRouteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d32f2f',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 12,
  },
  mapRouteText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
});
