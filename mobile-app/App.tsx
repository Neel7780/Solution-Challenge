import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootStackParamList } from './src/types';

import { AuthProvider } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { LocationProvider } from './src/context/LocationContext';

import LoginScreen from './src/screens/LoginScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import PanicScreen from './src/screens/PanicScreen';
import ContactsScreen from './src/screens/ContactsScreen';
import SafetyGuideScreen from './src/screens/SafetyGuideScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SocketProvider>
          <LocationProvider>
            <NavigationContainer>
              <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Login" component={LoginScreen as any} />
                <Stack.Screen name="Main" component={MainTabNavigator as any} />
                <Stack.Screen
                  name="Panic"
                  component={PanicScreen as any}
                  options={{
                    presentation: 'modal',
                    animationTypeForReplace: 'pop'
                  }}
                />
                <Stack.Screen 
                  name="EmergencyContacts" 
                  component={ContactsScreen as any} 
                  options={{ 
                    headerShown: true, 
                    title: 'Emergency Contacts',
                    headerStyle: { backgroundColor: '#d32f2f' },
                    headerTintColor: '#fff'
                  }} 
                />
                <Stack.Screen 
                  name="SafetyGuide" 
                  component={SafetyGuideScreen as any} 
                  options={{ 
                    headerShown: true, 
                    title: 'Safety Guide',
                    headerStyle: { backgroundColor: '#d32f2f' },
                    headerTintColor: '#fff'
                  }} 
                />
              </Stack.Navigator>
              <StatusBar style="auto" />
            </NavigationContainer>
          </LocationProvider>
        </SocketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
