import { getYouTubeApiKey } from './config';
import type { YouTubeVideoMetadata, YouTubeOAuthTokens } from './types';

interface FetchVideosOptions {
  maxResults?: number;
}

interface SearchVideosOptions extends FetchVideosOptions {
  channelId?: string;
  publishedAfter?: string;
}

interface YouTubeListResponse<T> {
  items: T[];
  nextPageToken?: string;
}

type SearchIdentifier =
  | string
  | {
      videoId?: string;
      channelId?: string;
    };

interface SnippetItem {
  id: SearchIdentifier;
  snippet: {
    title: string;
    description: string;
    tags?: string[];
    categoryId?: string;
    channelId?: string;
    channelTitle?: string;
    publishedAt?: string;
    resourceId?: {
      channelId?: string;
    };
  };
}

function resolveVideoId(item: SnippetItem): string | undefined {
  if (typeof item.id === 'string') {
    return item.id;
  }
  if (item.id?.videoId) {
    return item.id.videoId;
  }
  return undefined;
}

export class YouTubeClient {
  private readonly tokens: YouTubeOAuthTokens;

  constructor(tokens: YouTubeOAuthTokens) {
    this.tokens = tokens;
  }

  private async authorizedFetch<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.tokens.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`YouTube API request failed: ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  async listChannelVideos(channelId: string, options: FetchVideosOptions = {}): Promise<YouTubeVideoMetadata[]> {
    const maxResults = options.maxResults ?? 25;
    const apiKey = getYouTubeApiKey();
    const baseUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    baseUrl.searchParams.set('part', 'snippet');
    baseUrl.searchParams.set('channelId', channelId);
    baseUrl.searchParams.set('maxResults', String(maxResults));
    baseUrl.searchParams.set('type', 'video');
    baseUrl.searchParams.set('order', 'date');
    baseUrl.searchParams.set('key', apiKey);

    const response = await this.authorizedFetch<YouTubeListResponse<SnippetItem>>(baseUrl.toString());

    return response.items
      .map((item) => {
        const id = resolveVideoId(item);
        if (!id) {
          return undefined;
        }
        return {
          id,
          title: item.snippet.title,
          description: item.snippet.description,
          tags: item.snippet.tags ?? [],
          category: item.snippet.categoryId,
          channelId: item.snippet.channelId,
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
        } satisfies YouTubeVideoMetadata;
      })
      .filter((video): video is YouTubeVideoMetadata => Boolean(video));
  }

  async listLikedVideos(options: FetchVideosOptions = {}): Promise<YouTubeVideoMetadata[]> {
    const maxResults = options.maxResults ?? 20;
    const baseUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    baseUrl.searchParams.set('part', 'snippet');
    baseUrl.searchParams.set('myRating', 'like');
    baseUrl.searchParams.set('maxResults', String(maxResults));

    const response = await this.authorizedFetch<YouTubeListResponse<SnippetItem>>(baseUrl.toString());

    return response.items
      .map((item) => {
        const id = resolveVideoId(item);
        if (!id) {
          return undefined;
        }
        return {
          id,
          title: item.snippet.title,
          description: item.snippet.description,
          tags: item.snippet.tags ?? [],
          category: item.snippet.categoryId,
          channelId: item.snippet.channelId,
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
        } satisfies YouTubeVideoMetadata;
      })
      .filter((video): video is YouTubeVideoMetadata => Boolean(video));
  }

  async listSubscriptionVideos(options: FetchVideosOptions = {}): Promise<YouTubeVideoMetadata[]> {
    const maxResults = options.maxResults ?? 20;
    const subscriptionUrl = new URL('https://www.googleapis.com/youtube/v3/subscriptions');
    subscriptionUrl.searchParams.set('part', 'snippet');
    subscriptionUrl.searchParams.set('mine', 'true');
    subscriptionUrl.searchParams.set('maxResults', String(maxResults));

    const subscriptions = await this.authorizedFetch<YouTubeListResponse<SnippetItem>>(subscriptionUrl.toString());

    const videos: YouTubeVideoMetadata[] = [];
    for (const subscription of subscriptions.items) {
      const channelId =
        subscription.snippet.resourceId?.channelId ?? subscription.snippet.channelId;
      if (!channelId) {
        continue;
      }
      const channelVideos = await this.listChannelVideos(channelId, { maxResults: 5 });
      videos.push(...channelVideos);
    }
    return videos;
  }

  async searchVideos(query: string, options: SearchVideosOptions = {}): Promise<YouTubeVideoMetadata[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const maxResults = options.maxResults ?? 25;
    const apiKey = getYouTubeApiKey();
    const baseUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    baseUrl.searchParams.set('part', 'snippet');
    baseUrl.searchParams.set('type', 'video');
    baseUrl.searchParams.set('maxResults', String(maxResults));
    baseUrl.searchParams.set('q', trimmed);
    baseUrl.searchParams.set('key', apiKey);
    baseUrl.searchParams.set('order', 'relevance');

    if (options.channelId) {
      baseUrl.searchParams.set('channelId', options.channelId);
    }
    if (options.publishedAfter) {
      baseUrl.searchParams.set('publishedAfter', options.publishedAfter);
    }

    const response = await this.authorizedFetch<YouTubeListResponse<SnippetItem>>(baseUrl.toString());

    return response.items
      .map((item) => {
        const id = resolveVideoId(item);
        if (!id) {
          return undefined;
        }
        return {
          id,
          title: item.snippet.title,
          description: item.snippet.description,
          tags: item.snippet.tags ?? [],
          category: item.snippet.categoryId,
          channelId: item.snippet.channelId,
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
        } satisfies YouTubeVideoMetadata;
      })
      .filter((video): video is YouTubeVideoMetadata => Boolean(video));
  }

  async fetchTranscript(videoId: string): Promise<string | undefined> {
    try {
      const apiKey = getYouTubeApiKey();
      const url = new URL('https://www.googleapis.com/youtube/v3/captions');
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('videoId', videoId);
      url.searchParams.set('key', apiKey);

      const captions = await this.authorizedFetch<YouTubeListResponse<{ id: string }>>(url.toString());
      if (!captions.items?.length) {
        return undefined;
      }

      const captionId = captions.items[0]?.id;
      if (!captionId) {
        return undefined;
      }

      const captionResponse = await fetch(`https://www.googleapis.com/youtube/v3/captions/${captionId}?tfmt=srt&key=${apiKey}`, {
        headers: {
          Authorization: `Bearer ${this.tokens.accessToken}`,
        },
      });
      if (!captionResponse.ok) {
        return undefined;
      }
      return await captionResponse.text();
    } catch (error) {
      console.warn('Failed to fetch YouTube transcript', error);
      return undefined;
    }
  }

  async aggregatePersonalizedFeed(channelId: string | undefined): Promise<YouTubeVideoMetadata[]> {
    const [liked, subscription] = await Promise.all([
      this.listLikedVideos({ maxResults: 12 }).catch(() => []),
      this.listSubscriptionVideos({ maxResults: 10 }).catch(() => []),
    ]);

    let channelVideos: YouTubeVideoMetadata[] = [];
    if (channelId) {
      channelVideos = await this.listChannelVideos(channelId, { maxResults: 10 }).catch(() => []);
    }

    const allVideos = [...liked, ...subscription, ...channelVideos];
    const map = new Map<string, YouTubeVideoMetadata>();
    for (const video of allVideos) {
      if (!map.has(video.id)) {
        map.set(video.id, video);
      }
    }
    return Array.from(map.values());
  }
}
