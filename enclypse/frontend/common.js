import sodium from 'https://cdn.jsdelivr.net/npm/libsodium-wrappers-sumo@0.7.13/+esm';

let ready = false;
let sodiumLib;

const origin = window.location.origin && window.location.origin !== 'null' ? window.location.origin : '';
const apiBase = origin.startsWith('http') ? origin.replace(/:\d+$/, ':4000') : 'http://localhost:4000';

async function ensureReady() {
  if (!ready) {
    sodiumLib = await sodium;
    ready = true;
  }
  return sodiumLib;
}

function getToken() {
  return localStorage.getItem('enclypse.token');
}

function setToken(token) {
  if (token) {
    localStorage.setItem('enclypse.token', token);
  } else {
    localStorage.removeItem('enclypse.token');
  }
}

function setKeyMaterial({ publicKey, privateKey }) {
  if (publicKey) localStorage.setItem('enclypse.publicKey', publicKey);
  if (privateKey) localStorage.setItem('enclypse.privateKey', privateKey);
}

function getKeyMaterial() {
  return {
    publicKey: localStorage.getItem('enclypse.publicKey'),
    privateKey: localStorage.getItem('enclypse.privateKey'),
  };
}

async function api(path, options = {}) {
  const token = getToken();
  const headers = options.headers ? { ...options.headers } : {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    setToken(null);
    window.location.href = 'login.html';
    return null;
  }

  if (!res.ok) {
    let detail;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        detail = await res.json();
      } catch (error) {
        detail = { error: res.statusText };
      }
    } else {
      detail = await res.text();
    }
    const message = typeof detail === 'string' ? detail : detail?.error || res.statusText;
    const error = new Error(message || 'Request failed');
    error.status = res.status;
    error.detail = detail;
    throw error;
  }

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return res.blob();
}

async function registerUser({ username, password, displayName }) {
  const sodium = await ensureReady();
  const keyPair = sodium.crypto_box_keypair();
  const privateKeyB64 = sodium.to_base64(keyPair.privateKey);
  const publicKeyB64 = sodium.to_base64(keyPair.publicKey);

  const res = await api('/api/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, displayName, publicKey: publicKeyB64, privateKey: privateKeyB64 }),
  });

  return res;
}

