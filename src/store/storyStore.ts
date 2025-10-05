import { create } from 'zustand';
import {
  AccessControlledEntity,
  Visibility,
  filterReadableEntities,
  resolveLayerIds,
} from '../lib/permissions';

export interface Story extends AccessControlledEntity {
  id: string;
  userId: string;
  ownerId: string;
  content: string;
  image?: string;
  createdAt: number;
  expiresAt: number;
}

interface AddStoryInput {
  userId: string;
  content: string;
  image?: string;
  layerIds?: string[];
  visibility?: Visibility;
}

interface StoryState {
  stories: Story[];
  addStory: (input: AddStoryInput) => void;
  removeStory: (storyId: string) => void;
  getActiveStoriesForUser: (userId: string, viewerId?: string | null) => Story[];
  getVisibleStories: (viewerId?: string | null) => Story[];
}

export const useStoryStore = create<StoryState>((set, get) => ({
  stories: [],

  addStory: ({ userId, content, image, layerIds, visibility }) => {
    const now = Date.now();
    const story: Story = {
      id: now.toString(),
      userId,
      ownerId: userId,
      content,
      image,
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
      layerIds: resolveLayerIds(layerIds),
      visibility: visibility ?? Visibility.MEMBERS,
    };

    set((state) => ({
      stories: [...state.stories, story],
    }));
  },

  removeStory: (storyId) => {
    set((state) => ({
      stories: state.stories.filter((story) => story.id !== storyId),
    }));
  },

  getActiveStoriesForUser: (userId, viewerId = null) => {
    const now = Date.now();
    const relevantStories = get().stories.filter(
      (story) => story.userId === userId && story.expiresAt > now
    );
    return filterReadableEntities(viewerId, relevantStories);
  },

  getVisibleStories: (viewerId = null) => {
    const now = Date.now();
    const activeStories = get().stories.filter((story) => story.expiresAt > now);
    return filterReadableEntities(viewerId, activeStories);
  },
}));
