import crypto from 'node:crypto';
import type { FriendRequest, FriendRequestStatus, Message, PublicUser, Story, User } from '../types';

const STORY_DURATION_MS = 24 * 60 * 60 * 1000;

function now() {
  return Date.now();
}

export class DataStore {
  private users: User[] = [];
  private friendRequests: FriendRequest[] = [];
  private messages: Message[] = [];
  private stories: Story[] = [];
  private sessions = new Map<string, string>();

  constructor() {
    this.seed();
  }

  private seed() {
    if (this.users.length > 0) {
      return;
    }

    const sampleUsers: Array<Pick<User, 'id' | 'email' | 'password' | 'name' | 'color' | 'online' | 'createdAt'>> = [
      {
        id: crypto.randomUUID(),
        email: 'aurora@enclypse.io',
        password: 'enclypse123',
        name: 'Aurora Vega',
        color: '#6366f1',
        online: true,
        createdAt: now(),
      },
      {
        id: crypto.randomUUID(),
        email: 'atlas@enclypse.io',
        password: 'enclypse123',
        name: 'Atlas Monroe',
        color: '#f59e0b',
        online: false,
        createdAt: now(),
      },
      {
        id: crypto.randomUUID(),
        email: 'nova@enclypse.io',
        password: 'enclypse123',
        name: 'Nova Sterling',
        color: '#10b981',
        online: true,
        createdAt: now(),
      },
    ];

    this.users = sampleUsers.map((user) => ({ ...user }));

    // Pre-populate a relationship and a story for flavor
    if (this.users.length >= 2) {
      const [first, second] = this.users;
      this.friendRequests.push({
        id: crypto.randomUUID(),
        fromUserId: first.id,
        toUserId: second.id,
        status: 'accepted',
        createdAt: now() - 60 * 60 * 1000,
        updatedAt: now() - 55 * 60 * 1000,
      });
    }

    const storyteller = this.users[0];
    this.stories.push({
      id: crypto.randomUUID(),
      userId: storyteller.id,
      content: 'Mapping the latest knowledge constellations.',
      createdAt: now() - 60 * 60 * 1000,
      expiresAt: now() + 23 * 60 * 60 * 1000,
    });
  }

  private sanitize(user: User): PublicUser {
    const { password: _password, ...rest } = user;
    void _password;
    return rest;
  }

  getPublicUsers(): PublicUser[] {
    return this.users.map((user) => this.sanitize(user));
  }

  getUserByEmail(email: string): User | undefined {
    return this.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(id: string): User | undefined {
    return this.users.find((user) => user.id === id);
  }

  createUser(data: Pick<User, 'email' | 'password' | 'name' | 'color'> & Partial<Pick<User, 'bio' | 'profilePicture'>>) {
    const user: User = {
      id: crypto.randomUUID(),
      email: data.email,
      password: data.password,
      name: data.name,
      color: data.color,
      bio: data.bio,
      profilePicture: data.profilePicture,
      online: true,
      createdAt: now(),
    };
    this.users.push(user);
    return this.sanitize(user);
  }

  updateUser(userId: string, updates: Partial<Omit<User, 'id' | 'email' | 'password' | 'createdAt'>>) {
    const user = this.getUserById(userId);
    if (!user) {
      return undefined;
    }
    Object.assign(user, updates);
    if (updates.online === false) {
      user.lastSeen = now();
    }
    return this.sanitize(user);
  }

  setUserOnlineStatus(userId: string, online: boolean) {
    const user = this.getUserById(userId);
    if (user) {
      user.online = online;
      if (!online) {
        user.lastSeen = now();
      }
    }
  }

  createSession(userId: string) {
    const token = crypto.randomUUID();
    this.sessions.set(token, userId);
    this.setUserOnlineStatus(userId, true);
    return token;
  }

  getUserIdForToken(token: string) {
    return this.sessions.get(token);
  }

  deleteSession(token: string) {
    const userId = this.sessions.get(token);
    if (userId) {
      this.setUserOnlineStatus(userId, false);
    }
    this.sessions.delete(token);
  }

  addFriendRequest(fromUserId: string, toUserId: string) {
    const existing = this.friendRequests.find((request) =>
      ((request.fromUserId === fromUserId && request.toUserId === toUserId) ||
        (request.fromUserId === toUserId && request.toUserId === fromUserId)) &&
      request.status !== 'rejected');

    if (existing) {
      return existing;
    }

    const request: FriendRequest = {
      id: crypto.randomUUID(),
      fromUserId,
      toUserId,
      status: 'pending',
      createdAt: now(),
      updatedAt: now(),
    };
    this.friendRequests.push(request);
    return request;
  }

  getFriendRequestsForUser(userId: string) {
    return this.friendRequests.filter(
      (request) => request.fromUserId === userId || request.toUserId === userId,
    );
  }

  updateFriendRequestStatus(requestId: string, status: FriendRequestStatus) {
    const request = this.friendRequests.find((req) => req.id === requestId);
    if (!request) {
      return undefined;
    }
    request.status = status;
    request.updatedAt = now();
    return request;
  }

  addMessage(fromUserId: string, toUserId: string, content: string) {
    const message: Message = {
      id: crypto.randomUUID(),
      fromUserId,
      toUserId,
      content,
      timestamp: now(),
    };
    this.messages.push(message);
    return message;
  }

  getMessagesBetween(userA: string, userB: string) {
    return this.messages
      .filter(
        (message) =>
          (message.fromUserId === userA && message.toUserId === userB) ||
          (message.fromUserId === userB && message.toUserId === userA),
      )
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  addStory(userId: string, content: string, image?: string) {
    const story: Story = {
      id: crypto.randomUUID(),
      userId,
      content,
      image,
      createdAt: now(),
      expiresAt: now() + STORY_DURATION_MS,
    };
    this.stories.push(story);
    return story;
  }

  removeStory(storyId: string, userId: string) {
    const story = this.stories.find((item) => item.id === storyId && item.userId === userId);
    if (!story) {
      return false;
    }
    this.stories = this.stories.filter((item) => item.id !== storyId);
    return true;
  }

  getActiveStories() {
    const cutoff = now();
    this.stories = this.stories.filter((story) => story.expiresAt > cutoff);
    return this.stories;
  }
}
