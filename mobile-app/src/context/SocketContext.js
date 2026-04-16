import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import * as Notifications from 'expo-notifications';

const SOCKET_URL = 'http://YOUR_SERVER_IP:3000';

const SocketContext = createContext({});

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
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
    newSocket.on('crisis_reported', (data) => {
      showNotification('Crisis Alert', `Emergency: ${data.incident.incident_type}`);
    });

    // Listen for mass notifications
    newSocket.on('mass_notification', (data) => {
      showNotification('Emergency Notice', data.message);
    });

    // Listen for panic alerts
    newSocket.on('panic_triggered', (data) => {
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

  const showNotification = async (title, body) => {
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
