import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { visibilityLayers, VisibilityLayer } from '../visibility';

const router = Router();

type RegistryUser = {
  id: string;
  name: string;
  industries: string[];
  skills: string[];
  location?: string;
  visibilityPreferences: Record<string, unknown>;
  visibilityLayers: Record<string, boolean>;
};

type RegistryStore = Record<string, unknown>;

const filterSchema = z.object({
  layer: z.enum(visibilityLayers),
  industry: z.string().optional(),
  search: z.string().optional(),
});

router.post('/', (req, res) => {
  const parsed = filterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { layer, industry, search } = parsed.data;
  const searchTerm = search?.toLowerCase().trim();

  const userRows = db.prepare('SELECT * FROM users').all();
  const users = userRows
    .map<RegistryUser | null>((row) => {
      const layers = JSON.parse(row.visibility_layers ?? '{}') as Record<VisibilityLayer, boolean>;
      const preferences = JSON.parse(row.visibility_preferences ?? '{}');
      const industries = JSON.parse(row.industries ?? '[]');
      const skills = JSON.parse(row.skills ?? '[]');
      if (!preferences?.registryOptIn) return null;
      if (!layers?.[layer]) return null;
      if (industry && !industries.includes(industry)) return null;
      if (searchTerm) {
        const haystack = [row.name, ...(industries ?? []), ...(skills ?? [])]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(searchTerm)) return null;
      }
      return {
        id: row.id,
        name: row.name,
        industries,
        skills,
        location: row.location ?? undefined,
        visibilityPreferences: preferences,
        visibilityLayers: layers,
      };
    })
    .filter((entry): entry is RegistryUser => Boolean(entry));

  const storeRows = db
    .prepare('SELECT payload FROM stores WHERE published = 1 AND visibility = ?')
    .all(layer);

  const stores = storeRows
    .map<RegistryStore | null>((row) => {
      try {
        const payload = JSON.parse(row.payload ?? '{}');
        if (industry && payload.industry !== industry) return null;
        if (searchTerm) {
          const haystack = [payload.name, payload.industry, payload.registrySummary]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(searchTerm)) return null;
        }
        return payload;
      } catch (error) {
        return null;
      }
    })
    .filter((entry): entry is RegistryStore => Boolean(entry));

  return res.json({ users, stores });
});

export const registryRouter = router;
