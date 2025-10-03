import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';
import { secureLogger } from '../logging/secureLogger.js';

interface ClientContext {
  userId: string;
  socket: WebSocket;
}

export class RealtimeHub {
  private clients = new Map<WebSocket, ClientContext>();

  constructor(private server: Server) {}

  async start() {
    const wss = new WebSocketServer({ server: this.server, path: '/realtime' });

    wss.on('connection', async (socket, request) => {
      const userId = new URL(request.url ?? '', 'http://localhost').searchParams.get('userId');
      if (!userId) {
        socket.close(4001, 'missing_user');
        return;
      }

      await secureLogger.log({ level: 'info', message: 'Realtime connection established', context: { userId } });
      this.clients.set(socket, { userId, socket });

      socket.on('message', async (data) => {
        try {
          const parsed = JSON.parse(data.toString()) as { type: string; payload: unknown; targetIds?: string[] };
          if (parsed.type === 'relay') {
            const targets = parsed.targetIds ?? [];
            for (const [_, client] of this.clients) {
              if (targets.length === 0 || targets.includes(client.userId)) {
                client.socket.send(JSON.stringify({
                  type: 'relay',
                  from: userId,
                  payload: parsed.payload
                }));
              }
            }
          }
        } catch (error) {
          await secureLogger.log({ level: 'error', message: 'Failed to process realtime payload', context: { error } });
        }
      });

      socket.on('close', async () => {
        this.clients.delete(socket);
        await secureLogger.log({ level: 'info', message: 'Realtime connection closed', context: { userId } });
      });
    });
  }
}
