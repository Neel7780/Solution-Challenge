import React, { useEffect, useState, useRef } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';

export default function AlarmOverlay() {
  const { alarmActive, alarmTitle, alarmMessage, silenceAlarm } = useSocket();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
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
      navigation.navigate('Navigation');
    } catch (error) {
      console.warn('Navigation to evacuation map failed:', error);
    }
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        {/* Warning Indicator */}
        <Animated.View style={[styles.iconWrapper, { transform: [{ scale }] }]}>
          <Icon name="error-outline" size={80} color="#fff" />
        </Animated.View>

        <Text style={styles.title}>{alarmTitle || 'CRITICAL CALAMITY'}</Text>
        
        <View style={styles.messageContainer}>
          <Text style={styles.message}>{alarmMessage || 'An emergency situation has occurred. Please follow safety procedures.'}</Text>
        </View>

        <View style={styles.instructionBox}>
          <Icon name="info-outline" size={20} color="#fef08a" />
          <Text style={styles.instructionText}>
            Vocal instructions and live pathfinding route are waiting for you.
          </Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleSilenceAndRedirect}
          activeOpacity={0.8}
        >
          <Icon name="volume-off" size={24} color="#b91c1c" />
          <Text style={styles.buttonText}>SILENCE ALARM & VIEW ROUTE</Text>
        </TouchableOpacity>

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
    width: width * 0.88,
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#b91c1c',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 16,
  },
  messageContainer: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
  message: {
    fontSize: 15,
    color: '#f1f5f9',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    marginBottom: 28,
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
    fontWeight: '800',
    color: '#b91c1c',
  },
  footerNote: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 20,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
