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
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { WebView } from 'react-native-webview';
import OrgAdminEmergencyDashboard from '../components/OrgAdminEmergencyDashboard';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const { connected, socket } = useSocket();
  const [activeIncident, setActiveIncident] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [userStatus, setUserStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    
    // Always poll every 2 seconds as requested fallback
    const interval = setInterval(fetchDashboardData, 2000); 

    if (socket) {
      socket.on('crisis_reported', fetchDashboardData);
      socket.on('incident_enriched', fetchDashboardData);
      socket.on('incident_status_update', fetchDashboardData);
    }
    
    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('crisis_reported', fetchDashboardData);
        socket.off('incident_enriched', fetchDashboardData);
        socket.off('incident_status_update', fetchDashboardData);
      }
    };
  }, [socket]);

  const fetchDashboardData = async () => {
    try {
      const propertyId = user?.property_id || 2;
      const incidentsRes = await axios.get(`${API_URL}/crisis/active?propertyId=${propertyId}`);
      if (incidentsRes.data.incidents && incidentsRes.data.incidents.length > 0) {
        const detailsRes = await axios.get(`${API_URL}/crisis/${incidentsRes.data.incidents[0].id}`);
        setActiveIncident(detailsRes.data.incident || null);
      } else {
        setActiveIncident(null);
      }

      // Get stats (only for staff/responders/admins)
      if (user?.property_id && user?.role && user.role !== 'guest') {
        const statsRes = await axios.get(`${API_URL}/dashboard/stats/${user.property_id}`);
        setStats(statsRes.data.stats);
      }
    } catch (error) {
      console.log('Dashboard fetch error:', error);
    } finally {
      if (user?.id) {
        try {
          const status = await AsyncStorage.getItem(`guest_safety_status_${user.id}`);
          setUserStatus(status);
        } catch (e) {
          console.log(e);
        }
      }
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
      if (user?.id) {
        await AsyncStorage.setItem(`guest_safety_status_${user.id}`, status);
        setUserStatus(status);
      }
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

  if (activeIncident && user?.role === 'org_admin') {
    return <OrgAdminEmergencyDashboard activeIncident={activeIncident} />;
  }

  if (activeIncident && userStatus !== 'safe') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>

        <View style={{ padding: 16, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 10, paddingTop: 60 }}>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#ef4444', fontSize: 20, fontWeight: '900' }}>CRITICAL ALERT: {activeIncident.incident_type?.toUpperCase() || 'EMERGENCY'}</Text>
            <View style={{ backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>EVACUATE</Text>
            </View>
          </View>
          <Text style={{ color: '#f8fafc', fontSize: 15, marginTop: 12, fontWeight: '600' }}>
            {activeIncident.mass_alert_message || 'Hazard detected. Evacuate immediately.'}
          </Text>

          {activeIncident.evacuation_routes?.guestEmergencyPlan && (
            <View style={{ marginTop: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <Text style={{ color: '#fca5a5', fontSize: 12, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' }}>AI Evacuation Protocol:</Text>
              {activeIncident.evacuation_routes.guestEmergencyPlan.map((plan: string, i: number) => (
                <Text key={i} style={{ color: '#fff', fontSize: 13, marginBottom: 4 }}>• {plan}</Text>
              ))}
            </View>
          )}
        </View>


        <WebView 
          source={{ uri: 'https://app.mappedin.com/map/6a2d1e9d8c2010000b751066?embedded=true' }}
          style={{ flex: 1, marginTop: 120 }}
          javaScriptEnabled={true}
        />


        <View style={{ padding: 16, paddingBottom: 30, backgroundColor: '#000', zIndex: 10 }}>
          <TouchableOpacity
            style={[styles.checkInButton, styles.safeButton, { marginBottom: 12, paddingVertical: 16, justifyContent: 'center' }]}
            onPress={() => handleCheckIn('safe')}
          >
            <Icon name="check-circle" size={24} color="#fff" />
            <Text style={[styles.checkInText, { fontSize: 16 }]}>I'm Safe (Confirm Evacuation)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.checkInButton, { backgroundColor: '#000', borderWidth: 2, borderColor: '#ef4444', paddingVertical: 16, justifyContent: 'center' }]}
            onPress={() => handleCheckIn('needs_help')}
          >
            <Icon name="warning" size={24} color="#ef4444" />
            <Text style={[styles.checkInText, { fontSize: 16, color: '#ef4444' }]}>I'm Trapped (Dispatch Rescue)</Text>
          </TouchableOpacity>
        </View>
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
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Alerts')}>
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
