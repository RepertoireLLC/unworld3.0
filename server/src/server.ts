import express from 'express';
import helmet from 'helmet';
import { createServer } from 'node:http';
import { initializeDatabase } from './database/initialize.js';
import { env } from './config/env.js';
import { authRouter } from './routes/authRoutes.js';
import { messageRouter } from './routes/messageRoutes.js';
import { presenceRouter } from './routes/presenceRoutes.js';
import { systemRouter } from './routes/systemRoutes.js';
import { secureLogger } from './logging/secureLogger.js';
import { RealtimeHub } from './services/realtimeHub.js';

export async function createGhostlineServer() {
  initializeDatabase();

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));
  app.use(helmet());

  app.use('/api/auth', authRouter);
  app.use('/api/messages', messageRouter);
  app.use('/api/presence', presenceRouter);
  app.use('/api/system', systemRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    secureLogger.log({ level: 'error', message: 'Unhandled error', context: { err } });
    res.status(500).json({ error: 'internal_error' });
  });

  const server = createServer(app);
  const hub = new RealtimeHub(server);
  await hub.start();

  server.listen(env.PORT, env.HOST, async () => {
    await secureLogger.log({ level: 'info', message: 'Ghostline server listening', context: { port: env.PORT } });
  });

  return { app, server, hub };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  createGhostlineServer().catch(async (error) => {
    await secureLogger.log({ level: 'error', message: 'Failed to boot Ghostline server', context: { error } });
    process.exit(1);
  });
}
