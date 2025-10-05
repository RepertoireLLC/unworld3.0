import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { profileRouter } from './routes/profiles';
import { storeRouter } from './routes/stores';
import { registryRouter } from './routes/registry';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/auth', authRouter);
  app.use('/profiles', profileRouter);
  app.use('/stores', storeRouter);
  app.use('/registry', registryRouter);

  return app;
}
