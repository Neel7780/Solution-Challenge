import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useNotifications, AppNotification } from '../context/NotificationContext';

export default function AlertsScreen() {
  const { notifications, markAsRead, markAllRead, clearAll } = useNotifications();

  useEffect(() => {
    // Automatically mark all as read when visiting the alerts tab
    markAllRead();
  }, []);

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    Alert.alert(
      'Clear Alert History',
      'Are you sure you want to clear all active alerts and notification history?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', onPress: clearAll, style: 'destructive' }
      ]
    );
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical':
        return { color: '#d32f2f', border: '#d32f2f', bg: '#ffebee' };
      case 'high':
        return { color: '#f57c00', border: '#f57c00', bg: '#fff3e0' };
      case 'medium':
        return { color: '#1976d2', border: '#1976d2', bg: '#e3f2fd' };
      case 'success':
        return { color: '#388e3c', border: '#388e3c', bg: '#e8f5e9' };
      default:
        return { color: '#616161', border: '#9e9e9e', bg: '#f5f5f5' };
    }
  };

  const getIcon = (type: string, severity: string) => {
    if (severity === 'success') return 'check-circle';
    switch (type) {
      case 'crisis':
        return 'warning';
      case 'panic':
        return 'error';
      case 'mass':
        return 'campaign';
      case 'status':
        return 'info';
      default:
        return 'notifications';
    }
  };

  const renderAlertItem = ({ item }: { item: AppNotification }) => {
    const style = getSeverityStyle(item.severity);
    const iconName = getIcon(item.type, item.severity);

    return (
      <View style={[styles.card, { borderLeftColor: style.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: style.bg }]}>
              <Icon name={iconName as any} size={22} color={style.color} />
            </View>
            <Text style={[styles.cardTitle, { color: style.color }]}>
              {item.title}
            </Text>
          </View>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Text style={styles.message}>{item.message}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Panic Reduction / Calm Banner */}
      <View style={styles.calmBanner}>
        <Icon name="verified-user" size={24} color="#1565c0" />
        <View style={styles.calmContent}>
          <Text style={styles.calmTitle}>Stay Calm. Follow Guidance.</Text>
          <Text style={styles.calmSub}>
            First responders and property staff are actively coordinating. Find real-time exit routes on the Evacuation Map.
          </Text>
        </View>
      </View>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Emergency Alerts</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
            <Icon name="delete-sweep" size={24} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="notifications-none" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Active Alerts</Text>
          <Text style={styles.emptySubtext}>Any emergency broadcast notifications will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderAlertItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
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
  calmBanner: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#90caf9',
    alignItems: 'flex-start',
  },
  calmContent: {
    flex: 1,
    marginLeft: 12,
  },
  calmTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1565c0',
    marginBottom: 4,
  },
  calmSub: {
    fontSize: 12,
    color: '#0d47a1',
    lineHeight: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
  emptyState: {
    flex: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});
