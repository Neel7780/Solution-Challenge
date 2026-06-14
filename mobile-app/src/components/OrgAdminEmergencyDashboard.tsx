import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';

export default function OrgAdminEmergencyDashboard({ activeIncident }: { activeIncident: any }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [triage, setTriage] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const propertyId = user?.property_id || 2;

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [tasksRes, personnelRes, triageRes] = await Promise.all([
        axios.get(`${API_URL}/tasks`),
        axios.get(`${API_URL}/users`),
        axios.get(`${API_URL}/dashboard/triage/${propertyId}`)
      ]);
      setTasks(tasksRes.data.tasks || []);
      setPersonnel(tasksRes.data.users || personnelRes.data.users || []); // Handle different API shapes
      setTriage(triageRes.data.triage || {});
    } catch (e) {
      console.log('Error fetching org admin dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#d32f2f" />
        <Text style={{ color: '#fff', marginTop: 12 }}>Loading Command Center...</Text>
      </View>
    );
  }

  const urgentTasks = tasks.filter((t: any) => t.priority === 'urgent' && t.status !== 'completed');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>EMERGENCY COMMAND CENTER</Text>
        <Text style={styles.subtitle}>ORGANIZATION ADMIN DASHBOARD</Text>
      </View>

      {/* AI Decisions / Logs */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>AI Decisions & Logs</Text>
        <View style={styles.aiBox}>
          <Text style={styles.aiTextBold}>{activeIncident.mass_alert_message}</Text>
          <Text style={styles.aiText}>{activeIncident.description}</Text>
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <View style={styles.chip}><Text style={styles.chipText}>SEVERITY: {activeIncident.severity?.toUpperCase()}</Text></View>
            <View style={[styles.chip, { backgroundColor: 'rgba(239,68,68,0.2)' }]}><Text style={[styles.chipText, { color: '#ef4444' }]}>AUTHORITIES DISPATCHED</Text></View>
          </View>
        </View>
      </View>

      {/* Live Tactical Map */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live Tactical Map (Mappedin)</Text>
        <View style={styles.mapContainer}>
          <WebView 
            source={{ uri: 'https://app.mappedin.com/map/6a2d1e9d8c2010000b751066?embedded=true' }}
            style={{ flex: 1 }}
            javaScriptEnabled={true}
          />
        </View>
      </View>

      {/* CCTV Footage */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live CCTV Feeds</Text>
        <View style={styles.cctvContainer}>
          <View style={styles.cctvFeed}>
             <Text style={styles.cctvText}>CAM 1: MAIN LOBBY</Text>
             <View style={styles.cctvLive}><Text style={styles.cctvLiveText}>LIVE</Text></View>
          </View>
          <View style={styles.cctvFeed}>
             <Text style={styles.cctvText}>CAM 2: NORTH HALL</Text>
             <View style={styles.cctvLive}><Text style={styles.cctvLiveText}>LIVE</Text></View>
          </View>
        </View>
      </View>

      {/* Triage Calls */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Triage Overview</Text>
        <View style={styles.triageGrid}>
          <View style={[styles.triageBox, { borderColor: '#22c55e' }]}>
            <Text style={styles.triageVal}>{triage.safe_count || 0}</Text>
            <Text style={styles.triageLabel}>SAFE</Text>
          </View>
          <View style={[styles.triageBox, { borderColor: '#f59e0b' }]}>
            <Text style={[styles.triageVal, { color: '#f59e0b' }]}>{triage.distressed_count || 0}</Text>
            <Text style={styles.triageLabel}>DISTRESSED</Text>
          </View>
          <View style={[styles.triageBox, { borderColor: '#ef4444' }]}>
            <Text style={[styles.triageVal, { color: '#ef4444' }]}>{triage.needs_help_count || 0}</Text>
            <Text style={styles.triageLabel}>NEEDS HELP</Text>
          </View>
          <View style={[styles.triageBox, { borderColor: '#64748b' }]}>
            <Text style={[styles.triageVal, { color: '#64748b' }]}>{(triage.missing_count || 0) + (triage.unchecked || 0)}</Text>
            <Text style={styles.triageLabel}>MISSING</Text>
          </View>
        </View>
      </View>

      {/* Personnel Tasks */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Priority Tasks (Urgent)</Text>
        {urgentTasks.length === 0 ? (
          <Text style={styles.emptyText}>No urgent tasks.</Text>
        ) : (
          urgentTasks.map((t: any, i: number) => (
            <View key={i} style={styles.taskBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.taskAssignee}>{t.assigned_to_name || 'UNASSIGNED'}</Text>
                <Text style={styles.taskUrgent}>URGENT</Text>
              </View>
              <Text style={styles.taskDesc}>{t.description}</Text>
            </View>
          ))
        )}
      </View>

      {/* Personnel & Guests Live Location (Roster) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live Roster</Text>
        {personnel.length === 0 ? (
          <Text style={styles.emptyText}>No personnel found.</Text>
        ) : (
          personnel.slice(0, 10).map((p: any, i: number) => {
             let statusColor = '#10b981';
             let statusText = 'SAFE';
             if (p.role === 'guest') {
               if (p.status === 'inactive') { statusColor = '#666'; statusText = 'CHECKED OUT'; }
               else if (activeIncident) { statusColor = '#f59e0b'; statusText = 'EVACUATING'; }
             } else {
               statusColor = '#3b82f6'; statusText = 'ACTIVE DUTY';
             }
             return (
               <View key={i} style={styles.rosterRow}>
                 <View>
                   <Text style={styles.rosterName}>{p.name}</Text>
                   <Text style={styles.rosterRole}>{p.role.toUpperCase()}</Text>
                 </View>
                 <View style={[styles.statusChip, { backgroundColor: statusColor }]}>
                   <Text style={styles.statusChipText}>{statusText}</Text>
                 </View>
               </View>
             )
          })
        )}
      </View>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    color: '#ef4444',
    fontSize: 20,
    fontWeight: '900',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  card: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  aiBox: {
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  aiTextBold: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  aiText: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
  },
  chip: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  chipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mapContainer: {
    height: 300,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cctvContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cctvFeed: {
    width: '48%',
    height: 120,
    backgroundColor: '#222',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cctvText: {
    color: '#666',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cctvLive: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  cctvLiveText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  triageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  triageBox: {
    width: '48%',
    backgroundColor: '#000',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  triageVal: {
    color: '#22c55e',
    fontSize: 24,
    fontWeight: 'bold',
  },
  triageLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
  },
  taskBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 8,
  },
  taskAssignee: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  taskUrgent: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: 'bold',
  },
  taskDesc: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  emptyText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
  rosterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    paddingVertical: 8,
  },
  rosterName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  rosterRole: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusChipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
