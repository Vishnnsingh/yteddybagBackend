import type { Server as SocketIOServer } from 'socket.io';
import logger from '../config/logger';

let ioInstance: SocketIOServer | null = null;

export async function initSocket(io: SocketIOServer): Promise<void> {
  ioInstance = io;

  io.on('connection', (socket) => {
    logger.info(`[Socket.io] Client connected: ${socket.id}`);

    // Join room if client requests (e.g. user-specific room)
    socket.on('join_room', (room: string) => {
      socket.join(room);
      logger.info(`[Socket.io] Client ${socket.id} joined room: ${room}`);
    });

    socket.on('disconnect', () => {
      logger.info(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });
}

export function getIO(): SocketIOServer | null {
  return ioInstance;
}

/**
 * Emit product creation, update or deletion event to all connected clients
 * Includes productId, updated_at metadata and sanitized public product fields
 */
export function emitProductEvent(event: 'product:created' | 'product:updated' | 'product:deleted', data: any): void {
  if (ioInstance) {
    const payload =
      event === 'product:deleted'
        ? {
            id: typeof data === 'string' ? data : data?.id,
            productId: typeof data === 'string' ? data : data?.id,
            updated_at: new Date().toISOString(),
          }
        : {
            ...data,
            productId: data?.id,
            updated_at: data?.updated_at || new Date().toISOString(),
          };

    ioInstance.emit(event, payload);
    logger.info(`[Socket.io] Broadcasted "${event}" for product: ${payload.productId || 'N/A'}`);
  }
}

/**
 * Emit wishlist event (targeted to user room if userId present, otherwise broadcast)
 */
export function emitWishlistEvent(event: string, data: any): void {
  if (ioInstance) {
    if (data?.userId) {
      ioInstance.to(`user_${data.userId}`).emit(event, data);
      logger.info(`[Socket.io] Emitted "${event}" to room: user_${data.userId}`);
    } else {
      ioInstance.emit(event, data);
      logger.info(`[Socket.io] Broadcasted "${event}"`);
    }
  }
}
