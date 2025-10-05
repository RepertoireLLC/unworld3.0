import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { visibilityLayers } from '../visibility';
import { encryptPayload, decryptPayload } from '../utils/encryption';
import { StorePayload } from '../types';

const router = Router();

const storeSchema = z.object({
  ownerId: z.string(),
  store: z.object({
    id: z.string(),
    ownerId: z.string(),
    name: z.string(),
    description: z.string(),
    industry: z.string(),
    visibility: z.enum(visibilityLayers),
    products: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          description: z.string(),
          price: z.number(),
          currency: z.string(),
          paymentLink: z.string().optional(),
          processor: z.enum(['stripe', 'paypal', 'custom']).optional(),
        })
      )
      .default([]),
    paymentProviders: z.record(z.string().optional()),
    published: z.boolean(),
    registrySummary: z.string().optional(),
    location: z.string().optional(),
    updatedAt: z.string(),
  }),
});

router.post('/', (req, res) => {
  const parsed = storeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { store } = parsed.data;
  const encrypted = encryptPayload(store);
  const payload = store.visibility === 'public' ? JSON.stringify(store) : JSON.stringify({
    id: store.id,
    ownerId: store.ownerId,
    visibility: store.visibility,
    published: store.published,
    industry: store.industry,
    registrySummary: store.registrySummary,
  });

  db.prepare(
    `INSERT INTO stores (id, owner_id, visibility, published, payload, encrypted_payload, updated_at)
     VALUES (@id, @owner_id, @visibility, @published, @payload, @encrypted_payload, @updated_at)
     ON CONFLICT(id) DO UPDATE SET
       visibility = excluded.visibility,
       published = excluded.published,
       payload = excluded.payload,
       encrypted_payload = excluded.encrypted_payload,
       updated_at = excluded.updated_at`
  ).run({
    id: store.id,
    owner_id: store.ownerId,
    visibility: store.visibility,
    published: store.published ? 1 : 0,
    payload,
    encrypted_payload: encrypted,
    updated_at: store.updatedAt,
  });

  return res.json({ message: 'Store synced' });
});

router.get('/:ownerId', (req, res) => {
  const record = db.prepare('SELECT * FROM stores WHERE owner_id = ? LIMIT 1').get(req.params.ownerId);
  if (!record) {
    return res.status(404).json({ error: 'Store not found' });
  }

  try {
    const decrypted = decryptPayload<StorePayload>(record.encrypted_payload);
    return res.json({ store: decrypted });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to decrypt store payload' });
  }
});

export const storeRouter = router;
