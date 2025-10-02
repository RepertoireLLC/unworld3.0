import { Router } from 'express';
import { DataStore } from '../data/store';
import { createAuthMiddleware } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';

function randomColor() {
  return `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0')}`;
}

export function createAuthRouter(store: DataStore) {
  const router = Router();
  const authMiddleware = createAuthMiddleware(store);

  router.post('/register', (req, res) => {
    const { email, password, name, color } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    if (store.getUserByEmail(email)) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const displayName = (name && String(name).trim()) || String(email).split('@')[0];
    const chosenColor = (color && String(color)) || randomColor();

    const user = store.createUser({
      email: String(email),
      password: String(password),
      name: displayName,
      color: chosenColor,
    });

    const token = store.createSession(user.id);

    return res.status(201).json({ token, user });
  });

  router.post('/login', (req, res) => {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const userRecord = store.getUserByEmail(String(email));

    if (!userRecord || userRecord.password !== String(password)) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = store.createSession(userRecord.id);
    const { password: _password, ...user } = userRecord;
    void _password;

    return res.json({ token, user });
  });

  router.get('/session', authMiddleware, (req, res) => {
    const { user } = req as AuthenticatedRequest;
    return res.json({ user });
  });

  router.post('/logout', authMiddleware, (req, res) => {
    const { token } = req as AuthenticatedRequest;
    store.deleteSession(token);
    return res.status(204).send();
  });

  return router;
}
