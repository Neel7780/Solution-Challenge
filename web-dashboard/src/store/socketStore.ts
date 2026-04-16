import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';

interface SocketState {
  socket: Socket | null;
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
  joinProperty: (propertyId: number) => void;
  joinRole: (role: string) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  connected: false,

  connect: () => {
    const token = localStorage.getItem('token');
    const socket = io(SOCKET_URL, {
      auth: { token },
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      set({ connected: true });

      // Join default rooms
      socket.emit('join_property', 1);
      socket.emit('join_role', 'admin');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      set({ connected: false });
    });

    socket.on('crisis_reported', (data) => {
      console.log('Crisis reported:', data);
      // Could trigger a notification here
    });

    socket.on('user_checkin', (data) => {
      console.log('User checked in:', data);
      // Could trigger a notification here
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, connected: false });
    }
  },

  joinProperty: (propertyId: number) => {
    const { socket } = get();
    if (socket) {
      socket.emit('join_property', propertyId);
    }
  },

  joinRole: (role: string) => {
    const { socket } = get();
    if (socket) {
      socket.emit('join_role', role);
    }
  },
}));
