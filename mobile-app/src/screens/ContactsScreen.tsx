import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const CONTACTS = [
  {
    id: '1',
    name: 'Emergency Services',
    number: '911',
    type: 'External',
    icon: 'local-police',
    color: '#d32f2f',
  },
  {
    id: '2',
    name: 'Security Desk',
    number: '+15550199',
    type: 'Internal',
    icon: 'security',
    color: '#1976d2',
  },
  {
    id: '3',
    name: 'Medical Office',
    number: '+15550188',
    type: 'Internal',
    icon: 'local-hospital',
    color: '#388e3c',
  },
  {
    id: '4',
    name: 'Front Desk',
    number: '+15550100',
    type: 'Internal',
    icon: 'room-service',
    color: '#f57c00',
  },
  {
    id: '5',
    name: 'Maintenance',
    number: '+15550155',
    type: 'Internal',
    icon: 'build',
    color: '#7b1fa2',
  },
];

export default function ContactsScreen() {
  const handleCall = (number: string) => {
    let url = `tel:${number}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (!supported) {
          console.log("Can't handle tel url");
        } else {
          return Linking.openURL(url);
        }
      })
      .catch((err) => console.error('An error occurred', err));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Emergency Contacts</Text>
        <Text style={styles.subtitle}>Tap to call immediately</Text>
      </View>

      <View style={styles.list}>
        {CONTACTS.map((contact) => (
          <TouchableOpacity
            key={contact.id}
            style={styles.card}
            onPress={() => handleCall(contact.number)}
          >
            <View style={[styles.iconContainer, { backgroundColor: contact.color }]}>
              <Icon name={contact.icon} size={28} color="#fff" />
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{contact.name}</Text>
              <Text style={styles.number}>{contact.number}</Text>
              <Text style={styles.type}>{contact.type}</Text>
            </View>
            <Icon name="phone" size={24} color="#666" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.notice}>
        <Icon name="info-outline" size={20} color="#666" />
        <Text style={styles.noticeText}>
          Internal calls may be faster than 911 for building-specific emergencies.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  list: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  number: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  type: {
    fontSize: 10,
    color: '#999',
    textTransform: 'uppercase',
    marginTop: 2,
    fontWeight: 'bold',
  },
  notice: {
    flexDirection: 'row',
    padding: 24,
    alignItems: 'center',
    opacity: 0.7,
  },
  noticeText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
});
