import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as Location from 'expo-location';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { API_URL } from '../config';
import { LocationContextType, LocationData } from '../types';

const LOCATION_UPDATE_INTERVAL = 30000; // 30 seconds

const LocationContext = createContext<LocationContextType>({} as LocationContextType);

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider = ({ children }: LocationProviderProps) => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tracking, setTracking] = useState<boolean>(false);
  const { user } = useAuth();
  const { socket } = useSocket();

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const startTracking = async () => {
      if (!user) return;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      setTracking(true);

      // Watch position
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: LOCATION_UPDATE_INTERVAL,
          distanceInterval: 10,
        },
        handleLocationUpdate
      );
    };

    startTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [user]);

  const handleLocationUpdate = async (newLocation: Location.LocationObject) => {
    const { latitude, longitude, accuracy } = newLocation.coords;
    const locationData: LocationData = {
      latitude,
      longitude,
      accuracy,
      timestamp: new Date().toISOString(),
    };

    setLocation(locationData);

    // Send via socket if connected
    if (socket?.connected && user) {
      socket.emit('location_update', {
        userId: user.id || user._id,
        ...locationData,
      });
    }

    // Also send via HTTP as backup
    try {
      await axios.post(`${API_URL}/users/location`, locationData);
    } catch (error) {
      console.log('Location update failed:', error);
    }
  };

  const getCurrentLocation = async (): Promise<{ success: boolean; coords?: { latitude: number; longitude: number }; error?: string }> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return { success: false, error: 'Permission denied' };
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        success: true,
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  return (
    <LocationContext.Provider
      value={{
        location,
        errorMsg,
        tracking,
        getCurrentLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);

export default LocationContext;
