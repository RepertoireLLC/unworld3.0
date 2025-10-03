import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import argon2 from 'argon2';
import sodium from 'libsodium-wrappers-sumo';
import { fileURLToPath } from 'url';
import http from 'http';
import { WebSocketServer } from 'ws';
import QRCode from 'qrcode';

import { run, get, all, paths } from './database.js';
import { BluetoothRelay, computeBluetoothIdentifier } from './bluetooth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

await sodium.ready;

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

const upload = multer({ storage: multer.memoryStorage() });

const SESSION_TTL = 1000 * 60 * 60 * 24 * 7;

const server = http.createServer(app);
const wss = new WebSocketServer({ port: 4001 });

const bluetoothRelay = new BluetoothRelay();
const transportSelections = new Map(); // userId -> transport string
const onlineUsers = new Map(); // userId -> { username, displayName, sockets: Set<WebSocket> }
const defaultPreferences = {
  theme: 'default',
  soundEnabled: false,
  soundContact: '',
  aiSidekick: false,
  avatar: '',
  trailsEnabled: true,
};
const MAX_TRAIL_POINTS = 12;

function parseMetadata(raw) {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' ? value : {};
  } catch (error) {
    console.warn('Unable to parse metadata payload', error);
    return {};
  }
}

async function getUserPreferences(userId) {
  const row = await get('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);
  if (!row) return { ...defaultPreferences };
  return {
    theme: row.theme || defaultPreferences.theme,
    soundEnabled: Boolean(row.sound_enabled),
    soundContact: row.sound_contact || '',
    aiSidekick: Boolean(row.ai_sidekick),
    avatar: row.avatar || '',
    trailsEnabled: row.trails_enabled === null ? defaultPreferences.trailsEnabled : Boolean(row.trails_enabled),
  };
}

async function upsertUserPreferences(userId, updates) {
  const current = await get('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);
  const payload = {
    theme: updates.theme ?? current?.theme ?? defaultPreferences.theme,
    sound_enabled:
      updates.soundEnabled !== undefined ? (updates.soundEnabled ? 1 : 0) : current?.sound_enabled ?? (defaultPreferences.soundEnabled ? 1 : 0),
    sound_contact: updates.soundContact ?? current?.sound_contact ?? defaultPreferences.soundContact,
    ai_sidekick:
      updates.aiSidekick !== undefined ? (updates.aiSidekick ? 1 : 0) : current?.ai_sidekick ?? (defaultPreferences.aiSidekick ? 1 : 0),
    avatar: updates.avatar ?? current?.avatar ?? defaultPreferences.avatar,
    trails_enabled:
      updates.trailsEnabled !== undefined
        ? (updates.trailsEnabled ? 1 : 0)
        : current?.trails_enabled ?? (defaultPreferences.trailsEnabled ? 1 : 0),
  };

  if (current) {
    await run(
      'UPDATE user_preferences SET theme = ?, sound_enabled = ?, sound_contact = ?, ai_sidekick = ?, avatar = ?, trails_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [payload.theme, payload.sound_enabled, payload.sound_contact, payload.ai_sidekick, payload.avatar, payload.trails_enabled, userId],
    );
  } else {
    await run(
      'INSERT INTO user_preferences (user_id, theme, sound_enabled, sound_contact, ai_sidekick, avatar, trails_enabled) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, payload.theme, payload.sound_enabled, payload.sound_contact, payload.ai_sidekick, payload.avatar, payload.trails_enabled],
    );
  }
  return getUserPreferences(userId);
}

async function recordTrail(userId, tag = 'presence') {
  try {
    const angle = (Date.now() % 3600) / 10;
    const radius = 1.5 + ((userId % 7) * 0.11);
    const entry = {
      tag,
      at: new Date().toISOString(),
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      z: Math.sin(angle / 2) * radius * 0.6,
    };
    await run('INSERT INTO presence_trails (user_id, position) VALUES (?, ?)', [userId, JSON.stringify(entry)]);
    await run(
      'DELETE FROM presence_trails WHERE id NOT IN (SELECT id FROM presence_trails WHERE user_id = ? ORDER BY recorded_at DESC LIMIT ?)',
      [userId, MAX_TRAIL_POINTS],
    );
  } catch (error) {
    console.warn('Failed to record trail', error);
  }
}

async function getConstellationsSnapshot() {
  const constellations = await all(
    `SELECT constellations.*, users.username AS owner_username
     FROM constellations
     JOIN users ON users.id = constellations.owner_id
     ORDER BY constellations.created_at DESC`,
  );
  if (!constellations.length) return [];
  const links = await all(
    `SELECT constellation_links.constellation_id, from_user.username AS from_username, to_user.username AS to_username
     FROM constellation_links
     JOIN users AS from_user ON from_user.id = constellation_links.from_user
     JOIN users AS to_user ON to_user.id = constellation_links.to_user`,
  );
  return constellations.map((constellation) => ({
    id: constellation.id,
    name: constellation.name,
    style: constellation.style,
    owner: constellation.owner_username,
    links: links
      .filter((link) => link.constellation_id === constellation.id)
      .map((link) => ({ from: link.from_username, to: link.to_username })),
  }));
}

bluetoothRelay.on('message', async (payload) => {
  if (!payload?.from || !payload?.to || !payload.ciphertext || !payload.nonce) return;
  try {
    const sender = await get('SELECT id, username FROM users WHERE bluetooth_identifier = ?', [payload.from]);
    const recipient = await get('SELECT id, username FROM users WHERE bluetooth_identifier = ?', [payload.to]);
    if (!sender || !recipient) return;
    const result = await run(
      'INSERT INTO messages (sender_id, recipient_id, ciphertext, nonce, status) VALUES (?, ?, ?, ?, ?)',
      [sender.id, recipient.id, payload.ciphertext, payload.nonce, 'received-bluetooth'],
    );
    notifyMessage(recipient.id, { from: sender.username, messageId: result.lastID });
    await recordTrail(sender.id, 'bluetooth');
    await recordTrail(recipient.id, 'bluetooth');
  } catch (error) {
    console.error('Failed to persist Bluetooth message', error);
  }
});

async function getPresenceSnapshot() {
  const users = await all('SELECT id, username, display_name FROM users ORDER BY username');
  const trails = await all(
    `SELECT presence_trails.user_id, presence_trails.position, presence_trails.recorded_at, users.username
     FROM presence_trails
     JOIN users ON users.id = presence_trails.user_id
     ORDER BY presence_trails.recorded_at DESC`,
  );
  const trailMap = {};
  for (const entry of trails) {
    const payload = parseMetadata(entry.position) || {};
    if (!trailMap[entry.username]) trailMap[entry.username] = [];
    trailMap[entry.username].push({ ...payload, recordedAt: entry.recorded_at });
  }
  const preferencesEntries = await Promise.all(
    users.map(async (user) => [user.username, await getUserPreferences(user.id)]),
  );
  const preferences = Object.fromEntries(preferencesEntries);
  const constellations = await getConstellationsSnapshot();
  return {
    users: users.map((user) => ({
      username: user.username,
      displayName: user.display_name,
      online: onlineUsers.has(user.id),
    })),
    trails: trailMap,
    constellations,
    preferences,
    generatedAt: new Date().toISOString(),
  };
}

async function broadcastPresence() {
  const payload = await getPresenceSnapshot();
  for (const entry of onlineUsers.values()) {
    for (const socket of entry.sockets) {
      safeSend(socket, { type: 'presence:update', payload });
    }
  }
}

function safeSend(socket, message) {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(message));
  }
}

