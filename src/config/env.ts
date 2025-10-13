const normalizeUrl = (value: string | undefined): string => {
  if (!value) {
    return '';
  }

  return value.replace(/\/$/, '');
};

const mode = import.meta.env.MODE ?? 'development';
const apiBaseUrl = normalizeUrl(import.meta.env.VITE_API_BASE_URL);
const websocketUrl = normalizeUrl(
  import.meta.env.VITE_WS_URL ?? (apiBaseUrl ? apiBaseUrl.replace(/^http/, 'ws') : ''),
);
const release = import.meta.env.VITE_RELEASE ?? '';

export const env = {
  mode,
  apiBaseUrl,
  websocketUrl,
  release,
  isProduction: mode === 'production',
} as const;

export type ClientEnvironment = typeof env;
