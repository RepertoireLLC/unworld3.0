import type { ApiUser, AuthResponse, FriendRequest, Message, Story } from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

interface RequestOptions extends RequestInit {
  token?: string;
  body?: unknown;
}

async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const { token, headers, body, ...rest } = options;
  const requestHeaders = new Headers(headers ?? {});

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  if (!isFormData) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: requestHeaders,
    body: isFormData ? (body as BodyInit) : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const errorData = await response.json();
      if (errorData?.message) {
        message = errorData.message;
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message || 'Request failed');
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export const api = {
  async register(payload: { email: string; password: string; name?: string; color?: string }): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: payload,
    });
  },

  async login(payload: { email: string; password: string }): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: payload,
    });
  },

  async getSession(token: string): Promise<ApiUser> {
    const result = await apiRequest<{ user: ApiUser }>('/auth/session', {
      method: 'GET',
      token,
    });
    return result.user;
  },

  async logout(token: string): Promise<void> {
    await apiRequest<null>('/auth/logout', {
      method: 'POST',
      token,
    });
  },

  async getUsers(token: string): Promise<ApiUser[]> {
    return apiRequest<ApiUser[]>('/users', {
      method: 'GET',
      token,
    });
  },

  async updateProfile(
    token: string,
    userId: string,
    updates: Partial<Pick<ApiUser, 'name' | 'color' | 'bio' | 'profilePicture'>>,
  ): Promise<ApiUser> {
    return apiRequest<ApiUser>(`/users/${userId}`, {
      method: 'PATCH',
      token,
      body: updates,
    });
  },

  async getFriendRequests(token: string): Promise<FriendRequest[]> {
    return apiRequest<FriendRequest[]>('/friends/requests', {
      method: 'GET',
      token,
    });
  },

  async sendFriendRequest(token: string, toUserId: string): Promise<FriendRequest> {
    return apiRequest<FriendRequest>('/friends/requests', {
      method: 'POST',
      token,
      body: { toUserId },
    });
  },

  async respondToFriendRequest(token: string, requestId: string, action: 'accept' | 'reject'): Promise<FriendRequest> {
    return apiRequest<FriendRequest>(`/friends/requests/${requestId}/respond`, {
      method: 'POST',
      token,
      body: { action },
    });
  },

  async getMessages(token: string, userId: string): Promise<Message[]> {
    return apiRequest<Message[]>(`/chats/${userId}`, {
      method: 'GET',
      token,
    });
  },

  async sendMessage(token: string, userId: string, content: string): Promise<Message> {
    return apiRequest<Message>(`/chats/${userId}/messages`, {
      method: 'POST',
      token,
      body: { content },
    });
  },

  async getStories(token: string): Promise<Story[]> {
    return apiRequest<Story[]>('/stories', {
      method: 'GET',
      token,
    });
  },

  async createStory(token: string, payload: { content: string; image?: string }): Promise<Story> {
    return apiRequest<Story>('/stories', {
      method: 'POST',
      token,
      body: payload,
    });
  },

  async deleteStory(token: string, storyId: string): Promise<void> {
    await apiRequest<null>(`/stories/${storyId}`, {
      method: 'DELETE',
      token,
    });
  },
};
