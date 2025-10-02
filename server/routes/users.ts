import { Router } from 'express';
import { DataStore } from '../data/store';
import type { AuthenticatedRequest } from '../types';

export function createUsersRouter(store: DataStore) {
  const router = Router();

  router.get('/', (_req, res) => {
    return res.json(store.getPublicUsers());
  });

  router.get('/:id', (req, res) => {
    const user = store.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const { password: _password, ...publicUser } = user;
    void _password;
    return res.json(publicUser);
  });

  router.patch('/:id', (req, res) => {
    const { user } = req as AuthenticatedRequest;
    const { id } = req.params;

    if (user.id !== id) {
      return res.status(403).json({ message: 'You can only update your own profile' });
    }

    const allowedFields = ['name', 'color', 'bio', 'profilePicture'] as const;
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in (req.body ?? {})) {
        updates[field] = req.body[field];
      }
    }

    const updated = store.updateUser(id, updates);

    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(updated);
  });

  return router;
}
