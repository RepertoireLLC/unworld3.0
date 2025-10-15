const viteEnv =
  typeof import.meta !== 'undefined' && typeof (import.meta as ImportMeta).env !== 'undefined'
    ? (import.meta as ImportMeta).env
    : undefined;

const processEnv = typeof process !== 'undefined' ? process.env : undefined;

const YT_API_KEY =
  viteEnv?.VITE_YOUTUBE_API_KEY ??
  processEnv?.YOUTUBE_API_KEY ??
  '';

if (!YT_API_KEY) {
  console.warn(
    '[YouTube Integration] Missing YOUTUBE_API_KEY environment variable. Personalization will be limited until the key is provided.'
  );
}

export const YOUTUBE_API_KEY = YT_API_KEY;

export const YOUTUBE_OAUTH_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';
export const YOUTUBE_OAUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const YOUTUBE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

export function getYouTubeApiKey(): string {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY is not defined in the environment.');
  }
  return YOUTUBE_API_KEY;
}
