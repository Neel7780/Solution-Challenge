import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { MainTabParamList } from '../types';
import { useAuth } from '../context/AuthContext';

import HomeScreen from '../screens/HomeScreen';
import StatusScreen from '../screens/StatusScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TriageScreen from '../screens/TriageScreen';
import MapScreen from '../screens/MapScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { user } = useAuth();
  const isResponder = user?.role === 'responder' || user?.role === 'security' || user?.role === 'staff' || user?.role === 'admin' || user?.role === 'org_admin' || user?.role === 'super_admin';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home';

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Status') {
            iconName = 'assessment';
          } else if (route.name === 'Triage') {
            iconName = 'list-alt';
          } else if (route.name === 'Map') {
            iconName = 'map';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#d32f2f',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
        headerStyle: {
          backgroundColor: '#d32f2f',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      {!isResponder ? (
        <>
          <Tab.Screen
            name="Home"
            component={HomeScreen as any}
            options={{ title: 'Crisis Response' }}
          />
          <Tab.Screen
            name="Status"
            component={StatusScreen as any}
            options={{ title: 'Status' }}
          />
        </>
      ) : (
        <>
          <Tab.Screen
            name="Triage"
            component={TriageScreen as any}
            options={{ title: 'Incident Triage' }}
          />
          <Tab.Screen
            name="Map"
            component={MapScreen as any}
            options={{ title: 'Live Map' }}
          />
        </>
      )}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen as any}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}