async function authenticateToken(token) {
  if (!token) return null;
  const session = await get(
    'SELECT sessions.*, users.username, users.display_name, users.bluetooth_identifier FROM sessions JOIN users ON users.id = sessions.user_id WHERE token = ? AND datetime(expires_at) > datetime("now")',
    [token],
  );
  return session || null;
}

async function registerSession(userId) {
  const token = crypto.randomBytes(48).toString('hex');
  const expires = new Date(Date.now() + SESSION_TTL).toISOString();
  await run('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)', [userId, token, expires]);
  return token;
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  authenticateToken(token)
    .then((session) => {
      if (!session) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      req.session = session;
      req.user = {
        id: session.user_id,
        username: session.username,
        displayName: session.display_name,
        bluetoothIdentifier: session.bluetooth_identifier,
      };
      next();
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Authentication error' });
    });
}

app.post('/api/register', async (req, res) => {
  try {
    const { username, password, displayName, publicKey, privateKey } = req.body;
    if (!username || !password || !publicKey || !privateKey) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    const lower = username.toLowerCase();
    const bluetoothIdentifier = computeBluetoothIdentifier(lower);
    const existing = await get('SELECT id FROM users WHERE username = ?', [lower]);
    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const key = sodium.crypto_pwhash(32, password, salt, sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE, sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE, sodium.crypto_pwhash_ALG_DEFAULT);
    const privateKeyBytes = sodium.from_base64(privateKey);
    const cipher = sodium.crypto_secretbox_easy(privateKeyBytes, nonce, key);
    await run(
      'INSERT INTO users (username, display_name, password_hash, public_key, private_key, private_key_nonce, private_key_salt, bluetooth_identifier) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        lower,
        displayName || '',
        passwordHash,
        publicKey,
        sodium.to_base64(cipher),
        sodium.to_base64(nonce),
        sodium.to_base64(salt),
        bluetoothIdentifier,
      ],
    );
    await broadcastPresence();
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
    const user = await get('SELECT * FROM users WHERE username = ?', [username.toLowerCase()]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await argon2.verify(user.password_hash, password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    let bluetoothIdentifier = user.bluetooth_identifier;
    if (!bluetoothIdentifier) {
      bluetoothIdentifier = computeBluetoothIdentifier(user.username);
      await run('UPDATE users SET bluetooth_identifier = ? WHERE id = ?', [bluetoothIdentifier, user.id]);
    }
    const key = sodium.crypto_pwhash(
      32,
      password,
      sodium.from_base64(user.private_key_salt),
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_ALG_DEFAULT,
    );
    const privateKeyBytes = sodium.crypto_secretbox_open_easy(
      sodium.from_base64(user.private_key),
      sodium.from_base64(user.private_key_nonce),
      key,
    );
    const token = await registerSession(user.id);
    const preferences = await getUserPreferences(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        publicKey: user.public_key,
        bluetoothIdentifier,
      },
      privateKey: sodium.to_base64(privateKeyBytes),
      preferences,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/logout', authMiddleware, async (req, res) => {
  await run('DELETE FROM sessions WHERE id = ?', [req.session.id]);
  transportSelections.delete(req.user.id);
  bluetoothRelay.disableForUser(req.user.id).catch(() => {});
  res.json({ success: true });
});

app.get('/api/me', authMiddleware, async (req, res) => {
  const user = await get('SELECT id, username, display_name, bio, created_at, bluetooth_identifier FROM users WHERE id = ?', [req.user.id]);
  const preferences = await getUserPreferences(req.user.id);
  res.json({
    username: user.username,
    displayName: user.display_name,
    bio: user.bio,
    createdAt: user.created_at,
    online: onlineUsers.has(user.id),
    bluetoothIdentifier: user.bluetooth_identifier,
    preferences,
  });
});

app.get('/api/preferences', authMiddleware, async (req, res) => {
  const preferences = await getUserPreferences(req.user.id);
  res.json({ preferences });
});

app.post('/api/preferences', authMiddleware, async (req, res) => {
  const { theme, soundEnabled, soundContact, aiSidekick, avatar, trailsEnabled } = req.body || {};
  const preferences = await upsertUserPreferences(req.user.id, {
    theme,
    soundEnabled,
    soundContact,
    aiSidekick,
    avatar,
    trailsEnabled,
  });
  await recordTrail(req.user.id, 'preference-update');
  broadcastPresence();
  res.json({ preferences });
});

app.get('/api/transports', authMiddleware, (req, res) => {
  res.json({
    active: transportSelections.get(req.user.id) || 'internet',
    available: {
      bluetooth: bluetoothRelay.available,
    },
    bluetoothIdentifier: req.user.bluetoothIdentifier || null,
  });
});

app.post('/api/transports', authMiddleware, async (req, res) => {
  const { transport } = req.body || {};
  if (!['internet', 'bluetooth'].includes(transport)) {
    return res.status(400).json({ error: 'Invalid transport option' });
  }
  if (transport === 'bluetooth') {
    try {
      let identifier = req.user.bluetoothIdentifier;
      if (!identifier) {
        identifier = computeBluetoothIdentifier(req.user.username);
        await run('UPDATE users SET bluetooth_identifier = ? WHERE id = ?', [identifier, req.user.id]);
        req.user.bluetoothIdentifier = identifier;
      }
      await bluetoothRelay.enableForUser({
        userId: req.user.id,
        username: req.user.username,
        identifier,
      });
    } catch (error) {
      return res.status(503).json({ error: `Bluetooth unavailable: ${error.message}` });
    }
  } else {
    await bluetoothRelay.disableForUser(req.user.id);
  }
  transportSelections.set(req.user.id, transport);
  res.json({ success: true, active: transport });
});

app.get('/api/users/:username', authMiddleware, async (req, res) => {
  const user = await get('SELECT id, username, display_name, public_key, bio, created_at, bluetooth_identifier FROM users WHERE username = ?', [req.params.username.toLowerCase()]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    username: user.username,
    displayName: user.display_name,
    publicKey: user.public_key,
    bio: user.bio,
    createdAt: user.created_at,
    online: onlineUsers.has(user.id),
    bluetoothIdentifier: user.bluetooth_identifier,
  });
});

app.get('/api/presence', authMiddleware, async (req, res) => {
  const payload = await getPresenceSnapshot();
  res.json(payload);
});

app.get('/api/contacts', authMiddleware, async (req, res) => {
  const contacts = await all(
    `SELECT users.id, users.username, users.display_name
     FROM contacts
     JOIN users ON users.id = contacts.contact_id
     WHERE contacts.user_id = ?
     ORDER BY users.display_name COLLATE NOCASE`,
    [req.user.id],
  );
  const unique = contacts.reduce((acc, user) => {
    acc[user.username] = user;
    return acc;
  }, {});
  const list = Object.values(unique);
  res.json({
    total: list.length,
    onlineCount: list.filter((c) => onlineUsers.has(c.id)).length,
    contacts: list.map((c) => ({
      username: c.username,
      displayName: c.display_name,
      online: onlineUsers.has(c.id),
    })),
  });
});

app.post('/api/contacts', authMiddleware, async (req, res) => {
  const { username } = req.body;
  const target = await get('SELECT id FROM users WHERE username = ?', [username?.toLowerCase?.()]);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'Cannot add yourself' });
  await run('INSERT OR IGNORE INTO contacts (user_id, contact_id) VALUES (?, ?)', [req.user.id, target.id]);
  await run('INSERT OR IGNORE INTO contacts (user_id, contact_id) VALUES (?, ?)', [target.id, req.user.id]);
  res.json({ success: true });
});

