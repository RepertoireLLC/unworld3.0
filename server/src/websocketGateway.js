import { createHash } from 'node:crypto';
import { URL } from 'node:url';
import {
  ensureConversation,
  createMessage,
  getConversationById,
  getConversationMemberIds,
  getMessages,
  getReadReceipt,
  listUsers,
  markRead,
  setUserPresence,
  upsertUser,
} from './chatService.js';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

class WebSocketConnection {
  constructor(socket) {
    this.socket = socket;
    this.userId = null;
    this.buffer = Buffer.alloc(0);
    this.alive = true;
    this.listeners = new Set();

    socket.on('data', (chunk) => this.#onData(chunk));
    socket.on('close', () => this.#onClose());
    socket.on('error', () => this.#onClose());
  }

  #onClose() {
    this.alive = false;
    this.listeners.forEach((listener) => listener('close'));
  }

  on(event, listener) {
    this.listeners.add((evt) => {
      if (evt === event) {
        listener();
      }
    });
  }

  send(type, payload) {
    if (!this.alive) return;
    const data = JSON.stringify({ type, payload });
    const frame = encodeFrame(Buffer.from(data));
    this.socket.write(frame);
  }

  close() {
    if (!this.alive) return;
    const frame = encodeFrame(Buffer.alloc(0), { opcode: 0x8 });
    this.socket.end(frame);
    this.alive = false;
  }

  #emit(event, payload) {
    this.listeners.forEach((listener) => listener(event, payload));
  }

  #onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const frame = decodeFrame(this.buffer);
      if (!frame) {
        break;
      }
      this.buffer = this.buffer.slice(frame.consumedBytes);
      if (frame.opcode === 0x8) {
        this.close();
        break;
      }
      if (frame.opcode === 0x9) {
        // Ping
        this.socket.write(encodeFrame(frame.payload, { opcode: 0xA }));
        continue;
      }
      if (frame.opcode !== 0x1) {
        continue;
      }
      try {
        const message = JSON.parse(frame.payload.toString('utf-8'));
        this.#emit('message', message);
      } catch (err) {
        this.send('error', { message: 'Invalid payload' });
      }
    }
  }
}

function encodeFrame(payload, { opcode = 0x1 } = {}) {
  const payloadLength = payload.length;
  let headerLength = 2;
  if (payloadLength >= 126 && payloadLength < 65536) {
    headerLength += 2;
  } else if (payloadLength >= 65536) {
    headerLength += 8;
  }
  const frame = Buffer.alloc(headerLength + payloadLength);
  frame[0] = 0x80 | (opcode & 0x0f);
  if (payloadLength < 126) {
    frame[1] = payloadLength;
  } else if (payloadLength < 65536) {
    frame[1] = 126;
    frame.writeUInt16BE(payloadLength, 2);
  } else {
    frame[1] = 127;
    const big = BigInt(payloadLength);
    frame.writeBigUInt64BE(big, 2);
  }
  payload.copy(frame, headerLength);
  return frame;
}

function decodeFrame(buffer) {
  if (buffer.length < 2) {
    return null;
  }
  const firstByte = buffer[0];
  const opcode = firstByte & 0x0f;
  const secondByte = buffer[1];
  const isMasked = (secondByte & 0x80) === 0x80;
  let payloadLength = secondByte & 0x7f;
  let offset = 2;
  if (payloadLength === 126) {
    if (buffer.length < 4) {
      return null;
    }
    payloadLength = buffer.readUInt16BE(2);
    offset = 4;
  } else if (payloadLength === 127) {
    if (buffer.length < 10) {
      return null;
    }
    payloadLength = Number(buffer.readBigUInt64BE(2));
    offset = 10;
  }
  let maskingKey;
  if (isMasked) {
    if (buffer.length < offset + 4) {
      return null;
    }
    maskingKey = buffer.slice(offset, offset + 4);
    offset += 4;
  }
  if (buffer.length < offset + payloadLength) {
    return null;
  }
  const payload = buffer.slice(offset, offset + payloadLength);
  let unmasked = payload;
  if (isMasked && maskingKey) {
    unmasked = Buffer.alloc(payloadLength);
    for (let i = 0; i < payloadLength; i += 1) {
      unmasked[i] = payload[i] ^ maskingKey[i % 4];
    }
  }
  return {
    fin: (firstByte & 0x80) === 0x80,
    opcode,
    payload: unmasked,
    consumedBytes: offset + payloadLength,
  };
}

