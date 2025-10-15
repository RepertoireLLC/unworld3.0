import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { useYouTubeIntegrationStore } from './store/youtubeStore';

const browserProcess = typeof process !== 'undefined' ? process : undefined;
const viteEnv = (typeof import.meta !== 'undefined' ? (import.meta as ImportMeta).env : undefined) ?? {};

const oauthClientId =
  viteEnv.VITE_YOUTUBE_CLIENT_ID ??
  browserProcess?.env?.YOUTUBE_OAUTH_CLIENT_ID ??
  browserProcess?.env?.YOUTUBE_CLIENT_ID ??
  '';

const oauthRedirect =
  viteEnv.VITE_YOUTUBE_REDIRECT_URI ??
  browserProcess?.env?.YOUTUBE_OAUTH_REDIRECT ??
  (typeof window !== 'undefined' ? `${window.location.origin}/oauth/youtube` : '');

if (oauthClientId && oauthRedirect) {
  const store = useYouTubeIntegrationStore.getState();
  if (!store.configured) {
    store.configure({ clientId: oauthClientId, redirectUri: oauthRedirect });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);