app.get('/api/search', authMiddleware, async (req, res) => {
  const query = `%${(req.query.query || '').toLowerCase()}%`;
  const results = await all(
    `SELECT id, username, display_name
     FROM users
     WHERE username LIKE ? OR display_name LIKE ?
     ORDER BY display_name COLLATE NOCASE
     LIMIT 20`,
    [query, query],
  );
  res.json({
    results: results.map((user) => ({
      username: user.username,
      displayName: user.display_name,
      online: onlineUsers.has(user.id),
    })),
  });
});

app.post('/api/messages', authMiddleware, async (req, res) => {
  const { to, ciphertext, nonce, transport, options } = req.body;
  const recipient = await get('SELECT id, username, bluetooth_identifier FROM users WHERE username = ?', [to?.toLowerCase?.()]);
  if (!recipient) return res.status(404).json({ error: 'Recipient not found' });
  const channel = transport === 'bluetooth' ? 'bluetooth' : 'internet';
  let status = 'sent';
  const messageOptions = options && typeof options === 'object' ? options : {};
  const metadata = { transport: channel };
  if (messageOptions.ephemeral?.enabled) {
    metadata.ephemeral = {
      enabled: true,
      viewLimit: Number(messageOptions.ephemeral.viewLimit) || 1,
      expiresSeconds: Number(messageOptions.ephemeral.expiresSeconds) || null,
    };
  }
  if (messageOptions.secretLink?.cipher && messageOptions.secretLink?.nonce) {
    metadata.secretLink = {
      label: messageOptions.secretLink.label || 'Secret',
      cipher: messageOptions.secretLink.cipher,
      nonce: messageOptions.secretLink.nonce,
      expiresAt: messageOptions.secretLink.expiresAt || null,
    };
  }
  if (channel === 'bluetooth') {
    if (!bluetoothRelay.available) {
      return res.status(503).json({ error: 'Bluetooth transport is not available on this system' });
    }
    try {
      let senderIdentifier = req.user.bluetoothIdentifier;
      if (!senderIdentifier) {
        senderIdentifier = computeBluetoothIdentifier(req.user.username);
        await run('UPDATE users SET bluetooth_identifier = ? WHERE id = ?', [senderIdentifier, req.user.id]);
        req.user.bluetoothIdentifier = senderIdentifier;
      }
      let recipientIdentifier = recipient.bluetooth_identifier;
      if (!recipientIdentifier) {
        recipientIdentifier = computeBluetoothIdentifier(recipient.username);
        await run('UPDATE users SET bluetooth_identifier = ? WHERE id = ?', [recipientIdentifier, recipient.id]);
      }
      await bluetoothRelay.sendMessage({
        fromIdentifier: senderIdentifier,
        toIdentifier: recipientIdentifier,
        payload: { ciphertext, nonce },
      });
      status = 'delivered-bluetooth';
    } catch (error) {
      return res.status(503).json({ error: `Bluetooth delivery failed: ${error.message}` });
    }
  }
  const result = await run(
    'INSERT INTO messages (sender_id, recipient_id, ciphertext, nonce, status, metadata) VALUES (?, ?, ?, ?, ?, ?)',
    [req.user.id, recipient.id, ciphertext, nonce, status, JSON.stringify(metadata)],
  );
  notifyMessage(recipient.id, { from: req.user.username, messageId: result.lastID });
  await recordTrail(req.user.id, 'chat');
  await recordTrail(recipient.id, 'chat');
  res.json({ success: true, id: result.lastID, status, transport: channel });
});

