import { create } from 'zustand';
import { api } from '../services/api';
import type { Story } from '../types';
import { useAuthStore } from './authStore';

interface StoryState {
  stories: Story[];
  loading: boolean;
  error: string | null;
  fetchStories: () => Promise<void>;
  addStory: (content: string, image?: string) => Promise<void>;
  removeStory: (storyId: string) => Promise<void>;
  getActiveStoriesForUser: (userId: string) => Story[];
  reset: () => void;
}

const initialState = {
  stories: [] as Story[],
  loading: false,
  error: null as string | null,
};

export const useStoryStore = create<StoryState>((set, get) => ({
  ...initialState,

  fetchStories: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    set({ loading: true, error: null });
    try {
      const stories = await api.getStories(token);
      set({ stories, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load stories';
      set({ error: message, loading: false });
    }
  },

  addStory: async (content, image) => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      const story = await api.createStory(token, { content, image });
      set((state) => ({ stories: [story, ...state.stories] }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create story';
      set({ error: message });
    }
  },

  removeStory: async (storyId) => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      await api.deleteStory(token, storyId);
      set((state) => ({ stories: state.stories.filter((story) => story.id !== storyId) }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete story';
      set({ error: message });
    }
  },

  getActiveStoriesForUser: (userId) => {
    const now = Date.now();
    return get()
      .stories.filter((story) => story.userId === userId && story.expiresAt > now)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  reset: () => set(initialState),
}));

export type { Story } from '../types';
