import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';

interface ProfileItemProps {
  icon: string;
  label: string;
  value?: string;
  editable: boolean;
  onChange?: (val: string) => void;
  isEditing?: boolean;
}

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const [editing, setEditing] = useState<boolean>(false);
  const [name, setName] = useState<string>(user?.name || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [loading, setLoading] = useState<boolean>(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' },
      ]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    const result = await updateProfile({ name, phone });
    setLoading(false);

    if (result.success) {
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } else {
      Alert.alert('Error', result.error || 'Failed to update profile');
    }
  };

  const ProfileItem = ({ icon, label, value, editable, onChange, isEditing }: ProfileItemProps) => (
    <View style={styles.profileItem}>
      <Icon name={icon} size={24} color="#666" />
      <View style={styles.profileItemContent}>
        <Text style={styles.profileLabel}>{label}</Text>
        {isEditing && editable ? (
          <TextInput
            style={styles.profileInput}
            value={value}
            onChangeText={onChange}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        ) : (
          <Text style={styles.profileValue}>{value || 'Not set'}</Text>
        )}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || '?'}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.role}>{user?.role?.toUpperCase()}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          {!editing ? (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActions}>
              <TouchableOpacity onPress={handleSave} disabled={loading}>
                <Text style={styles.saveButton}>{loading ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditing(false)}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <ProfileItem
          icon="person"
          label="Full Name"
          value={name}
          editable={true}
          onChange={setName}
          isEditing={editing}
        />
        <ProfileItem
          icon="phone"
          label="Phone"
          value={phone}
          editable={true}
          onChange={setPhone}
          isEditing={editing}
        />
        <ProfileItem
          icon="email"
          label="Email"
          value={user?.email}
          editable={false}
        />
        <ProfileItem
          icon="meeting-room"
          label="Room Number"
          value={user?.room_number}
          editable={false}
        />
        <ProfileItem
          icon="business"
          label="Property ID"
          value={`#${user?.property_id}`}
          editable={false}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Settings</Text>

        <TouchableOpacity style={styles.menuItem}>
          <Icon name="notifications" size={24} color="#666" />
          <Text style={styles.menuText}>Notifications</Text>
          <Icon name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Icon name="security" size={24} color="#666" />
          <Text style={styles.menuText}>Privacy & Security</Text>
          <Icon name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Icon name="help" size={24} color="#666" />
          <Text style={styles.menuText}>Help & Support</Text>
          <Icon name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="exit-to-app" size={24} color="#d32f2f" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Version 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  role: {
    fontSize: 12,
    color: '#1976d2',
    marginTop: 4,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  editButton: {
    color: '#1976d2',
    fontWeight: '500',
  },
  editActions: {
    flexDirection: 'row',
  },
  saveButton: {
    color: '#4caf50',
    fontWeight: '500',
    marginRight: 16,
  },
  cancelButton: {
    color: '#666',
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileItemContent: {
    flex: 1,
    marginLeft: 16,
  },
  profileLabel: {
    fontSize: 12,
    color: '#999',
  },
  profileValue: {
    fontSize: 16,
    color: '#333',
    marginTop: 2,
  },
  profileInput: {
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1976d2',
    paddingVertical: 4,
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 16,
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginLeft: 8,
  },
  version: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginVertical: 24,
  },
});
