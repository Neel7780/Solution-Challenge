import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import Icon from 'react-native-vector-icons/MaterialIcons';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  
  // Context selection state
  const [showPropertySelection, setShowPropertySelection] = useState(false);
  const [availableContexts, setAvailableContexts] = useState<any[]>([]);
  
  const { login } = useAuth();

  const handleLogin = async (propertyId?: number) => {
    if (!identifier || !password) {
      Alert.alert('Error', 'Please enter both credentials and password');
      return;
    }

    setLoading(true);
    const result = await login(identifier, password, propertyId);
    setLoading(false);

    if (result.success) {
      if (result.requiresContextSelection) {
        setAvailableContexts(result.contexts || []);
        setShowPropertySelection(true);
      } else {
        navigation.replace('Main');
      }
    } else {
      Alert.alert('Login Failed', result.error || 'An error occurred');
    }
  };

  const renderPropertyItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.propertyItem}
      onPress={() => handleLogin(item.propertyId)}
    >
      <View style={styles.propertyIcon}>
        <Icon name="business" size={24} color="#d32f2f" />
      </View>
      <View style={styles.propertyInfo}>
        <Text style={styles.propertyName}>{item.propertyName}</Text>
        <Text style={styles.propertyRole}>{item.role.toUpperCase()}</Text>
      </View>
      <Icon name="chevron-right" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Crisis Response</Text>
        <Text style={styles.subtitle}>Enterprise Emergency System</Text>
      </View>

      {!showPropertySelection ? (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email or Mobile"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={() => handleLogin()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>Demo: staff@enterprise.com / password</Text>
        </View>
      ) : (
        <View style={styles.selectionContainer}>
          <Text style={styles.selectionTitle}>Select Property</Text>
          <Text style={styles.selectionSubtitle}>
            Your account has access to multiple locations.
          </Text>
          
          <FlatList
            data={availableContexts}
            keyExtractor={(item) => item.propertyId.toString()}
            renderItem={renderPropertyItem}
            contentContainerStyle={styles.propertyList}
          />
          
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setShowPropertySelection(false)}
          >
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  form: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#d32f2f',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  hint: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginTop: 16,
  },
  selectionContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    height: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  selectionSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  propertyList: {
    paddingVertical: 10,
  },
  propertyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  propertyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  propertyRole: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  backButton: {
    marginTop: 20,
    padding: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
  },
});
