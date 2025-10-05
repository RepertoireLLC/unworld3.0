import type { Server } from 'socket.io';
import { layerManager } from '../layers/layerManager';
import { userService } from '../users/userService';
import { layerService } from '../layers/layerService';

export const initializeRealtime = (io: Server) => {
  io.on('connection', (socket) => {
    socket.emit('layers:init', layerManager.list());

    socket.on('layer:toggle', ({ layerId, visible, actorId }) => {
      try {
        const layer = layerService.updateLayer(layerId, {
          visible,
          updatedAt: new Date().toISOString(),
          createdBy: actorId ?? 'socket',
        });
        io.emit('layer:updated', layer);
      } catch (error) {
        socket.emit('layer:error', { message: (error as Error).message });
      }
    });

    socket.on('layer:created', (layer) => {
      io.emit('layer:created', layer);
    });

    socket.on('layer:deleted', ({ layerId }) => {
      try {
        layerManager.removeLayer(layerId);
        io.emit('layer:deleted', { layerId });
      } catch (error) {
        socket.emit('layer:error', { message: (error as Error).message });
      }
    });

    socket.on('user:presence', ({ userId, status }) => {
      const updated = userService.togglePresence(userId, status);
      if (updated) {
        io.emit('user:presence', { userId: updated.hashedId, status: updated.status });
      }
    });
  });
};
