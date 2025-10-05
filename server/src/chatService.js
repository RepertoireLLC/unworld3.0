import { randomUUID } from 'node:crypto';
import { db, now } from './db.js';

const conversationSelectBase = `
  SELECT c.id, c.title, c.is_direct as isDirect, c.updated_at as updatedAt, c.created_at as createdAt
  FROM conversations c
  INNER JOIN conversation_members cm ON cm.conversation_id = c.id
  WHERE cm.user_id = @userId
`;

export function upsertUser({ id, name, email, color, bio, profilePicture }) {
  if (!id) {
    throw new Error('User id is required');
  }
  const timestamp = now();
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (existing) {
    db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          color = COALESCE(?, color),
          bio = COALESCE(?, bio),
          profile_picture = COALESCE(?, profile_picture),
          updated_at = ?
      WHERE id = ?
    `).run(name, email, color, bio, profilePicture, timestamp, id);
  } else {
    db.prepare(`
      INSERT INTO users (id, name, email, color, bio, profile_picture, presence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'offline', ?, ?)
    `).run(id, name ?? id, email ?? null, color ?? null, bio ?? null, profilePicture ?? null, timestamp, timestamp);
  }
  return getUserById(id);
}

export function getUserById(id) {
  return db.prepare(`
    SELECT id, name, email, color, bio, profile_picture as profilePicture, presence, last_seen as lastSeen, created_at as createdAt, updated_at as updatedAt
    FROM users
    WHERE id = ?
  `).get(id);
}

export function listUsers() {
  return db.prepare(`
    SELECT id, name, email, color, bio, profile_picture as profilePicture, presence, last_seen as lastSeen, created_at as createdAt, updated_at as updatedAt
    FROM users
    ORDER BY name ASC
  `).all();
}

export function setUserPresence(userId, presence, lastSeen = null) {
  const timestamp = now();
  db.prepare(`
    UPDATE users
    SET presence = ?,
        last_seen = ?,
        updated_at = ?
    WHERE id = ?
  `).run(presence, lastSeen, timestamp, userId);
  return getUserById(userId);
}

export function ensureConversation({ memberIds, title = null, isDirect = false }) {
  if (!Array.isArray(memberIds) || memberIds.length < 2) {
    throw new Error('A conversation requires at least two members');
  }
  const uniqueMembers = [...new Set(memberIds)].sort();
  if (isDirect) {
    const placeholders = uniqueMembers.map(() => '?').join(',');
    const candidate = db.prepare(`
      SELECT c.id
      FROM conversations c
      JOIN conversation_members cm ON cm.conversation_id = c.id
      WHERE c.is_direct = 1 AND cm.user_id IN (${placeholders})
      GROUP BY c.id
      HAVING COUNT(*) = ?
         AND COUNT(*) = (
           SELECT COUNT(*)
           FROM conversation_members cm2
           WHERE cm2.conversation_id = c.id
         )
    `).get(...uniqueMembers, uniqueMembers.length);
    if (candidate) {
      return getConversationById(candidate.id);
    }
  }

  const conversationId = randomUUID();
  const timestamp = now();
  db.prepare(`
    INSERT INTO conversations (id, title, is_direct, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(conversationId, title, isDirect ? 1 : 0, timestamp, timestamp);

  const insertMember = db.prepare(`
    INSERT INTO conversation_members (conversation_id, user_id, role, last_joined_at)
    VALUES (?, ?, 'member', ?)
  `);

  uniqueMembers.forEach((userId) => {
    insertMember.run(conversationId, userId, timestamp);
  });

  return getConversationById(conversationId);
}

export function getConversationById(id) {
  const conversation = db.prepare(`
    SELECT id, title, is_direct as isDirect, created_at as createdAt, updated_at as updatedAt
    FROM conversations
    WHERE id = ?
  `).get(id);
  if (!conversation) return null;
  conversation.members = getConversationMembers(id);
  conversation.lastMessage = getLastMessage(id);
  return conversation;
}

export function getConversationMembers(conversationId) {
  return db.prepare(`
    SELECT u.id, u.name, u.color, u.presence, u.last_seen as lastSeen
    FROM conversation_members cm
    JOIN users u ON u.id = cm.user_id
    WHERE cm.conversation_id = ?
    ORDER BY u.name ASC
  `).all(conversationId);
}

export function getLastMessage(conversationId) {
  return db.prepare(`
    SELECT id, conversation_id as conversationId, sender_id as senderId, body, created_at as createdAt, client_message_id as clientMessageId
    FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(conversationId);
}

export function listConversationsForUser({ userId, limit = 20, cursor = Number.MAX_SAFE_INTEGER }) {
  const rows = db.prepare(`
    ${conversationSelectBase}
      AND c.updated_at < @cursor
    ORDER BY c.updated_at DESC
    LIMIT @limit
  `).all({ userId, limit, cursor });

  const conversations = rows.map((row) => {
    const conversation = {
      id: row.id,
      title: row.title,
      isDirect: !!row.isDirect,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    conversation.members = getConversationMembers(row.id);
    conversation.lastMessage = getLastMessage(row.id);
    conversation.unreadCount = getUnreadCount(row.id, userId);
    return conversation;
  });

  const nextCursor = conversations.length === limit ? conversations[conversations.length - 1].updatedAt : null;
  return { conversations, nextCursor };
}

export function getUnreadCount(conversationId, userId) {
  const lastRead = db.prepare(`
    SELECT m.created_at as createdAt
    FROM read_receipts rr
    JOIN messages m ON m.id = rr.message_id
    WHERE rr.conversation_id = ? AND rr.user_id = ?
  `).get(conversationId, userId);

  if (!lastRead) {
    const countRow = db.prepare(`
      SELECT COUNT(*) as count
      FROM messages
      WHERE conversation_id = ?
    `).get(conversationId);
    return countRow?.count ?? 0;
  }

  const countRow = db.prepare(`
    SELECT COUNT(*) as count
    FROM messages
    WHERE conversation_id = ? AND created_at > ?
  `).get(conversationId, lastRead.createdAt);
  return countRow?.count ?? 0;
}

export function getMessages({ conversationId, limit = 20, before = Number.MAX_SAFE_INTEGER }) {
  return db.prepare(`
    SELECT id, conversation_id as conversationId, sender_id as senderId, body, created_at as createdAt, client_message_id as clientMessageId
    FROM messages
    WHERE conversation_id = ? AND created_at < ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(conversationId, before, limit).reverse();
}

export function createMessage({ conversationId, senderId, body, clientMessageId }) {
  const timestamp = now();
  const id = randomUUID();
  db.prepare(`
    INSERT INTO messages (id, conversation_id, sender_id, body, created_at, client_message_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, conversationId, senderId, body, timestamp, clientMessageId ?? null);

  db.prepare(`
    UPDATE conversations
    SET updated_at = ?
    WHERE id = ?
  `).run(timestamp, conversationId);

  markRead({ conversationId, userId: senderId, messageId: id, readAt: timestamp });

  return {
    id,
    conversationId,
    senderId,
    body,
    createdAt: timestamp,
    clientMessageId: clientMessageId ?? null,
  };
}

export function markRead({ conversationId, userId, messageId, readAt = now() }) {
  db.prepare(`
    INSERT INTO read_receipts (conversation_id, user_id, message_id, read_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(conversation_id, user_id) DO UPDATE SET
      message_id = excluded.message_id,
      read_at = excluded.read_at
  `).run(conversationId, userId, messageId ?? null, readAt);
}

export function getReadReceipt(conversationId, userId) {
  return db.prepare(`
    SELECT conversation_id as conversationId, user_id as userId, message_id as messageId, read_at as readAt
    FROM read_receipts
    WHERE conversation_id = ? AND user_id = ?
  `).get(conversationId, userId);
}

export function getConversationMemberIds(conversationId) {
  return db.prepare(`
    SELECT user_id as userId
    FROM conversation_members
    WHERE conversation_id = ?
  `).all(conversationId).map((row) => row.userId);
}
