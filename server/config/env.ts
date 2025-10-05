import dotenv from 'dotenv';

dotenv.config();

type NumberLike = string | number | undefined;

const toNumber = (value: NumberLike, fallback: number): number => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toStringArray = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const NODE_ENV = process.env.NODE_ENV ?? 'production';
const PORT = toNumber(process.env.PORT, 4173);
const API_BASE_URL = process.env.API_BASE_URL ?? '';
const CORS_ORIGIN = toStringArray(process.env.CORS_ORIGIN);
const RATE_LIMIT_WINDOW_MS = toNumber(process.env.RATE_LIMIT_WINDOW_MS, 60_000);
const RATE_LIMIT_MAX_REQUESTS = toNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 120);

export const env = {
  nodeEnv: NODE_ENV,
  port: PORT,
  apiBaseUrl: API_BASE_URL,
  corsOrigins: CORS_ORIGIN,
  isProduction: NODE_ENV === 'production',
  rateLimit: {
    windowMs: RATE_LIMIT_WINDOW_MS,
    maxRequests: RATE_LIMIT_MAX_REQUESTS,
  },
} as const;

export type ServerEnvironment = typeof env;
