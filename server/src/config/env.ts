import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_PATH: z.string().default('./ghostline.db'),
  MASTER_KEY_BASE64: z
    .string()
    .min(1, 'MASTER_KEY_BASE64 must be set to a base64-encoded 32 byte key'),
  SESSION_TOKEN_TTL_SECONDS: z.coerce.number().default(3600),
  PRESENCE_TIMEOUT_SECONDS: z.coerce.number().default(45)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
