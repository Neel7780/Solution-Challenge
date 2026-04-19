import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const setAxiosAuthHeader = (token: string | null) => {
  if (token) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete axios.defaults.headers.common.Authorization;
};

export interface UserContext {
  propertyId: number;
  propertyName: string;
  role: string;
  organizationId?: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: 'guest' | 'staff' | 'security' | 'admin' | 'responder' | 'super_admin' | 'org_admin';
  property_id: number;
  organization_id?: number;
  room_number?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAuthChecking: boolean;
  contexts: UserContext[];
  login: (token: string, user: User, contexts?: UserContext[]) => void;
  logout: () => void;
  switchContext: (propertyId: number) => Promise<void>;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  isOrgAdmin: () => boolean;
  isStaff: () => boolean;
  isGuest: () => boolean;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isAuthChecking: true,
  contexts: [],

  login: (token: string, user: User, contexts: UserContext[] = []) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    if (contexts.length > 0) localStorage.setItem('contexts', JSON.stringify(contexts));
    setAxiosAuthHeader(token);
    set({ user, token, contexts, isAuthenticated: true, isAuthChecking: false });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('contexts');
    setAxiosAuthHeader(null);
    set({ user: null, token: null, contexts: [], isAuthenticated: false, isAuthChecking: false });
  },

  switchContext: async (propertyId: number) => {
    try {
      const response = await axios.post(`${API_URL}/users/switch-context`, { propertyId });
      const { token } = response.data;
      
      localStorage.setItem('token', token);
      setAxiosAuthHeader(token);
      
      // Re-fetch profile to get updated context (role, etc.)
      const profileRes = await axios.get(`${API_URL}/users/me`);
      const updatedUser = profileRes.data.user;
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      set({ user: updatedUser, token, isAuthenticated: true });
      
      // Optional: reload page to clear all other stores/states
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch context:', error);
      throw error;
    }
  },

  isAdmin: () => {
    const { user } = get();
    return user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_admin';
  },

  isSuperAdmin: () => {
    const { user } = get();
    return user?.role === 'super_admin';
  },

  isOrgAdmin: () => {
    const { user } = get();
    return user?.role === 'org_admin';
  },

  isStaff: () => {
    const { user } = get();
    return ['admin', 'staff', 'security', 'responder', 'super_admin', 'org_admin'].includes(user?.role || '');
  },

  isGuest: () => {
    const { user } = get();
    return user?.role === 'guest';
  },

  loadFromStorage: async () => {
    set({ isAuthChecking: true });

    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const contextsStr = localStorage.getItem('contexts');

    if (!token || !userStr) {
      setAxiosAuthHeader(null);
      set({ user: null, token: null, isAuthenticated: false, isAuthChecking: false });
      return;
    }

    let parsedUser: User;
    let parsedContexts: UserContext[] = [];
    try {
      parsedUser = JSON.parse(userStr) as User;
      if (contextsStr) parsedContexts = JSON.parse(contextsStr);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('contexts');
      setAxiosAuthHeader(null);
      set({ user: null, token: null, isAuthenticated: false, isAuthChecking: false });
      return;
    }

    setAxiosAuthHeader(token);
    set({ user: parsedUser, token, contexts: parsedContexts, isAuthenticated: false });

    try {
      const response = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const user = response.data.user as User;
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true, isAuthChecking: false });
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('contexts');
      setAxiosAuthHeader(null);
      set({ user: null, token: null, isAuthenticated: false, isAuthChecking: false });
    }
  },
}));
