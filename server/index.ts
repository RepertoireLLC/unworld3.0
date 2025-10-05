import http from 'node:http';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import { runtimeConfig } from './config/env';
import { layerRouter } from './layers/layerRoutes';
import { userRouter } from './users/userRoutes';
import { initializeRealtime } from './realtime/socket';
import { layerManager } from './layers/layerManager';
import { userService } from './users/userService';
import { metricsService } from './metrics/metricsService';

const app = express();

app.use(helmet());
app.use(cors({ origin: runtimeConfig.clientOrigin, credentials: true }));
app.use(express.json());
app.use(
  rateLimit({
    windowMs: runtimeConfig.rateLimitWindowMs,
    max: runtimeConfig.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/layers', layerRouter);
app.use('/api/users', userRouter);

app.get('/api/metrics', (_req, res) => {
  const totalUsers = userService.list().length;
  const activeUsers = userService.list().filter((u) => u.status === 'online').length;
  const layerCount = layerManager.list().length;
  res.json({ totalUsers, activeUsers, layerCount });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: runtimeConfig.clientOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

initializeRealtime(io);

metricsService.record({
  totalUsers: userService.list().length,
  activeUsers: userService.list().filter((u) => u.status === 'online').length,
  layerCount: layerManager.list().length,
});

layerManager.refreshUserCounts(userService.list());

if (process.env.NODE_ENV !== 'test') {
  server.listen(runtimeConfig.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Enclypse API running on port ${runtimeConfig.port}`);
  });
}

export default app;
