const globalProcess = (globalThis as any)?.process as { env?: Record<string, string | undefined> } | undefined;
const processEnvKey = globalProcess?.env?.YOUTUBE_API_KEY;

const metaEnv = (typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined) as
  | Record<string, string | undefined>
  | undefined;
const metaEnvKey = metaEnv?.YOUTUBE_API_KEY ?? metaEnv?.VITE_YOUTUBE_API_KEY;

const resolvedKey = processEnvKey ?? metaEnvKey ?? '';

if (!resolvedKey) {
  console.warn(
    '[YouTube Integration] Missing YOUTUBE_API_KEY environment variable. Personalization will be limited until the key is provided.'
  );
}

export const YOUTUBE_API_KEY = resolvedKey;

export const YOUTUBE_OAUTH_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';
export const YOUTUBE_OAUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const YOUTUBE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

export function getYouTubeApiKey(): string {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY is not defined in the environment.');
  }
  return YOUTUBE_API_KEY;
}
