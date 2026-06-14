import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { navigationRef } from '../navigation/navigationRef';

export default function AlarmOverlay() {
  const { user } = useAuth();
  const { alarmActive, alarmTitle, alarmMessage, silenceAlarm, activeIncident } = useSocket();
  const [pulse] = useState(new Animated.Value(0));

  // Pulse animation for warning colors
  useEffect(() => {
    if (alarmActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 800,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      pulse.setValue(0);
    }
  }, [alarmActive]);

  if (!alarmActive) return null;

  const isResponder = ['security', 'responder', 'admin', 'staff', 'org_admin', 'super_admin'].includes(user?.role || '');

  const backgroundColor = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(15, 23, 42, 0.98)', 'rgba(185, 28, 28, 0.98)'], // Flash between Slate and Red
  });

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const handleSilenceAndRedirect = () => {
    // 1. Stop sound and vibration
    silenceAlarm();
    // 2. Redirect to Evacuation Path Navigation screen
    try {
      navigationRef.navigate('Navigation');
    } catch (error) {
      console.warn('Navigation to evacuation map failed:', error);
    }
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        {/* Warning Indicator */}
        <Animated.View style={[styles.iconWrapper, { transform: [{ scale }] }]}>
          <Icon name={isResponder ? "security" : "error-outline"} size={80} color="#fff" />
        </Animated.View>

        {isResponder ? (
          // Responder/Security Role UI View
          <View style={styles.roleContainer}>
            <Text style={styles.title}>{alarmTitle || '🚨 EMERGENCY RESPONDER ALERT 🚨'}</Text>
            
            <View style={styles.tacticalBox}>
              <Text style={styles.tacticalHeader}>TACTICAL INCIDENT DATA</Text>
              
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Type:</Text>
                <Text style={styles.dataValue}>
                  {String(activeIncident?.incident_type || activeIncident?.type || 'EMERGENCY').toUpperCase()}
                </Text>
              </View>
              
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Room / Zone:</Text>
                <Text style={styles.dataValue}>
                  {activeIncident?.zone_name || activeIncident?.location || 'Generic Property Zone'}
                </Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Coordinates:</Text>
                <Text style={styles.dataValue}>
                  {activeIncident?.latitude && activeIncident?.longitude 
                    ? `${Number(activeIncident.latitude).toFixed(5)}, ${Number(activeIncident.longitude).toFixed(5)}` 
                    : 'N/A'}
                </Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Severity:</Text>
                <Text style={[styles.dataValue, { color: '#ef4444', fontWeight: 'bold' }]}>
                  {String(activeIncident?.severity || 'CRITICAL').toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.messageContainer}>
              <Text style={styles.message}>{activeIncident?.description || alarmMessage}</Text>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleSilenceAndRedirect}
              activeOpacity={0.8}
            >
              <Icon name="map" size={24} color="#b91c1c" />
              <Text style={styles.buttonText}>OPEN NAVIGATION MAP</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // General Guest / Staff UI View
          <View style={styles.roleContainer}>
            <Text style={styles.title}>⚠️ SAFETY EVACUATION NOTICE ⚠️</Text>
            
            <View style={styles.messageContainer}>
              <Text style={styles.reassuringMessage}>
                An incident has been reported on the property. Please remain calm. 
                The emergency evacuation system is active. Your location has been shared with emergency responders.
              </Text>
            </View>

            <View style={styles.instructionBox}>
              <Icon name="info-outline" size={20} color="#fef08a" />
              <Text style={styles.instructionText}>
                Please proceed immediately to the nearest safe assembly area by following the green pathfinding line.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleSilenceAndRedirect}
              activeOpacity={0.8}
            >
              <Icon name="directions-run" size={24} color="#b91c1c" />
              <Text style={styles.buttonText}>BEGIN EVACUATION</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.footerNote}>
          Your location is shared with emergency dispatchers.
        </Text>
      </View>
    </Animated.View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },
  content: {
    width: width * 0.90,
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#b91c1c',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  roleContainer: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  tacticalBox: {
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 16,
  },
  tacticalHeader: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fca5a5',
    marginBottom: 10,
    letterSpacing: 1,
    textAlign: 'center',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  dataLabel: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
  dataValue: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  messageContainer: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  message: {
    fontSize: 14,
    color: '#f1f5f9',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  reassuringMessage: {
    fontSize: 14,
    color: '#f1f5f9',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '600',
  },
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    marginBottom: 20,
    gap: 8,
  },
  instructionText: {
    fontSize: 13,
    color: '#fef08a',
    flex: 1,
    lineHeight: 18,
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    gap: 10,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#b91c1c',
  },
  footerNote: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 18,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