export function createWebSocketGateway() {
  const connections = new Set();
  const connectionsByUser = new Map();

  function broadcast(event, recipients = null) {
    connections.forEach((connection) => {
      if (!connection.alive) {
        return;
      }
      if (recipients && (!connection.userId || !recipients.includes(connection.userId))) {
        return;
      }
      connection.send(event.type, event.payload);
    });
  }

  function notifyPresence(user) {
    broadcast({ type: 'presence:update', payload: user });
  }

  function notifyMessage(message, conversationId) {
    const memberIds = getConversationMemberIds(conversationId);
    const conversation = getConversationById(conversationId);
    broadcast(
      {
        type: 'message:new',
        payload: {
          message,
          conversation,
        },
      },
      memberIds
    );
  }

  function notifyRead(payload) {
    const memberIds = getConversationMemberIds(payload.conversationId);
    broadcast(
      {
        type: 'read:update',
        payload,
      },
      memberIds
    );
  }

  function notifyConversation(conversationId) {
    const conversation = getConversationById(conversationId);
    if (!conversation) return;
    const memberIds = conversation.members.map((member) => member.id);
    broadcast(
      {
        type: 'conversation:updated',
        payload: conversation,
      },
      memberIds
    );
  }

  function attach(server) {
    server.on('upgrade', (req, socket) => {
      const { url } = req;
      if (!url) {
        socket.destroy();
        return;
      }
      const requestUrl = new URL(url, `http://${req.headers.host}`);
      if (requestUrl.pathname !== '/ws') {
        socket.destroy();
        return;
      }
      const key = req.headers['sec-websocket-key'];
      if (!key) {
        socket.destroy();
        return;
      }
      const accept = createHash('sha1')
        .update(key + GUID)
        .digest('base64');
      const headers = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${accept}`,
      ];
      socket.write(headers.concat('\r\n').join('\r\n'));
      const connection = new WebSocketConnection(socket);
      connections.add(connection);
      connection.listeners.add((event, payload) => {
        if (event === 'close') {
          handleDisconnect(connection);
        } else if (event === 'message') {
          handleMessage(connection, payload);
        }
      });
    });
  }

  function handleDisconnect(connection) {
    connections.delete(connection);
    if (connection.userId) {
      const set = connectionsByUser.get(connection.userId);
      if (set) {
        set.delete(connection);
        if (set.size === 0) {
          connectionsByUser.delete(connection.userId);
          const user = setUserPresence(connection.userId, 'offline', Date.now());
          notifyPresence(user);
        }
      }
    }
  }

  function handleMessage(connection, message) {
    if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
      connection.send('error', { message: 'Malformed event' });
      return;
    }
    const { type, payload } = message;
    try {
      switch (type) {
        case 'identify': {
          if (!payload?.userId) {
            throw new Error('userId is required for identify');
          }
          connection.userId = payload.userId;
          if (!connectionsByUser.has(connection.userId)) {
            connectionsByUser.set(connection.userId, new Set());
          }
          connectionsByUser.get(connection.userId).add(connection);
          const user = upsertUser({ id: payload.userId, name: payload.name, color: payload.color });
          const presence = setUserPresence(payload.userId, 'online', null);
          connection.send('session:ready', {
            user,
            serverTime: Date.now(),
            users: listUsers(),
          });
          notifyPresence(presence);
          break;
        }
        case 'message:send': {
          if (!connection.userId) {
            throw new Error('Authenticate before sending messages');
          }
          const body = payload?.body?.trim();
          if (!body) {
            throw new Error('Message body is required');
          }
          let conversationId = payload?.conversationId ?? null;
          if (!conversationId) {
            const recipientIds = Array.isArray(payload?.recipientIds) ? payload.recipientIds : [];
            const members = [...new Set([connection.userId, ...recipientIds])];
            const conversation = ensureConversation({ memberIds: members, isDirect: true });
            conversationId = conversation.id;
          }
          const messageRecord = createMessage({
            conversationId,
            senderId: connection.userId,
            body,
            clientMessageId: payload?.clientMessageId ?? null,
          });
          notifyMessage(messageRecord, conversationId);
          connection.send('message:ack', {
            clientMessageId: payload?.clientMessageId ?? null,
            message: messageRecord,
          });
          notifyConversation(conversationId);
          break;
        }
        case 'read:mark': {
          if (!connection.userId) {
            throw new Error('Authenticate before marking read');
          }
          if (!payload?.conversationId) {
            throw new Error('conversationId is required');
          }
          markRead({
            conversationId: payload.conversationId,
            userId: connection.userId,
            messageId: payload?.messageId ?? null,
          });
          const receipt = getReadReceipt(payload.conversationId, connection.userId);
          notifyRead(receipt);
          break;
        }
        case 'history:request': {
          if (!connection.userId) {
            throw new Error('Authenticate before requesting history');
          }
          if (!payload?.conversationId) {
            throw new Error('conversationId is required');
          }
          const limit = Math.min(Math.max(Number(payload?.limit) || 20, 1), 50);
          const before = payload?.before ? Number(payload.before) : Number.MAX_SAFE_INTEGER;
          const messages = getMessages({ conversationId: payload.conversationId, limit, before });
          connection.send('history:response', {
            conversationId: payload.conversationId,
            messages,
            previousCursor: messages.length ? messages[0].createdAt : null,
          });
          break;
        }
        default:
          connection.send('error', { message: `Unknown event type: ${type}` });
      }
    } catch (error) {
      connection.send('error', { message: error.message ?? 'Unexpected server error' });
    }
  }

  return {
    attach,
    notifyPresence,
    notifyMessage,
    notifyRead,
    notifyConversation,
  };
}
