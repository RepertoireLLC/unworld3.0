import { Router } from 'express';
import { pluginRegistry } from '../plugins/registry.js';

export const systemRouter = Router();

systemRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

systemRouter.get('/plugins', (_req, res) => {
  res.json({ plugins: pluginRegistry.list() });
});
