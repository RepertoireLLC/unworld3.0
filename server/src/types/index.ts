export type Mood = 'joy' | 'fear' | 'hope' | 'pain' | 'neutral';

export interface UserProfile {
  id: string;
  displayName: string;
  colorCode: string;
  archetype: string;
  createdAt: number;
  updatedAt: number;
}

export interface StoredMessage {
  id: string;
  conversationId: string;
  senderId: string;
  envelope: string;
  nonce: string;
  cipherText: string;
  createdAt: number;
  deliveredAt?: number | null;
  readAt?: number | null;
  mood?: Mood;
  weight?: number;
}
