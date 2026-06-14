import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_URL } from '../config';
import { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('token');
      const storedUser = await SecureStore.getItemAsync('user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier: string, password: string, propertyId?: number): Promise<{ success: boolean; error?: string; requiresContextSelection?: boolean; contexts?: any[] }> => {
    try {
      const response = await axios.post(`${API_URL}/users/login`, { 
        identifier, 
        password,
        propertyId
      });
      
      if (response.data.requiresContextSelection) {
        return { 
          success: true, 
          requiresContextSelection: true, 
          contexts: response.data.contexts 
        };
      }

      const { token: receivedToken, user: receivedUser } = response.data;

      await SecureStore.setItemAsync('token', receivedToken);
      await SecureStore.setItemAsync('user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);
      axios.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`;

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const logout = async (): Promise<void> => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const updateProfile = async (updates: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await axios.patch(`${API_URL}/users/me`, updates);
      setUser(response.data.user);
      await SecureStore.setItemAsync('user', JSON.stringify(response.data.user));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