async function login({ username, password }) {
  const result = await api('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setToken(result.token);
  setKeyMaterial({ publicKey: result.user.publicKey, privateKey: result.privateKey });
  return result;
}

async function logout() {
  await api('/api/logout', { method: 'POST' }).catch(() => {});
  setToken(null);
  setKeyMaterial({ publicKey: null, privateKey: null });
  window.location.href = 'login.html';
}

async function getPresence() {
  return api('/api/presence');
}

async function getContacts() {
  return api('/api/contacts');
}

async function addContact(username) {
  return api('/api/contacts', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

async function searchUsers(query) {
  return api(`/api/search?query=${encodeURIComponent(query)}`);
}

async function fetchConversation(username) {
  return api(`/api/messages/${encodeURIComponent(username)}`);
}

async function fetchUser(username) {
  return api(`/api/users/${encodeURIComponent(username)}`);
}

async function sendMessage({ to, ciphertext, nonce, transport, options }) {
  return api('/api/messages', {
    method: 'POST',
    body: JSON.stringify({ to, ciphertext, nonce, transport, options }),
  });
}

async function sendAttachment({ to, file, options }) {
  const form = new FormData();
  form.append('to', to);
  form.append('file', file);
  if (options) {
    form.append('options', JSON.stringify(options));
  }
  return api('/api/messages/attachment', {
    method: 'POST',
    body: form,
  });
}

async function downloadAttachment(messageId) {
  const blob = await api(`/api/messages/attachment/${messageId}`);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

async function unlockSecretFilter(messageId, action) {
  return api(`/api/messages/${messageId}/unlock`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}

async function getPreferences() {
  const result = await api('/api/preferences');
  return result.preferences;
}

async function savePreferences(preferences) {
  const result = await api('/api/preferences', {
    method: 'POST',
    body: JSON.stringify(preferences),
  });
  return result.preferences;
}

async function listAlbums() {
  return api('/api/albums');
}

async function createAlbum(body) {
  return api('/api/albums', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function fetchAlbum(id) {
  return api(`/api/albums/${id}`);
}

async function uploadAlbumItem(id, { file, description }) {
  const form = new FormData();
  form.append('file', file);
  if (description) form.append('description', description);
  return api(`/api/albums/${id}/items`, { method: 'POST', body: form });
}

async function listConstellations() {
  return api('/api/constellations');
}

async function createConstellation(body) {
  return api('/api/constellations', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function addConstellationLink(id, link) {
  return api(`/api/constellations/${id}/links`, {
    method: 'POST',
    body: JSON.stringify(link),
  });
}

async function removeConstellationLink(id, link) {
  return api(`/api/constellations/${id}/links`, {
    method: 'DELETE',
    body: JSON.stringify(link),
  });
}

async function listSecretLinks() {
  return api('/api/secret-links');
}

async function createSecretLink(body) {
  return api('/api/secret-links', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function deleteSecretLink(id) {
  return api(`/api/secret-links/${id}`, { method: 'DELETE' });
}

async function listGames() {
  return api('/api/games');
}

async function createGame(body) {
  return api('/api/games', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function fetchGame(id) {
  return api(`/api/games/${id}`);
}

async function sendGameMove(id, payload) {
  return api(`/api/games/${id}/move`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function listTreasureHunts() {
  return api('/api/qr/treasure');
}

async function createTreasureHunt(body) {
  return api('/api/qr/treasure', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function claimTreasure(code) {
  return api('/api/qr/treasure/claim', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

async function getTransportState() {
  return api('/api/transports');
}

async function listBluetoothPeers() {
  return api('/api/transports/bluetooth/peers');
}

async function setTransportPreference(transport, extra = {}) {
  return api('/api/transports', {
    method: 'POST',
    body: JSON.stringify({ transport, ...extra }),
  });
}

function connectPresenceSocket(handler) {
  const token = getToken();
  if (!token) return null;

  const callbacks = typeof handler === 'function' ? { onPresence: handler } : handler || {};
  const reconnectTarget = typeof handler === 'function' ? handler : callbacks;

  const wsUrl = `${apiBase.replace(/^http/, 'ws').replace(/:\d+$/, ':4001')}?token=${token}`;
  const socket = new WebSocket(wsUrl);
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'presence:update' && callbacks.onPresence) {
      callbacks.onPresence(data.payload);
    }
    if (data.type === 'message:new') {
      if (callbacks.onMessage) {
        try {
          callbacks.onMessage(data.payload);
        } catch (error) {
          console.warn('Realtime message callback failed', error);
        }
      }
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('enclypse:message', { detail: data.payload }));
      }
    }
    if (data.type === 'game:update') {
      if (callbacks.onGame) {
        try {
          callbacks.onGame(data.payload);
        } catch (error) {
          console.warn('Realtime game callback failed', error);
        }
      }
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('enclypse:game', { detail: data.payload }));
      }
    }
  };
  socket.onclose = () => {
    setTimeout(() => connectPresenceSocket(reconnectTarget), 4000);
  };
  return socket;
}

async function encryptMessage(recipientPublicKey, message) {
  const sodium = await ensureReady();
  const { privateKey } = getKeyMaterial();
  if (!privateKey) throw new Error('No private key available');

  const privateKeyBytes = sodium.from_base64(privateKey);
  const publicKeyBytes = sodium.from_base64(recipientPublicKey);
  const messageBytes = sodium.from_string(message);
  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
  const ciphertext = sodium.crypto_box_easy(messageBytes, nonce, publicKeyBytes, privateKeyBytes);
  return {
    ciphertext: sodium.to_base64(ciphertext),
    nonce: sodium.to_base64(nonce),
  };
}

async function decryptMessage(senderPublicKey, ciphertextB64, nonceB64) {
  const sodium = await ensureReady();
  const { privateKey } = getKeyMaterial();
  if (!privateKey) return null;
  const privateKeyBytes = sodium.from_base64(privateKey);
  const publicKeyBytes = sodium.from_base64(senderPublicKey);
  const ciphertext = sodium.from_base64(ciphertextB64);
  const nonce = sodium.from_base64(nonceB64);
  const msg = sodium.crypto_box_open_easy(ciphertext, nonce, publicKeyBytes, privateKeyBytes);
  return sodium.to_string(msg);
}

export {
  api,
  apiBase,
  ensureReady,
  getToken,
  setToken,
  registerUser,
  login,
  logout,
  getPresence,
  getContacts,
  addContact,
  searchUsers,
  fetchConversation,
  fetchUser,
  sendMessage,
  sendAttachment,
  downloadAttachment,
  unlockSecretFilter,
  getPreferences,
  savePreferences,
  listAlbums,
  createAlbum,
  fetchAlbum,
  uploadAlbumItem,
  listConstellations,
  createConstellation,
  addConstellationLink,
  removeConstellationLink,
  listSecretLinks,
  createSecretLink,
  deleteSecretLink,
  listGames,
  createGame,
  fetchGame,
  sendGameMove,
  listTreasureHunts,
  createTreasureHunt,
  claimTreasure,
  connectPresenceSocket,
  encryptMessage,
  decryptMessage,
  getKeyMaterial,
  getTransportState,
  listBluetoothPeers,
  setTransportPreference,
};
