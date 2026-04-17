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

interface User {
  id: number;
  name: string;
  email: string;
  role: 'guest' | 'staff' | 'security' | 'admin' | 'responder';
  property_id: number;
  room_number?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAuthChecking: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAdmin: () => boolean;
  isStaff: () => boolean;
  isGuest: () => boolean;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isAuthChecking: true,

  login: (token: string, user: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setAxiosAuthHeader(token);
    set({ user, token, isAuthenticated: true, isAuthChecking: false });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAxiosAuthHeader(null);
    set({ user: null, token: null, isAuthenticated: false, isAuthChecking: false });
  },

  isAdmin: () => {
    const { user } = get();
    return user?.role === 'admin';
  },

  isStaff: () => {
    const { user } = get();
    return ['admin', 'staff', 'security', 'responder'].includes(user?.role || '');
  },

  isGuest: () => {
    const { user } = get();
    return user?.role === 'guest';
  },

  loadFromStorage: async () => {
    set({ isAuthChecking: true });

    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      setAxiosAuthHeader(null);
      set({ user: null, token: null, isAuthenticated: false, isAuthChecking: false });
      return;
    }

    let parsedUser: User;
    try {
      parsedUser = JSON.parse(userStr) as User;
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setAxiosAuthHeader(null);
      set({ user: null, token: null, isAuthenticated: false, isAuthChecking: false });
      return;
    }

    setAxiosAuthHeader(token);
    set({ user: parsedUser, token, isAuthenticated: false });

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
      setAxiosAuthHeader(null);
      set({ user: null, token: null, isAuthenticated: false, isAuthChecking: false });
    }
  },
}));