app.post('/api/messages/attachment', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Missing file' });
  const { to } = req.body;
  const recipient = await get('SELECT id FROM users WHERE username = ?', [to?.toLowerCase?.()]);
  if (!recipient) return res.status(404).json({ error: 'Recipient not found' });
  let metadata = { attachment: true };
  if (req.body.options) {
    try {
      const parsed = JSON.parse(req.body.options);
      if (parsed?.secretFilter?.type) {
        metadata.secretFilter = { type: parsed.secretFilter.type, requiresInteraction: true };
      }
      if (parsed?.ephemeral?.enabled) {
        metadata.ephemeral = {
          enabled: true,
          viewLimit: Number(parsed.ephemeral.viewLimit) || 1,
          expiresSeconds: Number(parsed.ephemeral.expiresSeconds) || null,
        };
      }
    } catch (error) {
      console.warn('Failed to parse attachment metadata', error);
    }
  }
  const key = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES);
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(req.file.buffer, null, null, nonce, key);
  const fileId = crypto.randomBytes(16).toString('hex');
  const filePath = path.join(paths.uploadsDir, `${fileId}.enc`);
  fs.writeFileSync(filePath, Buffer.from(ciphertext));
  const result = await run(
    'INSERT INTO messages (sender_id, recipient_id, attachment_path, attachment_nonce, attachment_key, status, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      req.user.id,
      recipient.id,
      filePath,
      sodium.to_base64(nonce),
      sodium.to_base64(key),
      'sent',
      JSON.stringify(metadata),
    ],
  );
  notifyMessage(recipient.id, { from: req.user.username, messageId: result.lastID });
  await recordTrail(req.user.id, 'media');
  await recordTrail(recipient.id, 'media');
  res.json({ success: true, id: result.lastID });
});

app.get('/api/messages/:username', authMiddleware, async (req, res) => {
  const peer = await get('SELECT id, public_key FROM users WHERE username = ?', [req.params.username.toLowerCase()]);
  if (!peer) return res.status(404).json({ error: 'User not found' });
  const rows = await all(
    `SELECT messages.*, sender.username AS sender_username, sender.public_key AS sender_public_key
     FROM messages
     JOIN users AS sender ON sender.id = messages.sender_id
     WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
     ORDER BY messages.created_at ASC`,
    [req.user.id, peer.id, peer.id, req.user.id],
  );
  const messages = [];
  for (const row of rows) {
    const metadata = parseMetadata(row.metadata);
    const ephemeral = metadata?.ephemeral?.enabled;
    let expired = false;
    if (ephemeral) {
      const limit = metadata.ephemeral.viewLimit || 1;
      const viewCount = await get('SELECT COUNT(*) AS total FROM ephemeral_views WHERE message_id = ? AND viewer_id = ?', [row.id, req.user.id]);
      const alreadyViewed = viewCount?.total > 0;
      if (!alreadyViewed) {
        await run('INSERT INTO ephemeral_views (message_id, viewer_id) VALUES (?, ?)', [row.id, req.user.id]);
      }
      const latestCount = alreadyViewed ? viewCount.total : (viewCount?.total || 0) + 1;
      const createdAt = new Date(row.created_at).getTime();
      const expiresSeconds = metadata.ephemeral.expiresSeconds || null;
      const now = Date.now();
      if ((expiresSeconds && now - createdAt > expiresSeconds * 1000) || latestCount >= limit) {
        expired = true;
        await run('DELETE FROM messages WHERE id = ?', [row.id]);
        await run('DELETE FROM ephemeral_views WHERE message_id = ?', [row.id]);
        continue;
      }
    }
    messages.push({
      id: row.id,
      direction: row.sender_id === req.user.id ? 'sent' : 'received',
      ciphertext: row.ciphertext,
      nonce: row.nonce,
      senderPublicKey: row.sender_public_key,
      attachmentId: row.attachment_path ? row.id : null,
      createdAt: row.created_at,
      status: row.status,
      metadata,
      expired,
    });
  }
  res.json({ messages });
});

