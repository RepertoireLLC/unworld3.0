import { Router } from 'express';
import { DataStore } from '../data/store';
import type { AuthenticatedRequest } from '../types';

export function createChatsRouter(store: DataStore) {
  const router = Router();

  router.get('/:userId', (req, res) => {
    const { user } = req as AuthenticatedRequest;
    const { userId } = req.params;

    if (!store.getUserById(userId)) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(store.getMessagesBetween(user.id, userId));
  });

  router.post('/:userId/messages', (req, res) => {
    const { user } = req as AuthenticatedRequest;
    const { userId } = req.params;
    const { content } = req.body ?? {};

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    if (!store.getUserById(userId)) {
      return res.status(404).json({ message: 'User not found' });
    }

    const message = store.addMessage(user.id, userId, content.trim());
    return res.status(201).json(message);
  });

  return router;
}
