import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import * as Notifications from 'expo-notifications';
import { SOCKET_URL } from '../config';
import { SocketContextType } from '../types';

const SocketContext = createContext<SocketContextType>({} as SocketContextType);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const { token, user } = useAuth();

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
      showNotification('Crisis Alert', `Emergency: ${data.incident.incident_type}`);
    });

    // Listen for AI enrichment
    newSocket.on('incident_enriched', (data: any) => {
      if (data.enrichment?.massAlertMessage) {
        showNotification('Emergency Update', data.enrichment.massAlertMessage);
      }
    });

    // Listen for mass notifications
    newSocket.on('mass_notification', (data: any) => {
      showNotification('Emergency Notice', data.message);
    });

    // Listen for panic alerts
    newSocket.on('panic_triggered', (data: any) => {
      if (user?.role === 'security' || user?.role === 'admin') {
        showNotification('Panic Alert', `Panic button triggered by ${data.userName}`);
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