app.get('/api/messages/attachment/:id', authMiddleware, async (req, res) => {
  const message = await get('SELECT * FROM messages WHERE id = ?', [req.params.id]);
  if (!message) return res.status(404).json({ error: 'Not found' });
  if (![message.sender_id, message.recipient_id].includes(req.user.id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!message.attachment_path) return res.status(404).json({ error: 'No attachment' });
  const metadata = parseMetadata(message.metadata);
  if (metadata?.secretFilter?.requiresInteraction) {
    const unlocked = await get('SELECT 1 FROM message_unlocks WHERE message_id = ? AND user_id = ?', [message.id, req.user.id]);
    if (!unlocked) {
      return res.status(423).json({ error: 'Locked by secret filter', filter: metadata.secretFilter });
    }
  }
  if (metadata?.ephemeral?.enabled) {
    const limit = metadata.ephemeral.viewLimit || 1;
    const viewCount = await get('SELECT COUNT(*) AS total FROM ephemeral_views WHERE message_id = ? AND viewer_id = ?', [message.id, req.user.id]);
    const alreadyViewed = viewCount?.total > 0;
    if (!alreadyViewed) {
      await run('INSERT INTO ephemeral_views (message_id, viewer_id) VALUES (?, ?)', [message.id, req.user.id]);
    }
    const totalViews = alreadyViewed ? viewCount.total : (viewCount?.total || 0) + 1;
    if (totalViews > limit) {
      await run('DELETE FROM messages WHERE id = ?', [message.id]);
      await run('DELETE FROM ephemeral_views WHERE message_id = ?', [message.id]);
      if (fs.existsSync(message.attachment_path)) {
        fs.rmSync(message.attachment_path, { force: true });
      }
      return res.status(410).json({ error: 'Ephemeral attachment expired' });
    }
  }
  const ciphertext = fs.readFileSync(message.attachment_path);
  const nonce = sodium.from_base64(message.attachment_nonce);
  const key = sodium.from_base64(message.attachment_key);
  const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, ciphertext, null, nonce, key);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.send(Buffer.from(plaintext));
});

app.post('/api/messages/:id/unlock', authMiddleware, async (req, res) => {
  const message = await get('SELECT id, metadata, sender_id, recipient_id FROM messages WHERE id = ?', [req.params.id]);
  if (!message) return res.status(404).json({ error: 'Message not found' });
  if (![message.sender_id, message.recipient_id].includes(req.user.id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const metadata = parseMetadata(message.metadata);
  if (!metadata?.secretFilter?.requiresInteraction) {
    return res.json({ unlocked: true, filter: null });
  }
  const { action } = req.body || {};
  const requiredAction = metadata.secretFilter?.type === 'orbit' ? 'rotate' : 'tap';
  if (!action || (requiredAction === 'rotate' && action !== 'rotate') || (requiredAction === 'tap' && !['tap', 'touch'].includes(action))) {
    return res.status(400).json({ error: `Perform a ${requiredAction} gesture to unlock` });
  }
  await run('INSERT OR REPLACE INTO message_unlocks (message_id, user_id) VALUES (?, ?)', [message.id, req.user.id]);
  res.json({ unlocked: true, filter: metadata.secretFilter?.type || null });
});

app.get('/api/albums', authMiddleware, async (req, res) => {
  const albums = await all(
    `SELECT albums.id, albums.name, albums.theme, albums.owner_id, owners.username AS owner_username
     FROM albums
     JOIN users AS owners ON owners.id = albums.owner_id
     WHERE albums.owner_id = ? OR albums.id IN (SELECT album_id FROM album_members WHERE user_id = ?)
     ORDER BY albums.created_at DESC`,
    [req.user.id, req.user.id],
  );
  const albumIds = albums.map((album) => album.id);
  const members = albumIds.length
    ? await all(
        `SELECT album_members.album_id, users.username, users.display_name, album_members.role
         FROM album_members
         JOIN users ON users.id = album_members.user_id
         WHERE album_members.album_id IN (${albumIds.map(() => '?').join(',')})`,
        albumIds,
      )
    : [];
  const groupedMembers = members.reduce((acc, entry) => {
    if (!acc[entry.album_id]) acc[entry.album_id] = [];
    acc[entry.album_id].push({ username: entry.username, displayName: entry.display_name, role: entry.role });
    return acc;
  }, {});
  res.json({
    albums: albums.map((album) => ({
      id: album.id,
      name: album.name,
      theme: album.theme,
      owner: album.owner_username,
      members: groupedMembers[album.id] || [],
    })),
  });
});

app.post('/api/albums', authMiddleware, async (req, res) => {
  const { name, theme, members = [] } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Name required' });
  const result = await run('INSERT INTO albums (owner_id, name, theme) VALUES (?, ?, ?)', [req.user.id, name, theme || 'default']);
  await run('INSERT OR REPLACE INTO album_members (album_id, user_id, role) VALUES (?, ?, ?)', [result.lastID, req.user.id, 'owner']);
  for (const username of members) {
    const user = await get('SELECT id FROM users WHERE username = ?', [username.toLowerCase()]);
    if (user) {
      await run('INSERT OR IGNORE INTO album_members (album_id, user_id, role) VALUES (?, ?, ?)', [result.lastID, user.id, 'viewer']);
    }
  }
  await recordTrail(req.user.id, 'album-create');
  res.json({ success: true, id: result.lastID });
});

app.post('/api/albums/:id/invite', authMiddleware, async (req, res) => {
  const album = await get('SELECT * FROM albums WHERE id = ?', [req.params.id]);
  if (!album) return res.status(404).json({ error: 'Album not found' });
  if (album.owner_id !== req.user.id) return res.status(403).json({ error: 'Only owners can invite' });
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'Username required' });
  const user = await get('SELECT id FROM users WHERE username = ?', [username.toLowerCase()]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  await run('INSERT OR IGNORE INTO album_members (album_id, user_id, role) VALUES (?, ?, ?)', [album.id, user.id, 'viewer']);
  res.json({ success: true });
});

app.post('/api/albums/:id/items', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Missing file' });
  const album = await get('SELECT * FROM albums WHERE id = ?', [req.params.id]);
  if (!album) return res.status(404).json({ error: 'Album not found' });
  const member = await get('SELECT role FROM album_members WHERE album_id = ? AND user_id = ?', [album.id, req.user.id]);
  if (!member) return res.status(403).json({ error: 'Not part of album' });
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const key = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(req.file.buffer, null, null, nonce, key);
  const payload = {
    key: sodium.to_base64(key),
    data: sodium.to_base64(ciphertext),
  };
  await run(
    'INSERT INTO album_items (album_id, uploader_id, ciphertext, nonce, description) VALUES (?, ?, ?, ?, ?)',
    [album.id, req.user.id, JSON.stringify(payload), sodium.to_base64(nonce), req.body.description || ''],
  );
  await recordTrail(req.user.id, 'album-upload');
  res.json({ success: true });
});

