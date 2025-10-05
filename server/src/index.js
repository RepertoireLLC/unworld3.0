import { createServer } from 'node:http';
import { createHttpRouter } from './httpRouter.js';
import { createWebSocketGateway } from './websocketGateway.js';
import './db.js';

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? '0.0.0.0';

const gateway = createWebSocketGateway();
const router = createHttpRouter({ gateway });

const server = createServer((req, res) => {
  router(req, res);
});

gateway.attach(server);

server.listen(PORT, HOST, () => {
  console.log(`Enclypse backend listening on http://${HOST}:${PORT}`);
});

process.on('SIGINT', () => {
  console.log('Shutting down gracefully');
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM');
  server.close(() => process.exit(0));
});
