import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootStackParamList } from './src/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

import { AuthProvider } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { LocationProvider } from './src/context/LocationContext';
import { NotificationProvider } from './src/context/NotificationContext';

import LoginScreen from './src/screens/LoginScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import PanicScreen from './src/screens/PanicScreen';
import ContactsScreen from './src/screens/ContactsScreen';
import SafetyGuideScreen from './src/screens/SafetyGuideScreen';
import IncidentDetailsScreen from './src/screens/IncidentDetailsScreen';
import NavigationScreen from './src/screens/NavigationScreen';
import AlarmOverlay from './src/components/AlarmOverlay';

import { navigationRef } from './src/navigation/navigationRef';
const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  React.useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.screen === 'Navigation') {
        if (navigationRef.isReady()) {
          navigationRef.navigate('Navigation' as never);
        }
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationProvider>
          <SocketProvider>
            <LocationProvider>
              <NavigationContainer ref={navigationRef}>
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
                  name="IncidentDetails" 
                  component={IncidentDetailsScreen as any} 
                  options={{ 
                    headerShown: true, 
                    title: 'Incident Details',
                    headerStyle: { backgroundColor: '#d32f2f' },
                    headerTintColor: '#fff'
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
                <Stack.Screen 
                  name="Navigation" 
                  component={NavigationScreen as any} 
                  options={{ 
                    headerShown: true, 
                    title: 'Evacuation Navigation',
                    headerStyle: { backgroundColor: '#10b981' },
                    headerTintColor: '#fff'
                  }} 
                />
              </Stack.Navigator>
              <StatusBar style="auto" />
              <AlarmOverlay />
            </NavigationContainer>
            </LocationProvider>
          </SocketProvider>
        </NotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