app.get('/api/albums/:id', authMiddleware, async (req, res) => {
  const album = await get(
    `SELECT albums.*, owners.username AS owner_username
     FROM albums
     JOIN users AS owners ON owners.id = albums.owner_id
     WHERE albums.id = ?`,
    [req.params.id],
  );
  if (!album) return res.status(404).json({ error: 'Album not found' });
  const member = await get('SELECT role FROM album_members WHERE album_id = ? AND user_id = ?', [album.id, req.user.id]);
  if (!member && album.owner_id !== req.user.id) return res.status(403).json({ error: 'Not part of album' });
  const items = await all(
    `SELECT album_items.*, users.username AS uploader_username
     FROM album_items
     JOIN users ON users.id = album_items.uploader_id
     WHERE album_items.album_id = ?
     ORDER BY album_items.created_at DESC`,
    [album.id],
  );
  res.json({
    album: {
      id: album.id,
      name: album.name,
      theme: album.theme,
      owner: album.owner_username,
    },
    items: items.map((item) => ({
      id: item.id,
      uploader: item.uploader_username,
      nonce: item.nonce,
      description: item.description,
      createdAt: item.created_at,
      ciphertext: item.ciphertext,
    })),
  });
});

app.get('/api/constellations', authMiddleware, async (req, res) => {
  const constellations = await getConstellationsSnapshot();
  res.json({ constellations });
});

app.post('/api/constellations', authMiddleware, async (req, res) => {
  const { name, style, links = [] } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Name required' });
  const result = await run('INSERT INTO constellations (owner_id, name, style) VALUES (?, ?, ?)', [req.user.id, name, style || 'default']);
  for (const entry of links) {
    if (!entry?.from || !entry?.to) continue;
    const fromUser = await get('SELECT id FROM users WHERE username = ?', [entry.from.toLowerCase()]);
    const toUser = await get('SELECT id FROM users WHERE username = ?', [entry.to.toLowerCase()]);
    if (fromUser && toUser) {
      await run('INSERT OR IGNORE INTO constellation_links (constellation_id, from_user, to_user) VALUES (?, ?, ?)', [result.lastID, fromUser.id, toUser.id]);
    }
  }
  await recordTrail(req.user.id, 'constellation-create');
  broadcastPresence();
  res.json({ success: true, id: result.lastID });
});

app.post('/api/constellations/:id/links', authMiddleware, async (req, res) => {
  const constellation = await get('SELECT * FROM constellations WHERE id = ?', [req.params.id]);
  if (!constellation) return res.status(404).json({ error: 'Constellation not found' });
  if (constellation.owner_id !== req.user.id) return res.status(403).json({ error: 'Only owners can modify links' });
  const { from, to } = req.body || {};
  if (!from || !to) return res.status(400).json({ error: 'from/to required' });
  const fromUser = await get('SELECT id FROM users WHERE username = ?', [from.toLowerCase()]);
  const toUser = await get('SELECT id FROM users WHERE username = ?', [to.toLowerCase()]);
  if (!fromUser || !toUser) return res.status(404).json({ error: 'Users not found' });
  await run('INSERT OR IGNORE INTO constellation_links (constellation_id, from_user, to_user) VALUES (?, ?, ?)', [constellation.id, fromUser.id, toUser.id]);
  broadcastPresence();
  res.json({ success: true });
});

app.delete('/api/constellations/:id/links', authMiddleware, async (req, res) => {
  const constellation = await get('SELECT * FROM constellations WHERE id = ?', [req.params.id]);
  if (!constellation) return res.status(404).json({ error: 'Constellation not found' });
  if (constellation.owner_id !== req.user.id) return res.status(403).json({ error: 'Only owners can modify links' });
  const { from, to } = req.body || {};
  if (!from || !to) return res.status(400).json({ error: 'from/to required' });
  const fromUser = await get('SELECT id FROM users WHERE username = ?', [from.toLowerCase()]);
  const toUser = await get('SELECT id FROM users WHERE username = ?', [to.toLowerCase()]);
  if (!fromUser || !toUser) return res.status(404).json({ error: 'Users not found' });
  await run('DELETE FROM constellation_links WHERE constellation_id = ? AND from_user = ? AND to_user = ?', [constellation.id, fromUser.id, toUser.id]);
  broadcastPresence();
  res.json({ success: true });
});

