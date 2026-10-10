import type { Server as SocketIOServer } from 'socket.io';
import logger from '../config/logger';

export async function initSocket(io: SocketIOServer): Promise<void> {
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });
}
