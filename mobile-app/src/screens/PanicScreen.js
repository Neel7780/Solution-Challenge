import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const API_URL = 'http://YOUR_SERVER_IP:3000/api';

export default function PanicScreen({ navigation }) {
  const [countdown, setCountdown] = useState(3);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const { socket } = useSocket();

  useEffect(() => {
    // Vibrate to alert user
    Vibration.vibrate([500, 500, 500]);

    // Countdown before sending
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          sendPanicAlert();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const sendPanicAlert = async () => {
    if (sending) return;
    setSending(true);

    try {
      // Get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      let location = null;

      if (status === 'granted') {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      }

      // Send panic alert
      await axios.post(`${API_URL}/users/panic`, {
        ...location,
        message: 'Panic button triggered',
      });

      Alert.alert(
        'Alert Sent',
        'Emergency services have been notified. Stay calm and remain in a safe location if possible.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to send alert. Please try calling emergency services directly.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } finally {
      setSending(false);
    }
  };

  const cancelAlert = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.alertContainer}>
        <Text style={styles.title}>🚨 EMERGENCY ALERT 🚨</Text>

        <Text style={styles.countdown}>{countdown}</Text>

        <Text style={styles.description}>
          Sending emergency alert in {countdown} seconds...
        </Text>

        {sending ? (
          <ActivityIndicator size="large" color="#fff" style={styles.spinner} />
        ) : (
          <TouchableOpacity style={styles.cancelButton} onPress={cancelAlert}>
            <Text style={styles.cancelText}>CANCEL ALERT</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.footer}>
          This will alert security and emergency responders to your location.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    backgroundColor: '#d32f2f',
    width: '90%',
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  countdown: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 30,
  },
  cancelButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  cancelText: {
    color: '#d32f2f',
    fontSize: 18,
    fontWeight: 'bold',
  },
  spinner: {
    marginVertical: 20,
  },
  footer: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 20,
  },
});