app.get('/api/secret-links', authMiddleware, async (req, res) => {
  const links = await all('SELECT * FROM secret_links WHERE owner_id = ? ORDER BY created_at DESC', [req.user.id]);
  res.json({
    links: links.map((link) => ({
      id: link.id,
      label: link.label,
      cipher: link.cipher,
      nonce: link.nonce,
      sealedKeys: (() => {
        if (!link.sealed_keys) return null;
        try {
          return JSON.parse(link.sealed_keys);
        } catch (error) {
          console.warn('Unable to parse sealed_keys payload for secret link', link.id, error);
          return null;
        }
      })(),
      audience: link.audience ? JSON.parse(link.audience) : [],
      expiresAt: link.expires_at,
      createdAt: link.created_at,
    })),
  });
});

app.post('/api/secret-links', authMiddleware, async (req, res) => {
  const { label, cipher, nonce, audience = [], expiresAt } = req.body || {};
  let sealedKeys = null;
  let resolvedCipher = cipher;
  if (cipher && typeof cipher === 'object') {
    if (!cipher.ciphertext || !cipher.sealedKeys) {
      return res.status(400).json({ error: 'cipher payload malformed' });
    }
    resolvedCipher = cipher.ciphertext;
    sealedKeys = cipher.sealedKeys;
  }
  if (!label || !resolvedCipher || !nonce) {
    return res.status(400).json({ error: 'label, cipher and nonce are required' });
  }
  const result = await run(
    'INSERT INTO secret_links (owner_id, label, cipher, nonce, sealed_keys, audience, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      req.user.id,
      label,
      resolvedCipher,
      nonce,
      sealedKeys ? JSON.stringify(sealedKeys) : null,
      JSON.stringify(audience),
      expiresAt || null,
    ],
  );
  await recordTrail(req.user.id, 'secret-link');
  broadcastPresence();
  res.json({ success: true, id: result.lastID });
});

app.delete('/api/secret-links/:id', authMiddleware, async (req, res) => {
  await run('DELETE FROM secret_links WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
  broadcastPresence();
  res.json({ success: true });
});

function initialGameState(type, creatorUsername, opponentUsername) {
  if (type === 'tic-tac-toe') {
    return {
      type,
      board: Array(9).fill(null),
      turn: 'X',
      players: { X: creatorUsername, O: opponentUsername },
      moves: [],
      winner: null,
    };
  }
  if (type === 'trivia') {
    return {
      type,
      prompt: 'First to answer wins. Answer with /buzz',
      buzzed: null,
      history: [],
    };
  }
  return { type, state: {}, createdAt: new Date().toISOString() };
}

function determineWinner(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return board.every((cell) => cell) ? 'draw' : null;
}

app.get('/api/games', authMiddleware, async (req, res) => {
  const games = await all(
    `SELECT chat_games.*, creator.username AS creator_username, opponent.username AS opponent_username
     FROM chat_games
     JOIN users AS creator ON creator.id = chat_games.creator_id
     JOIN users AS opponent ON opponent.id = chat_games.opponent_id
     WHERE creator_id = ? OR opponent_id = ?
     ORDER BY chat_games.updated_at DESC`,
    [req.user.id, req.user.id],
  );
  res.json({
    games: games.map((game) => ({
      id: game.id,
      type: game.type,
      status: game.status,
      state: parseMetadata(game.state),
      creator: game.creator_username,
      opponent: game.opponent_username,
      updatedAt: game.updated_at,
    })),
  });
});

app.post('/api/games', authMiddleware, async (req, res) => {
  const { opponent, type = 'tic-tac-toe' } = req.body || {};
  if (!opponent) return res.status(400).json({ error: 'opponent required' });
  const opponentUser = await get('SELECT id, username FROM users WHERE username = ?', [opponent.toLowerCase()]);
  if (!opponentUser) return res.status(404).json({ error: 'Opponent not found' });
  const initialState = initialGameState(type, req.user.username, opponentUser.username);
  const result = await run(
    'INSERT INTO chat_games (type, creator_id, opponent_id, state) VALUES (?, ?, ?, ?)',
    [type, req.user.id, opponentUser.id, JSON.stringify(initialState)],
  );
  await recordTrail(req.user.id, 'game-start');
  notifyGame(opponentUser.id, { id: result.lastID, type, state: initialState });
  res.json({ success: true, id: result.lastID, state: initialState });
});

app.get('/api/games/:id', authMiddleware, async (req, res) => {
  const game = await get(
    `SELECT chat_games.*, creator.username AS creator_username, opponent.username AS opponent_username
     FROM chat_games
     JOIN users AS creator ON creator.id = chat_games.creator_id
     JOIN users AS opponent ON opponent.id = chat_games.opponent_id
     WHERE chat_games.id = ?`,
    [req.params.id],
  );
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (![game.creator_id, game.opponent_id].includes(req.user.id)) return res.status(403).json({ error: 'Forbidden' });
  res.json({
    id: game.id,
    type: game.type,
    status: game.status,
    creator: game.creator_username,
    opponent: game.opponent_username,
    state: parseMetadata(game.state),
  });
});

app.post('/api/games/:id/move', authMiddleware, async (req, res) => {
  const game = await get('SELECT * FROM chat_games WHERE id = ?', [req.params.id]);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (![game.creator_id, game.opponent_id].includes(req.user.id)) return res.status(403).json({ error: 'Forbidden' });
  const state = parseMetadata(game.state);
  if (game.status !== 'active') return res.status(400).json({ error: 'Game finished' });
  const { move } = req.body || {};
  if (state.type === 'tic-tac-toe') {
    const symbol = state.players.X === req.user.username ? 'X' : 'O';
    if (state.turn !== symbol) return res.status(400).json({ error: 'Not your turn' });
    const index = Number(move);
    if (Number.isNaN(index) || index < 0 || index > 8) return res.status(400).json({ error: 'Invalid move' });
    if (state.board[index]) return res.status(400).json({ error: 'Spot taken' });
    state.board[index] = symbol;
    state.moves.push({ by: req.user.username, index });
    const winner = determineWinner(state.board);
    if (winner) {
      state.winner = winner === 'draw' ? null : winner;
      game.status = winner === 'draw' ? 'draw' : 'finished';
    } else {
      state.turn = symbol === 'X' ? 'O' : 'X';
    }
  } else if (state.type === 'trivia') {
    if (move === '/buzz' && !state.buzzed) {
      state.buzzed = req.user.username;
      state.history.push({ action: 'buzz', by: req.user.username, at: new Date().toISOString() });
    } else if (state.buzzed === req.user.username) {
      state.history.push({ action: 'answer', by: req.user.username, text: move, at: new Date().toISOString() });
      game.status = 'finished';
      state.winner = req.user.username;
    } else {
      state.history.push({ action: 'chat', by: req.user.username, text: move, at: new Date().toISOString() });
    }
  }
  await run('UPDATE chat_games SET state = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [JSON.stringify(state), game.status, game.id]);
  const opponentId = game.creator_id === req.user.id ? game.opponent_id : game.creator_id;
  await recordTrail(req.user.id, 'game-move');
  notifyGame(opponentId, { id: game.id, state, status: game.status });
  res.json({ success: true, state, status: game.status });
});

app.get('/api/qr/treasure', authMiddleware, async (req, res) => {
  const treasures = await all('SELECT * FROM qr_treasures ORDER BY created_at DESC');
  const claims = await all('SELECT treasure_id FROM qr_claims WHERE user_id = ?', [req.user.id]);
  const claimSet = new Set(claims.map((claim) => claim.treasure_id));
  res.json({
    hunts: treasures.map((treasure) => ({
      id: treasure.id,
      hint: treasure.hint,
      expiresAt: treasure.expires_at,
      creatorId: treasure.creator_id,
      claimed: claimSet.has(treasure.id),
      payload: treasure.creator_id === req.user.id || claimSet.has(treasure.id) ? treasure.payload : null,
    })),
  });
});

app.post('/api/qr/treasure', authMiddleware, async (req, res) => {
  const { code, hint, payload, expiresAt } = req.body || {};
  if (!code || !payload) return res.status(400).json({ error: 'code and payload required' });
  const hashed = crypto.createHash('sha256').update(code).digest('hex');
  const result = await run('INSERT INTO qr_treasures (creator_id, code, hint, payload, expires_at) VALUES (?, ?, ?, ?, ?)', [req.user.id, hashed, hint || '', payload, expiresAt || null]);
  await recordTrail(req.user.id, 'treasure-create');
  res.json({ success: true, id: result.lastID });
});

app.post('/api/qr/treasure/claim', authMiddleware, async (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'code required' });
  const hashed = crypto.createHash('sha256').update(code).digest('hex');
  const treasure = await get('SELECT * FROM qr_treasures WHERE code = ?', [hashed]);
  if (!treasure) return res.status(404).json({ error: 'Treasure not found' });
  if (treasure.expires_at && new Date(treasure.expires_at).getTime() < Date.now()) {
    return res.status(410).json({ error: 'Treasure expired' });
  }
  await run('INSERT OR IGNORE INTO qr_claims (treasure_id, user_id) VALUES (?, ?)', [treasure.id, req.user.id]);
  await recordTrail(req.user.id, 'treasure-claim');
  res.json({ success: true, payload: treasure.payload });
});

