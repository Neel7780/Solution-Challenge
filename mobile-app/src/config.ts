const backendHost = process.env.EXPO_PUBLIC_BACKEND_HOST || '10.200.13.84';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${backendHost}:3001/api`;
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || `http://${backendHost}:3001`;