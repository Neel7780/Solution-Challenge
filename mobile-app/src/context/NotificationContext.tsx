import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { API_URL } from '../config';

export interface AppNotification {
  id: string;
  type: 'crisis' | 'panic' | 'checkin' | 'mass' | 'status' | 'info';
  title: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'success';
  timestamp: string;
  read: boolean;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({} as NotificationContextType);

type ServerNotificationRow = {
  id: number;
  incident_id?: number | null;
  incident_type?: string | null;
  severity?: string | null;
  title?: string | null;
  message: string;
  status?: string | null;
  channel?: string | null;
  is_read?: boolean | null;
  read_at?: string | null;
  created_at?: string;
};

const normalizeSeverity = (value?: string | null): AppNotification['severity'] => {
  switch ((value || '').toLowerCase()) {
    case 'critical':
      return 'critical';
    case 'high':
      return 'high';
    case 'medium':
      return 'medium';
    case 'low':
      return 'low';
    case 'success':
      return 'success';
    default:
      return 'info';
  }
};

const inferNotificationType = (row: ServerNotificationRow): AppNotification['type'] => {
  if (row.incident_id || row.incident_type) return 'crisis';
  if (row.channel === 'push' && /evacuat|crisis|incident|alarm/i.test(row.message)) return 'mass';
  if (/resolved|contained|operational|status/i.test(row.message)) return 'status';
  return 'info';
};

const mapServerNotification = (row: ServerNotificationRow): AppNotification => ({
  id: `server_${row.id}`,
  type: inferNotificationType(row),
  title: row.title || (row.incident_type ? `${row.incident_type.toUpperCase()} Alert` : 'Emergency Update'),
  message: row.message,
  severity: normalizeSeverity(row.severity || (row.incident_type ? 'critical' : row.status === 'sent' ? 'medium' : null)),
  timestamp: row.created_at || row.read_at || new Date().toISOString(),
  read: Boolean(row.is_read || row.status === 'read'),
});

const mergeNotifications = (local: AppNotification[], remote: AppNotification[]) => {
  const byId = new Map<string, AppNotification>();
  [...remote, ...local].forEach((notif) => {
    byId.set(notif.id, notif);
  });

  return [...byId.values()].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  ).slice(0, 50);
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  const unreadCount = notifications.filter(n => !n.read).length;
  const storageKey = user ? `@notifications_${user.id || user._id}` : null;

  // Load from storage when storageKey changes
  useEffect(() => {
    const loadNotifications = async () => {
      if (!storageKey) {
        setNotifications([]);
        return;
      }
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          setNotifications(JSON.parse(stored));
        } else {
          setNotifications([]);
        }
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    };
    loadNotifications();
  }, [storageKey]);

  // Helper to save notifications
  const saveNotifications = async (updated: AppNotification[]) => {
    if (!storageKey) return;
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save notifications:', err);
    }
  };

  const addNotification = async (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    const updated = [newNotif, ...notifications].slice(0, 50);
    setNotifications(updated);
    await saveNotifications(updated);
  };

  useEffect(() => {
    const loadAndSyncNotifications = async () => {
      if (!storageKey || !user?.property_id) {
        setNotifications([]);
        return;
      }

      try {
        const stored = await AsyncStorage.getItem(storageKey);
        const localNotifications: AppNotification[] = stored ? JSON.parse(stored) : [];
        setNotifications(localNotifications);

        const response = await axios.get(`${API_URL}/notifications/history/${user.property_id}`);
        const serverNotifications = (response.data.notifications || []).map(mapServerNotification);
        const merged = mergeNotifications(localNotifications, serverNotifications);

        setNotifications(merged);
        await saveNotifications(merged);
      } catch (err) {
        console.error('Failed to load or sync notifications:', err);
      }
    };

    loadAndSyncNotifications();
  }, [storageKey, user?.property_id]);

  const markAsRead = async (id: string) => {
    const updated = notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(updated);
    await saveNotifications(updated);
  };

  const markAllRead = async () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    await saveNotifications(updated);
  };

  const clearAll = async () => {
    setNotifications([]);
    if (storageKey) {
      try {
        await AsyncStorage.removeItem(storageKey);
      } catch (err) {
        console.error('Failed to clear notifications:', err);
      }
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllRead,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);

export default NotificationContext;
