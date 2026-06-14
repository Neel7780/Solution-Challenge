import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { Platform, Vibration } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import * as Notifications from 'expo-notifications';
import { useAudioPlayer } from 'expo-audio';
import { SOCKET_URL, API_URL } from '../config';
import { SocketContextType } from '../types';
import { useNotifications } from './NotificationContext';
import axios from 'axios';

const SocketContext = createContext<SocketContextType>({} as SocketContextType);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const { token, user } = useAuth();
  const { addNotification } = useNotifications();

  const [activeIncidents, setActiveIncidents] = useState<any[]>([]);
  const activeIncident = activeIncidents.length > 0 ? activeIncidents[0] : null;

  const [alarmActive, setAlarmActive] = useState<boolean>(false);
  const [alarmTitle, setAlarmTitle] = useState<string>('');
  const [alarmMessage, setAlarmMessage] = useState<string>('');
  const alarmTimeoutRef = useRef<any>(null);

  const player = useAudioPlayer(require('../../assets/alarm.mp3'));

  const fetchActiveIncidents = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/crisis/active`);
      setActiveIncidents(response.data.incidents || []);
    } catch (error) {
      console.error('Error fetching active incidents in SocketContext:', error);
    }
  };

  const startAlarmMedia = async () => {
    // Clear any previous timeout
    if (alarmTimeoutRef.current) {
      clearTimeout(alarmTimeoutRef.current);
      alarmTimeoutRef.current = null;
    }

    try {
      player.loop = true;
      player.play();
    } catch (error) {
      console.warn('Failed to play alarm sound:', error);
    }
    Vibration.vibrate([1000, 500, 1000, 500], true);

    // Auto-silence sound and vibration after 1 minute (60,000ms)
    alarmTimeoutRef.current = setTimeout(() => {
      void stopAlarmMedia();
      alarmTimeoutRef.current = null;
    }, 60000);
  };

  const stopAlarmMedia = async () => {
    if (alarmTimeoutRef.current) {
      clearTimeout(alarmTimeoutRef.current);
      alarmTimeoutRef.current = null;
    }
    try {
      if (player && player.playing) {
        player.pause();
      }
      if (player) {
        player.seekTo(0);
      }
    } catch (error) {
      console.warn('Failed to stop alarm sound:', error);
    }
    Vibration.cancel();
  };

  const silenceAlarm = () => {
    setAlarmActive(false);
    void stopAlarmMedia();
  };

  useEffect(() => {
    return () => {
      void stopAlarmMedia();
    };
  }, []);

  useEffect(() => {
    if (token && user) {
      void fetchActiveIncidents();
      void initSocket();
    } else {
      disconnectSocket();
      setActiveIncidents([]);
    }

    return () => {
      disconnectSocket();
    };
  }, [token, user]);

  const ensureNotificationsReady = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('emergencies', {
          name: 'Emergency Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#d32f2f',
          sound: 'default',
        });
      }

      return finalStatus === 'granted';
    } catch (err) {
      console.warn("Notifications check failed (likely Expo Go SDK 53 restriction):", err);
      return false; // allow fallback gracefully without crashing
    }
  };

  const initSocket = async () => {
    await ensureNotificationsReady();

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

    // Handle new incident ingestion (crisis_reported, new_crisis, new_incident, incident_invoked)
    const handleNewIncident = (data: any) => {
      const incident = data.incident || data;
      if (incident && incident.id) {
        setActiveIncidents((prev) => {
          if (prev.some((item) => item.id === incident.id)) {
            return prev.map((item) => item.id === incident.id ? incident : item);
          }
          return [incident, ...prev];
        });
      }

      const incidentType = incident.incident_type || incident.type || 'EMERGENCY';
      const description = incident.description || 'Please proceed to safety.';
      const message = `${String(incidentType).toUpperCase()}: ${description}`;
      
      showNotification('🚨 EMERGENCY ALERT 🚨', message, { screen: 'Navigation' }).catch(console.warn);
      addNotification({
        type: 'crisis',
        title: 'Emergency Alert',
        message: message,
        severity: 'critical'
      });
      setAlarmTitle(`🚨 EMERGENCY ALARM: ${String(incidentType).toUpperCase()} 🚨`);
      setAlarmMessage(message);
      setAlarmActive(true);
      void startAlarmMedia();
    };

    newSocket.on('crisis_reported', handleNewIncident);
    newSocket.on('new_crisis', handleNewIncident);
    newSocket.on('new_incident', handleNewIncident);
    newSocket.on('incident_invoked', handleNewIncident);

    // Listen for nearby crisis
    newSocket.on('nearby_crisis', (data: any) => {
      const incident = data.incident || data;
      if (incident && incident.id) {
        setActiveIncidents((prev) => {
          if (prev.some((item) => item.id === incident.id)) {
            return prev;
          }
          return [incident, ...prev];
        });
      }
      showNotification('⚠️ CRITICAL ALERT ⚠️', data.message).catch(console.warn);
      addNotification({
        type: 'crisis',
        title: 'Critical Nearby Incident',
        message: data.message,
        severity: 'high'
      });
      setAlarmTitle('⚠️ CRITICAL NEARBY CALAMITY ⚠️');
      setAlarmMessage(data.message);
      setAlarmActive(true);
      void startAlarmMedia();
    });

    // Listen for AI enrichment
    newSocket.on('incident_enriched', (data: any) => {
      const incidentId = data.incidentId || data.incident?.id;
      if (incidentId && data.enrichment) {
        setActiveIncidents((prev) =>
          prev.map((inc) =>
            inc.id === incidentId
              ? { 
                  ...inc, 
                  enrichment: data.enrichment, 
                  mass_alert_message: data.enrichment.massAlertMessage || inc.mass_alert_message,
                  evacuation_routes: data.enrichment.evacuationRoutes || inc.evacuation_routes
                }
              : inc
          )
        );
      }
      if (data.enrichment?.massAlertMessage) {
        showNotification('Emergency Update', data.enrichment.massAlertMessage).catch(console.warn);
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
        showNotification('🛑 EVACUATION ORDER 🛑', 'IMMEDIATE EVACUATION ORDERED. Proceed to nearest safe exit.', { screen: 'Navigation' }).catch(console.warn);
        addNotification({
          type: 'status',
          title: 'Evacuation Order',
          message: 'IMMEDIATE EVACUATION ORDERED. Proceed to nearest safe exit.',
          severity: 'critical'
        });
        setAlarmTitle('🛑 IMMEDIATE EVACUATION ORDERED 🛑');
        setAlarmMessage('Proceed to the nearest safe exit immediately and follow vocal instructions.');
        setAlarmActive(true);
        void startAlarmMedia();
      } else if (data.status === 'operational') {
        showNotification('✅ Status Update', 'The property has returned to operational status.').catch(console.warn);
        addNotification({
          type: 'status',
          title: 'Property Status Update',
          message: 'The property has returned to operational status.',
          severity: 'success'
        });
        silenceAlarm();
        setActiveIncidents([]);
      }
    });

    // Listen for incident status updates
    newSocket.on('incident_status_update', (data: any) => {
      const incidentId = data.incidentId || data.incident?.id;
      if (data.status === 'resolved') {
        setActiveIncidents((prev) => prev.filter((inc) => inc.id !== incidentId));
        showNotification('Emergency Resolved', `Incident #${incidentId} has been resolved.`).catch(console.warn);
        addNotification({
          type: 'status',
          title: 'Emergency Resolved',
          message: `Incident #${incidentId} has been resolved.`,
          severity: 'success'
        });
        silenceAlarm();
      } else {
        setActiveIncidents((prev) =>
          prev.map((inc) => (inc.id === incidentId ? { ...inc, status: data.status } : inc))
        );
      }
    });

    // Listen for mass notifications
    newSocket.on('mass_notification', (data: any) => {
      showNotification('Emergency Notice', data.message).catch(console.warn);
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
        showNotification('🆘 PANIC ALERT 🆘', `Panic button triggered by ${data.userName || 'a guest'}`).catch(console.warn);
        addNotification({
          type: 'panic',
          title: 'Panic Triggered',
          message: `Panic button triggered by ${data.userName || 'a guest'}`,
          severity: 'critical'
        });
        setAlarmTitle('🆘 PANIC ALERT 🆘');
        setAlarmMessage(`Panic button triggered by ${data.userName || 'a guest'}`);
        setAlarmActive(true);
        void startAlarmMedia();
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

  const showNotification = async (title: string, body: string, data?: Record<string, any>) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data,
      },
      trigger: {
        channelId: 'emergencies',
      },
    });
  };

  return (
    <SocketContext.Provider value={{ socket, connected, alarmActive, alarmTitle, alarmMessage, silenceAlarm, activeIncidents, activeIncident, fetchActiveIncidents }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

export default SocketContext;
