import { Router } from 'express';
import { z } from 'zod';
import { createUser, getUserProfile } from '../services/userService.js';
import { createSession, revokeSession, validateSession } from '../services/sessionService.js';
import { secureLogger } from '../logging/secureLogger.js';

const registerSchema = z.object({
  displayName: z.string().min(1),
  colorCode: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  archetype: z.string().min(1)
});

const sessionSchema = z.object({
  userId: z.string()
});

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  try {
    const user = await createUser(parse.data);
    await secureLogger.log({ level: 'info', message: 'User registered', context: { userId: user.profile.id } });
    return res.status(201).json(user);
  } catch (error) {
    await secureLogger.log({ level: 'error', message: 'Failed to register user', context: { error } });
    return res.status(500).json({ error: 'registration_failed' });
  }
});

authRouter.post('/session', (req, res) => {
  const parse = sessionSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const profile = getUserProfile(parse.data.userId);
  if (!profile) {
    return res.status(404).json({ error: 'user_not_found' });
  }

  const session = createSession(profile.id);
  res.status(201).json(session);
});

authRouter.delete('/session', (req, res) => {
  const authHeader = req.header('authorization');
  if (!authHeader) {
    return res.status(204).send();
  }

  const token = authHeader.replace('Bearer ', '');
  revokeSession(token);
  res.status(204).send();
});

authRouter.get('/session', (req, res) => {
  const authHeader = req.header('authorization');
  if (!authHeader) {
    return res.status(401).json({ error: 'missing_token' });
  }

  const token = authHeader.replace('Bearer ', '');
  const session = validateSession(token);
  if (!session) {
    return res.status(401).json({ error: 'invalid_session' });
  }

  res.json(session);
});
