import { YOUTUBE_OAUTH_ENDPOINT, YOUTUBE_OAUTH_SCOPE } from './config';
import type { OAuthSession, YouTubeOAuthTokens } from './types';

async function getRandomBytes(size: number): Promise<Uint8Array> {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const array = new Uint8Array(size);
    globalThis.crypto.getRandomValues(array);
    return array;
  }

  const nodeCrypto = await import('crypto');
  return nodeCrypto.randomBytes(size);
}

function base64UrlEncode(buffer: Uint8Array): string {
  let base64: string;
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    let binary = '';
    buffer.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    base64 = window.btoa(binary);
  } else {
    base64 = Buffer.from(buffer).toString('base64');
  }

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(input: string): Promise<ArrayBuffer> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const data = new TextEncoder().encode(input);
    return window.crypto.subtle.digest('SHA-256', data);
  }
  return new Promise((resolve, reject) => {
    try {
      const hash = require('crypto').createHash('sha256').update(input).digest();
      resolve(hash.buffer);
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateOAuthSession(clientId: string, redirectUri: string): Promise<OAuthSession> {
  const stateBytes = await getRandomBytes(16);
  const verifierBytes = await getRandomBytes(32);
  const state = base64UrlEncode(stateBytes);
  const verifier = base64UrlEncode(verifierBytes);

  const hash = await sha256(verifier);
  const challenge = base64UrlEncode(new Uint8Array(hash));
  const url = new URL(YOUTUBE_OAUTH_ENDPOINT);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', YOUTUBE_OAUTH_SCOPE);
  url.searchParams.set('state', state);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');

  return {
    state,
    codeVerifier: verifier,
    authUrl: url.toString(),
  };
}

export interface TokenExchangePayload {
  clientId: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
}

export async function exchangeOAuthCode(payload: TokenExchangePayload): Promise<YouTubeOAuthTokens> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: payload.clientId,
      redirect_uri: payload.redirectUri,
      grant_type: 'authorization_code',
      code: payload.code,
      code_verifier: payload.codeVerifier,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange OAuth code: ${errorText}`);
  }

  const result = await response.json();
  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    expiresAt: result.expires_in ? Date.now() + result.expires_in * 1000 : undefined,
    scope: result.scope,
    tokenType: result.token_type,
  };
}

export async function refreshAccessToken(
  clientId: string,
  refreshToken: string
): Promise<YouTubeOAuthTokens> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh OAuth token: ${errorText}`);
  }

  const result = await response.json();
  return {
    accessToken: result.access_token,
    refreshToken,
    expiresAt: result.expires_in ? Date.now() + result.expires_in * 1000 : undefined,
    scope: result.scope,
    tokenType: result.token_type,
  };
}
