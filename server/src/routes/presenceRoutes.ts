import { Router } from 'express';
import { z } from 'zod';
import { recordPresence, presenceManager } from '../presence/presenceService.js';

const heartbeatSchema = z.object({
  userId: z.string(),
  status: z.enum(['online', 'offline', 'aether']),
  signature: z.string()
});

export const presenceRouter = Router();

presenceRouter.post('/heartbeat', (req, res) => {
  const parse = heartbeatSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const statuses = recordPresence(parse.data.userId, parse.data.status, parse.data.signature);
  res.json({ statuses });
});

presenceRouter.get('/', (_req, res) => {
  res.json({ statuses: presenceManager.getActiveStatuses() });
});
