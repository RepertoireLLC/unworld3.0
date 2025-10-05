import { URL } from 'node:url';
import {
  createMessage,
  ensureConversation,
  getConversationById,
  getMessages,
  getReadReceipt,
  listConversationsForUser,
  listUsers,
  markRead,
  setUserPresence,
  upsertUser,
} from './chatService.js';

const OK = 200;
const CREATED = 201;
const NO_CONTENT = 204;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const METHOD_NOT_ALLOWED = 405;
const INTERNAL_ERROR = 500;

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload ?? {});
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  });
  res.end(body);
}

function sendEmpty(res, status) {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  });
  res.end();
}

async function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 5 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

export function createHttpRouter({ gateway }) {
  return async function handler(req, res) {
    if (!req.url) {
      sendJson(res, BAD_REQUEST, { message: 'Missing URL' });
      return;
    }
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'OPTIONS') {
      sendEmpty(res, NO_CONTENT);
      return;
    }

    try {
      if (req.method === 'GET' && requestUrl.pathname === '/health') {
        sendJson(res, OK, { status: 'ok', timestamp: Date.now() });
        return;
      }

      if (req.method === 'GET' && requestUrl.pathname === '/api/users') {
        const users = listUsers();
        sendJson(res, OK, { users });
        return;
      }

      if (req.method === 'PUT' && requestUrl.pathname.startsWith('/api/users/')) {
        const id = requestUrl.pathname.split('/').pop();
        if (!id) {
          sendJson(res, BAD_REQUEST, { message: 'Invalid user id' });
          return;
        }
        const body = await readJson(req);
        const user = upsertUser({ id, ...body });
        sendJson(res, OK, { user });
        return;
      }

      if (req.method === 'POST' && requestUrl.pathname === '/api/users/presence') {
        const body = await readJson(req);
        if (!body?.userId || !body?.presence) {
          sendJson(res, BAD_REQUEST, { message: 'userId and presence are required' });
          return;
        }
        const user = setUserPresence(body.userId, body.presence, body.lastSeen ?? null);
        gateway.notifyPresence(user);
        sendJson(res, OK, { user });
        return;
      }

      if (req.method === 'GET' && requestUrl.pathname === '/api/conversations') {
        const userId = requestUrl.searchParams.get('userId');
        if (!userId) {
          sendJson(res, BAD_REQUEST, { message: 'userId is required' });
          return;
        }
        const limit = Math.min(Math.max(Number(requestUrl.searchParams.get('limit')) || 20, 1), 50);
        const cursor = requestUrl.searchParams.has('cursor')
          ? Number(requestUrl.searchParams.get('cursor'))
          : Number.MAX_SAFE_INTEGER;
        const result = listConversationsForUser({ userId, limit, cursor });
        sendJson(res, OK, result);
        return;
      }

      if (req.method === 'POST' && requestUrl.pathname === '/api/conversations') {
        const body = await readJson(req);
        const memberIds = Array.isArray(body?.memberIds) ? body.memberIds : [];
        if (memberIds.length < 2) {
          sendJson(res, BAD_REQUEST, { message: 'memberIds must include at least two ids' });
          return;
        }
        const conversation = ensureConversation({
          memberIds,
          title: body?.title ?? null,
          isDirect: body?.isDirect ?? false,
        });
        gateway.notifyConversation(conversation.id);
        sendJson(res, CREATED, { conversation });
        return;
      }

      if (req.method === 'GET' && requestUrl.pathname.startsWith('/api/conversations/')) {
        const [, , conversationId, resource] = requestUrl.pathname.split('/');
        if (!conversationId) {
          sendJson(res, BAD_REQUEST, { message: 'conversationId is required' });
          return;
        }
        if (resource === 'messages') {
          const limit = Math.min(Math.max(Number(requestUrl.searchParams.get('limit')) || 20, 1), 50);
          const before = requestUrl.searchParams.has('before')
            ? Number(requestUrl.searchParams.get('before'))
            : Number.MAX_SAFE_INTEGER;
          const messages = getMessages({ conversationId, limit, before });
          sendJson(res, OK, {
            messages,
            previousCursor: messages.length ? messages[0].createdAt : null,
          });
          return;
        }
        if (!resource) {
          const conversation = getConversationById(conversationId);
          if (!conversation) {
            sendJson(res, NOT_FOUND, { message: 'Conversation not found' });
            return;
          }
          sendJson(res, OK, { conversation });
          return;
        }
      }

      if (req.method === 'POST' && requestUrl.pathname === '/api/messages') {
        const body = await readJson(req);
        if (!body?.conversationId && !Array.isArray(body?.recipientIds)) {
          sendJson(res, BAD_REQUEST, { message: 'conversationId or recipientIds are required' });
          return;
        }
        if (!body?.senderId) {
          sendJson(res, BAD_REQUEST, { message: 'senderId is required' });
          return;
        }
        const trimmed = body?.body?.trim();
        if (!trimmed) {
          sendJson(res, BAD_REQUEST, { message: 'body is required' });
          return;
        }
        let conversationId = body.conversationId ?? null;
        if (!conversationId) {
          const members = [...new Set([body.senderId, ...body.recipientIds])];
          const conversation = ensureConversation({ memberIds: members, isDirect: true });
          conversationId = conversation.id;
        }
        const message = createMessage({
          conversationId,
          senderId: body.senderId,
          body: trimmed,
          clientMessageId: body?.clientMessageId ?? null,
        });
        gateway.notifyMessage(message, conversationId);
        gateway.notifyConversation(conversationId);
        sendJson(res, CREATED, { message });
        return;
      }

      if (req.method === 'POST' && requestUrl.pathname === '/api/read-receipts') {
        const body = await readJson(req);
        if (!body?.conversationId || !body?.userId) {
          sendJson(res, BAD_REQUEST, { message: 'conversationId and userId are required' });
          return;
        }
        markRead({
          conversationId: body.conversationId,
          userId: body.userId,
          messageId: body?.messageId ?? null,
        });
        const receipt = getReadReceipt(body.conversationId, body.userId);
        gateway.notifyRead(receipt);
        sendJson(res, OK, { receipt });
        return;
      }

      sendJson(res, METHOD_NOT_ALLOWED, { message: 'Route not found' });
    } catch (error) {
      sendJson(res, INTERNAL_ERROR, { message: error.message ?? 'Unexpected server error' });
    }
  };
}
