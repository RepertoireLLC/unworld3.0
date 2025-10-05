import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { visibilityLayers } from '../visibility';

const router = Router();

const visibilitySchema = z.object({
  userId: z.string(),
  layers: z.record(z.boolean()).optional(),
  preferences: z
    .object({
      presence: z.enum(visibilityLayers),
      profile: z.enum(visibilityLayers),
      commerce: z.enum(visibilityLayers),
      registryOptIn: z.boolean(),
    })
    .partial()
    .optional(),
});

router.put('/:id/visibility', (req, res) => {
  const userId = req.params.id;
  const parsed = visibilitySchema.safeParse({ ...req.body, userId });
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!existing) {
    return res.status(404).json({ error: 'User not found' });
  }

  const currentLayers = JSON.parse(existing.visibility_layers ?? '{}');
  const currentPreferences = JSON.parse(existing.visibility_preferences ?? '{}');

  const nextLayers = parsed.data.layers
    ? { ...currentLayers, ...parsed.data.layers }
    : currentLayers;

  const nextPreferences = parsed.data.preferences
    ? { ...currentPreferences, ...parsed.data.preferences }
    : currentPreferences;

  db.prepare(
    'UPDATE users SET visibility_layers = @layers, visibility_preferences = @preferences WHERE id = @id'
  ).run({
    id: userId,
    layers: JSON.stringify(nextLayers),
    preferences: JSON.stringify(nextPreferences),
  });

  return res.json({ message: 'Visibility updated' });
});

export const profileRouter = router;
