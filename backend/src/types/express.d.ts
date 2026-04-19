import type { Server as SocketIOServer } from 'socket.io';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        role: string;
        propertyId: number;
        organizationId: number;
      };
      io?: SocketIOServer;
    }
  }
}

export {};