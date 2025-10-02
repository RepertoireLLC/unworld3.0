import { Router } from 'express';
import { DataStore } from '../data/store';
import type { AuthenticatedRequest } from '../types';

export function createFriendsRouter(store: DataStore) {
  const router = Router();

  router.get('/requests', (req, res) => {
    const { user } = req as AuthenticatedRequest;
    return res.json(store.getFriendRequestsForUser(user.id));
  });

  router.post('/requests', (req, res) => {
    const { user } = req as AuthenticatedRequest;
    const { toUserId } = req.body ?? {};

    if (!toUserId || typeof toUserId !== 'string') {
      return res.status(400).json({ message: 'A valid recipient is required' });
    }

    if (toUserId === user.id) {
      return res.status(400).json({ message: 'You cannot send a request to yourself' });
    }

    if (!store.getUserById(toUserId)) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    const request = store.addFriendRequest(user.id, toUserId);

    return res.status(201).json(request);
  });

  router.post('/requests/:id/respond', (req, res) => {
    const { user } = req as AuthenticatedRequest;
    const { id } = req.params;
    const { action } = req.body ?? {};

    const request = store.getFriendRequestsForUser(user.id).find((item) => item.id === id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.toUserId !== user.id) {
      return res.status(403).json({ message: 'Only the recipient can respond to a request' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'This request has already been handled' });
    }

    if (action !== 'accept' && action !== 'reject') {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const updated = store.updateFriendRequestStatus(id, action === 'accept' ? 'accepted' : 'rejected');

    return res.json(updated);
  });

  return router;
}
