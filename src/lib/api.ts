const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

function buildUrl(path: string, query?: Record<string, string | number | null | undefined>) {
  const url = new URL(path, DEFAULT_BASE_URL);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

async function request<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

export interface RemoteUser {
  id: string;
  name: string;
  email?: string;
  color?: string;
  presence: 'online' | 'offline';
  lastSeen?: number | null;
  profilePicture?: string | null;
  bio?: string | null;
}

export interface RemoteMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: number;
  clientMessageId?: string | null;
}

export interface RemoteConversation {
  id: string;
  title: string | null;
  isDirect: boolean;
  createdAt: number;
  updatedAt: number;
  members: Array<Pick<RemoteUser, 'id' | 'name' | 'color' | 'presence' | 'lastSeen'>>;
  lastMessage?: RemoteMessage | null;
  unreadCount: number;
}

export async function apiFetchUsers(): Promise<RemoteUser[]> {
  const data = await request<{ users: RemoteUser[] }>(buildUrl('/api/users'));
  return data.users;
}

export async function apiUpsertUser(user: Partial<RemoteUser> & { id: string }): Promise<RemoteUser> {
  const data = await request<{ user: RemoteUser }>(buildUrl(`/api/users/${user.id}`), {
    method: 'PUT',
    body: JSON.stringify(user),
  });
  return data.user;
}

export async function apiUpdatePresence(payload: { userId: string; presence: 'online' | 'offline'; lastSeen?: number | null }): Promise<RemoteUser> {
  const data = await request<{ user: RemoteUser }>(buildUrl('/api/users/presence'), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.user;
}

export async function apiFetchConversations(params: { userId: string; limit?: number; cursor?: number | null }): Promise<{ conversations: RemoteConversation[]; nextCursor: number | null }> {
  const { userId, limit = 20, cursor = null } = params;
  return request(buildUrl('/api/conversations', {
    userId,
    limit,
    cursor,
  }));
}

export async function apiEnsureConversation(payload: { memberIds: string[]; title?: string | null; isDirect?: boolean }): Promise<RemoteConversation> {
  const data = await request<{ conversation: RemoteConversation }>(buildUrl('/api/conversations'), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.conversation;
}

export async function apiFetchMessages(params: { conversationId: string; limit?: number; before?: number | null }): Promise<{ messages: RemoteMessage[]; previousCursor: number | null }> {
  const { conversationId, limit = 20, before = null } = params;
  return request(buildUrl(`/api/conversations/${conversationId}/messages`, {
    limit,
    before,
  }));
}

export async function apiSendMessage(payload: {
  conversationId?: string;
  recipientIds?: string[];
  senderId: string;
  body: string;
  clientMessageId?: string;
}): Promise<RemoteMessage> {
  const data = await request<{ message: RemoteMessage }>(buildUrl('/api/messages'), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.message;
}

export async function apiSendReadReceipt(payload: { conversationId: string; userId: string; messageId?: string | null }): Promise<void> {
  await request(buildUrl('/api/read-receipts'), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function resolveWebSocketUrl(): string {
  const base = new URL(DEFAULT_BASE_URL);
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  base.pathname = '/ws';
  base.search = '';
  base.hash = '';
  return base.toString();
}
