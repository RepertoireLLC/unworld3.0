export interface RuntimeConfig {
  port: number;
  clientOrigin: string;
  jwtSecret: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  cacheTtlSeconds: number;
}

const numberFromEnv = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const runtimeConfig: RuntimeConfig = {
  port: numberFromEnv(process.env.PORT, 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET ?? 'enclypse-dev-secret',
  rateLimitWindowMs: numberFromEnv(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  rateLimitMax: numberFromEnv(process.env.RATE_LIMIT_MAX, 120),
  cacheTtlSeconds: numberFromEnv(process.env.CACHE_TTL_SECONDS, 15),
};