app.get('/api/qr/me', authMiddleware, async (req, res) => {
  const url = `enclypse:${req.user.username}`;
  const buffer = await QRCode.toBuffer(url, { width: 320, margin: 1 });
  res.setHeader('Content-Type', 'image/png');
  res.send(buffer);
});

app.get('/api/qr/:username', async (req, res) => {
  const buffer = await QRCode.toBuffer(`enclypse:${req.params.username.toLowerCase()}`, { width: 320, margin: 1 });
  res.setHeader('Content-Type', 'image/png');
  res.send(buffer);
});

app.use('/enclypse', express.static(path.resolve(__dirname, '../frontend')));

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Enclypse backend listening on http://localhost:${PORT}`);
});

wss.on('connection', async (socket, req) => {
  const url = new URL(req.url, 'http://localhost');
  const token = url.searchParams.get('token');
  const session = await authenticateToken(token);
  if (!session) {
    socket.close();
    return;
  }
  const entry = onlineUsers.get(session.user_id) || { username: session.username, displayName: session.display_name, sockets: new Set() };
  entry.sockets.add(socket);
  onlineUsers.set(session.user_id, entry);
  await recordTrail(session.user_id, 'online');
  broadcastPresence();

  socket.on('close', async () => {
    const updated = onlineUsers.get(session.user_id);
    if (!updated) return;
    updated.sockets.delete(socket);
    if (!updated.sockets.size) {
      onlineUsers.delete(session.user_id);
    }
    await recordTrail(session.user_id, 'offline');
    broadcastPresence();
  });
});

function notifyMessage(userId, payload) {
  const entry = onlineUsers.get(userId);
  if (!entry) return;
  entry.sockets.forEach((socket) => safeSend(socket, { type: 'message:new', payload }));
}

function notifyGame(userId, payload) {
  const entry = onlineUsers.get(userId);
  if (!entry) return;
  entry.sockets.forEach((socket) => safeSend(socket, { type: 'game:update', payload }));
}
