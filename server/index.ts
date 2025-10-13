import path from 'node:path';
import { fileURLToPath } from 'node:url';

import compression from 'compression';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';

import type { Request, Response } from 'express';

import { env } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

const loggerFormat = env.isProduction ? 'combined' : 'dev';
app.use(morgan(loggerFormat));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'https:', 'data:'],
        connectSrc: ["'self'", env.apiBaseUrl || "'self'", 'https:', 'wss:'],
        scriptSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (env.corsOrigins.length > 0) {
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );
}

app.use(
  rateLimit({
    windowMs: env.rateLimit.windowMs,
    limit: env.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

const distPath = path.resolve(__dirname, '../dist');
app.use(
  express.static(distPath, {
    index: false,
    maxAge: env.isProduction ? '1y' : 0,
    etag: true,
    lastModified: true,
  }),
);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(env.port, '0.0.0.0', () => {
  console.log(`Server listening on port ${env.port}`);
});
