import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db';
import { visibilityLayers } from '../visibility';
import { UserRecord } from '../types';

const router = Router();

const registerSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string(),
  color: z.string().optional(),
  industries: z.array(z.string()).default(['Independent']),
  interests: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  location: z.string().optional(),
  visibilityLayers: z.record(z.boolean()).optional(),
  visibilityPreferences: z
    .object({
      presence: z.enum(visibilityLayers),
      profile: z.enum(visibilityLayers),
      commerce: z.enum(visibilityLayers),
      registryOptIn: z.boolean(),
    })
    .optional(),
  bio: z.string().optional(),
});

router.post('/register', (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const record = parsed.data;
  const hash = bcrypt.hashSync(record.password, 10);

  const insert = db.prepare(`
    INSERT INTO users (id, email, password, name, color, industries, interests, skills, location, visibility_layers, visibility_preferences, bio)
    VALUES (@id, @email, @password, @name, @color, @industries, @interests, @skills, @location, @visibility_layers, @visibility_preferences, @bio)
  `);

  try {
    insert.run({
      id: record.id,
      email: record.email,
      password: hash,
      name: record.name,
      color: record.color ?? '#38bdf8',
      industries: JSON.stringify(record.industries ?? ['Independent']),
      interests: JSON.stringify(record.interests ?? []),
      skills: JSON.stringify(record.skills ?? []),
      location: record.location ?? 'Remote',
      visibility_layers: JSON.stringify(record.visibilityLayers ?? {
        private: true,
        friends: true,
        industry: true,
        public: false,
      }),
      visibility_preferences: JSON.stringify(
        record.visibilityPreferences ?? {
          presence: 'friends',
          profile: 'industry',
          commerce: 'public',
          registryOptIn: true,
        }
      ),
      bio: record.bio ?? '',
    });
  } catch (error) {
    return res.status(400).json({ error: 'User already exists.' });
  }

  return res.status(201).json({ message: 'Registered' });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const statement = db.prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
  const user = statement.get(parsed.data.email) as any;
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!bcrypt.compareSync(parsed.data.password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const sanitized: UserRecord = {
    id: user.id,
    email: user.email,
    password: user.password,
    name: user.name,
    color: user.color,
    industries: JSON.parse(user.industries ?? '[]'),
    interests: JSON.parse(user.interests ?? '[]'),
    skills: JSON.parse(user.skills ?? '[]'),
    location: user.location ?? undefined,
    visibilityLayers: JSON.parse(user.visibility_layers ?? '{}'),
    visibilityPreferences: JSON.parse(user.visibility_preferences ?? '{}'),
    bio: user.bio ?? undefined,
  };

  return res.json({
    user: {
      ...sanitized,
      password: undefined,
    },
  });
});

export const authRouter = router;
