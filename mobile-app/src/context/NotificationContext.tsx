import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

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
