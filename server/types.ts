import type { Request } from 'express';

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  color: string;
  bio?: string;
  profilePicture?: string;
  online: boolean;
  lastSeen?: number;
  createdAt: number;
}

export type PublicUser = Omit<User, 'password'>;

export interface Session {
  token: string;
  userId: string;
  createdAt: number;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: FriendRequestStatus;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  timestamp: number;
}

export interface Story {
  id: string;
  userId: string;
  content: string;
  image?: string;
  createdAt: number;
  expiresAt: number;
}

export interface AuthenticatedRequest extends Request {
  user: PublicUser;
  token: string;
}
