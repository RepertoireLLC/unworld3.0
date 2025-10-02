import { Router } from 'express';
import { DataStore } from '../data/store';
import type { AuthenticatedRequest } from '../types';

export function createStoriesRouter(store: DataStore) {
  const router = Router();

  router.get('/', (_req, res) => {
    return res.json(store.getActiveStories());
  });

  router.post('/', (req, res) => {
    const { user } = req as AuthenticatedRequest;
    const { content, image } = req.body ?? {};

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ message: 'Story content is required' });
    }

    if (image && typeof image !== 'string') {
      return res.status(400).json({ message: 'Invalid story image' });
    }

    const story = store.addStory(user.id, content.trim(), image ? String(image) : undefined);
    return res.status(201).json(story);
  });

  router.delete('/:id', (req, res) => {
    const { user } = req as AuthenticatedRequest;
    const success = store.removeStory(req.params.id, user.id);
    if (!success) {
      return res.status(404).json({ message: 'Story not found' });
    }
    return res.status(204).send();
  });

  return router;
}
