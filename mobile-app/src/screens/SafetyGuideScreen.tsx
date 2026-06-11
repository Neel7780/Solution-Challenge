import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';

const GUIDES = [
  {
    id: '1',
    title: 'Fire Emergency',
    icon: 'whatshot',
    color: '#d32f2f',
    steps: [
      'Locate the nearest exit immediately.',
      'Stay low to the floor to avoid smoke.',
      'Touch doors with the back of your hand before opening.',
      'If your clothes catch fire: Stop, Drop, and Roll.',
      'Never use elevators during a fire.',
    ],
  },
  {
    id: '2',
    title: 'Medical Emergency',
    icon: 'local-hospital',
    color: '#388e3c',
    steps: [
      'Call internal security or 911 immediately.',
      'Do not move the person unless they are in immediate danger.',
      'Check for breathing and pulse.',
      'Stay with the person until help arrives.',
      'Clear the area to allow responders access.',
    ],
  },
  {
    id: '3',
    title: 'Security Threat',
    icon: 'security',
    color: '#1976d2',
    steps: [
      'RUN: Evacuate if there is a safe path.',
      'HIDE: If evacuation is not possible, find a secure room.',
      'Lock and barricade doors, turn off lights, and stay silent.',
      'FIGHT: As a last resort, act with physical aggression.',
      'Silence your phone and wait for "All Clear" from staff.',
    ],
  },
  {
    id: '4',
    title: 'Earthquake',
    icon: 'terrain',
    color: '#795548',
    steps: [
      'DROP to your hands and knees.',
      'COVER your head and neck with your arms.',
      'HOLD ON to your shelter until shaking stops.',
      'Stay away from glass, windows, and heavy furniture.',
      'Do not run outside until the shaking has stopped.',
    ],
  },
];

export default function SafetyGuideScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Safety Protocols</Text>
        <Text style={styles.subtitle}>Essential guides for your protection</Text>
      </View>

      {GUIDES.map((guide) => (
        <View key={guide.id} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: guide.color }]}>
              <Icon name={guide.icon as any} size={24} color="#fff" />
            </View>
            <Text style={[styles.sectionTitle, { color: guide.color }]}>
              {guide.title}
            </Text>
          </View>
          
          <View style={styles.stepsContainer}>
            {guide.steps.map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Always follow the instructions of building security and emergency personnel.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  stepsContainer: {
    paddingLeft: 4,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  footer: {
    padding: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
