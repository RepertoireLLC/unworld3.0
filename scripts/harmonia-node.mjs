#!/usr/bin/env node
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.HARMONIA_PORT ?? 8787);
const HOST = process.env.HARMONIA_HOST ?? '0.0.0.0';

const peers = new Map();
const pendingSignals = new Map();

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function prunePeers() {
  const now = Date.now();
  for (const [peerId, peer] of peers.entries()) {
    if (now - peer.lastSeen > 1000 * 60 * 10) {
      peers.delete(peerId);
      pendingSignals.delete(peerId);
    }
  }
}

const server = createServer(async (req, res) => {
  prunePeers();

  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && req.url === '/peers') {
    sendJson(res, 200, {
      peers: Array.from(peers.values()).map((peer) => ({
        peerId: peer.peerId,
        displayName: peer.displayName,
        channels: peer.channels,
        lastSeen: peer.lastSeen,
      })),
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/announce') {
    try {
      const body = await readBody(req);
      const peerId = body.peerId ?? randomUUID();
      const record = {
        peerId,
        displayName: body.displayName ?? peerId,
        channels: Array.isArray(body.channels) ? body.channels : [],
        lastSeen: Date.now(),
      };
      peers.set(peerId, record);
      if (!pendingSignals.has(peerId)) {
        pendingSignals.set(peerId, []);
      }
      sendJson(res, 200, { ok: true, peerId });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message });
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/signal') {
    try {
      const body = await readBody(req);
      const { toPeerId, signals, fromPeerId } = body;
      if (!toPeerId || !Array.isArray(signals)) {
        throw new Error('Invalid payload');
      }
      const queue = pendingSignals.get(toPeerId) ?? [];
      queue.push({
        id: randomUUID(),
        fromPeerId,
        receivedAt: new Date().toISOString(),
        signals,
      });
      pendingSignals.set(toPeerId, queue);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message });
    }
    return;
  }

  if (req.method === 'GET' && req.url?.startsWith('/signal/')) {
    const peerId = req.url.split('/').pop();
    const queue = pendingSignals.get(peerId ?? '') ?? [];
    pendingSignals.set(peerId ?? '', []);
    sendJson(res, 200, { signals: queue });
    return;
  }

  sendJson(res, 404, { ok: false, error: 'Not Found' });
});

server.listen(PORT, HOST, () => {
  console.log(`Harmonia mesh indexer listening on http://${HOST}:${PORT}`);
});
