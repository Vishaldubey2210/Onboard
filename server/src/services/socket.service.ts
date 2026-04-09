import { Server, Socket } from 'socket.io';
import http from 'http';

let io: Server | null = null;

export function initSocket(server: http.Server) {
  io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.CLIENT_URL
        : ['http://localhost:3000', 'http://localhost:3002'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);
    
    // Clients can join a specific lead room
    socket.on('join_lead', (leadId: string) => {
      socket.join(`lead_${leadId}`);
      console.log(`[Socket] ${socket.id} joined lead_${leadId}`);
    });

    socket.on('leave_lead', (leadId: string) => {
      socket.leave(`lead_${leadId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getSocketIO(): Server {
  if (!io) {
    throw new Error('Socket.io is not initialized');
  }
  return io;
}

// Helper to broadcast lead updates
export function broadcastLeadUpdate(leadId: string, eventName: string, data: any) {
  if (io) {
    // Broadcast to the whole dashboard for global updates
    io.emit('dashboard_update', { leadId, eventName, data });
    // Broadcast to specific lead detail room
    io.to(`lead_${leadId}`).emit(eventName, data);
  }
}
