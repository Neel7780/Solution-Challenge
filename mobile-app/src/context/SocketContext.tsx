import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import * as Notifications from 'expo-notifications';
import { SOCKET_URL } from '../config';
import { SocketContextType } from '../types';
import { useNotifications } from './NotificationContext';

const SocketContext = createContext<SocketContextType>({} as SocketContextType);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const { token, user } = useAuth();
  const { addNotification } = useNotifications();

  useEffect(() => {
    if (token && user) {
      initSocket();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [token, user]);

  const initSocket = () => {
    const newSocket = io(SOCKET_URL, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);

      // Join property room
      if (user?.property_id) {
        newSocket.emit('join_property', user.property_id);
      }

      // Join role room
      if (user?.role) {
        newSocket.emit('join_role', user.role);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    // Listen for crisis alerts
    newSocket.on('crisis_reported', (data: any) => {
      showNotification('🚨 EMERGENCY ALERT 🚨', `${data.incident.incident_type.toUpperCase()}: ${data.incident.description}`);
      addNotification({
        type: 'crisis',
        title: 'Emergency Alert',
        message: `${data.incident.incident_type.toUpperCase()}: ${data.incident.description}`,
        severity: 'critical'
      });
    });

    // Listen for nearby crisis
    newSocket.on('nearby_crisis', (data: any) => {
      showNotification('⚠️ CRITICAL ALERT ⚠️', data.message);
      addNotification({
        type: 'crisis',
        title: 'Critical Nearby Incident',
        message: data.message,
        severity: 'high'
      });
    });

    // Listen for AI enrichment
    newSocket.on('incident_enriched', (data: any) => {
      if (data.enrichment?.massAlertMessage) {
        showNotification('Emergency Update', data.enrichment.massAlertMessage);
        addNotification({
          type: 'info',
          title: 'Emergency Update',
          message: data.enrichment.massAlertMessage,
          severity: 'medium'
        });
      }
    });

    // Listen for property status updates (e.g. Evacuation Order)
    newSocket.on('property_status_update', (data: any) => {
      if (data.status === 'evacuating') {
        showNotification('🛑 EVACUATION ORDER 🛑', 'IMMEDIATE EVACUATION ORDERED. Proceed to nearest safe exit.');
        addNotification({
          type: 'status',
          title: 'Evacuation Order',
          message: 'IMMEDIATE EVACUATION ORDERED. Proceed to nearest safe exit.',
          severity: 'critical'
        });
      } else if (data.status === 'operational') {
        showNotification('✅ Status Update', 'The property has returned to operational status.');
        addNotification({
          type: 'status',
          title: 'Property Status Update',
          message: 'The property has returned to operational status.',
          severity: 'success'
        });
      }
    });

    // Listen for incident status updates
    newSocket.on('incident_status_update', (data: any) => {
      if (data.status === 'resolved') {
        showNotification('Emergency Resolved', `Incident #${data.incidentId} has been resolved.`);
        addNotification({
          type: 'status',
          title: 'Emergency Resolved',
          message: `Incident #${data.incidentId} has been resolved.`,
          severity: 'success'
        });
      }
    });

    // Listen for mass notifications
    newSocket.on('mass_notification', (data: any) => {
      showNotification('Emergency Notice', data.message);
      addNotification({
        type: 'mass',
        title: 'Emergency Notice',
        message: data.message,
        severity: 'high'
      });
    });

    // Listen for panic alerts
    newSocket.on('panic_triggered', (data: any) => {
      const isResponder = ['security', 'responder', 'admin', 'staff', 'org_admin', 'super_admin'].includes(user?.role || '');
      if (isResponder) {
        showNotification('🆘 PANIC ALERT 🆘', `Panic button triggered by ${data.userName || 'a guest'}`);
        addNotification({
          type: 'panic',
          title: 'Panic Triggered',
          message: `Panic button triggered by ${data.userName || 'a guest'}`,
          severity: 'critical'
        });
      }
    });

    setSocket(newSocket);
  };

  const disconnectSocket = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
    }
  };

  const showNotification = async (title: string, body: string) => {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null
    });
  };

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

export default SocketContext;
