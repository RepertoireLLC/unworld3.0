export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  color: string;
  bio?: string;
  profilePicture?: string;
  online: boolean;
  lastSeen?: number;
  createdAt?: number;
}

export interface AuthResponse {
  token: string;
  user: ApiUser;
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
