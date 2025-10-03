import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  X,
  RefreshCw,
  Shield,
  Lock,
  Unlock,
  SignalHigh,
  Bookmark,
  Download,
  Upload,
  Sparkles,
  Loader2,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { useBluetoothStore } from '../../store/bluetoothStore';
import type { WifiRelay } from '../../store/bluetoothStore';
import { useUserStore } from '../../store/userStore';
import {
  AlexandriaBookmark,
  AlexandriaDownload,
  AlexandriaTabInit,
  useAlexandriaStore,
} from '../../store/alexandriaStore';
import type { WifiNetwork } from '../../types/network';
import { encryptBuffer } from '../../utils/encryption';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  relevance: number;
  source: 'duckduckgo' | 'enclypse';
}

interface DuckDuckGoTopic {
  Text?: string;
  FirstURL?: string;
  Topics?: DuckDuckGoTopic[];
}

interface DuckDuckGoResponse {
  RelatedTopics?: DuckDuckGoTopic[];
  Results?: DuckDuckGoTopic[];
}

const NORMALIZED_SPONSOR_TERMS = /\b(ad|ads|advert|sponsor|promoted|promotion|affiliate)\b/i;

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

const normalizeUrl = (value: string) => {
  if (!value.trim()) {
    return 'about:blank';
  }

  if (/^about:/i.test(value)) {
    return value;
  }

  if (!/^https?:\/\//i.test(value)) {
    return `https://${value}`;
  }

  return value;
};

const attachmentTypeFromMime = (mime: string): AlexandriaDownload['type'] => {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return 'file';
};

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

const dedupeKeywords = (keywords: string[]) => Array.from(new Set(keywords));

const EMPTY_WIFI_RELAYS: WifiRelay[] = [];

const computeRelevance = (queryTokens: string[], text: string, url: string, boostKeywords: string[]) => {
  const normalizedText = text.toLowerCase();
  const normalizedUrl = url.toLowerCase();
  let score = 0;

  queryTokens.forEach((token) => {
    const textMatches = normalizedText.split(token).length - 1;
    const urlMatches = normalizedUrl.split(token).length - 1;
    score += textMatches * 3 + urlMatches * 5;

    if (normalizedText.startsWith(token)) {
      score += 4;
    }
    if (normalizedUrl.includes(`/${token}`) || normalizedUrl.includes(`${token}.`)) {
      score += 3;
    }
  });

  boostKeywords.forEach((keyword) => {
    if (normalizedText.includes(keyword) || normalizedUrl.includes(keyword)) {
      score += 2;
    }
  });

  try {
    const { hostname } = new URL(url);
    if (/docs|guide|wiki|learn|blog/.test(hostname)) {
      score += 2;
    }
    if (/news|insights|research/.test(hostname)) {
      score += 1;
    }
    if (/ads|sponsor|promo|tracker/.test(hostname)) {
      score -= 6;
    }
  } catch {
    // Ignore malformed URLs
  }

  return score;
};

const flattenRelatedTopics = (related: DuckDuckGoTopic[] = []): { Text: string; FirstURL: string }[] => {
  return related.flatMap((entry) => {
    if (entry.Topics && entry.Topics.length > 0) {
      return flattenRelatedTopics(entry.Topics);
    }
    return entry.Text && entry.FirstURL ? [{ Text: entry.Text, FirstURL: entry.FirstURL }] : [];
  });
};

export function AlexandriaWorkspace() {
  const { user } = useAuthStore();
  const userId = user?.id ?? null;
  const activeChatId = useChatStore((state) => state.activeChat);
  const ensureConnection = useBluetoothStore((state) => state.ensureConnection);
  const updateSignalStrength = useBluetoothStore((state) => state.updateSignalStrength);
  const registerWifiRelays = useBluetoothStore((state) => state.registerWifiRelays);
  const selectWifiRelay = useBluetoothStore((state) => state.selectWifiRelay);
  const connection = useBluetoothStore((state) => {
    if (!userId || !activeChatId) return undefined;
    const key = [userId, activeChatId].sort().join('::');
    return state.connections[key];
  });
  const users = useUserStore((state) => state.users);

  const tabs = useAlexandriaStore((state) => {
    if (!userId) return [];
    return state.tabsByUser[userId] ?? [];
  });
  const activeTabId = useAlexandriaStore((state) => {
    if (!userId) return null;
    return state.activeTabByUser[userId] ?? null;
  });
  const bookmarks = useAlexandriaStore((state) => {
    if (!userId) return [];
    return state.bookmarksByUser[userId] ?? [];
  });
  const downloads = useAlexandriaStore((state) => {
    if (!userId) return [];
    return state.downloadsByUser[userId] ?? [];
  });

  const openTab = useAlexandriaStore((state) => state.openTab);
  const closeTab = useAlexandriaStore((state) => state.closeTab);
  const setActiveTab = useAlexandriaStore((state) => state.setActiveTab);
  const updateTab = useAlexandriaStore((state) => state.updateTab);
  const togglePrivate = useAlexandriaStore((state) => state.togglePrivate);
  const addBookmark = useAlexandriaStore((state) => state.addBookmark);
  const removeBookmark = useAlexandriaStore((state) => state.removeBookmark);
  const logDownload = useAlexandriaStore((state) => state.logDownload);

  const [urlInput, setUrlInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [filteredOutCount, setFilteredOutCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isLoadingFrame, setIsLoadingFrame] = useState(false);
  const [frameRefreshToken, setFrameRefreshToken] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activePeer = useMemo(() => {
    if (!activeChatId) return null;
    return users.find((candidate) => candidate.id === activeChatId) ?? null;
  }, [users, activeChatId]);

  const activeTab = useMemo(() => {
    if (!tabs.length) return undefined;
    if (activeTabId) {
      return tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
    }
    return tabs[0];
  }, [tabs, activeTabId]);

  const activeTabIdentity = activeTab?.id ?? null;
  const activeTabUrl = activeTab?.url ?? '';
  const activeTabStoredQuery = activeTab?.lastQuery ?? '';
  const wifiRelays = connection?.wifiRelays ?? EMPTY_WIFI_RELAYS;
  const activeWifiId = connection?.activeWifiId ?? null;

  const wifiRelayViews = useMemo(
    () =>
      wifiRelays.map((relay) => {
        const ownerName = relay.ownerId === userId
          ? 'Your device'
          : users.find((candidate) => candidate.id === relay.ownerId)?.name ?? 'Partner device';
        return { ...relay, ownerName };
      }),
    [wifiRelays, users, userId]
  );

  const activeWifiRelay = useMemo(
    () => wifiRelayViews.find((relay) => relay.id === activeWifiId) ?? wifiRelayViews[0] ?? null,
    [wifiRelayViews, activeWifiId]
  );

  const borrowedRelay = useMemo(
    () => wifiRelayViews.find((relay) => relay.type === 'peer' && relay.id === activeWifiId) ?? null,
    [wifiRelayViews, activeWifiId]
  );
  const wifiSummary = activeWifiRelay
    ? `${activeWifiRelay.bandwidthMbps} Mbps · ${activeWifiRelay.viaBluetooth ? 'Borrowed via Bluetooth' : 'Local Wi-Fi'}`
    : 'No network linked';
  const wifiLatency = activeWifiRelay ? `${activeWifiRelay.latencyMs} ms latency` : '';

  useEffect(() => {
    if (!userId) {
      return;
    }

    if (tabs.length === 0) {
      const baseline: AlexandriaTabInit = {
        title: 'Enclypse Discovery',
        url: 'https://search.alexandria.enclypse',
        trustedKeywords: ['secure', 'open', 'relevant'],
      };
      openTab(userId, baseline);
    }
  }, [userId, tabs.length, openTab]);

  useEffect(() => {
    if (!userId || !activeChatId) return;

    ensureConnection(userId, activeChatId);

    const localRelays: WifiRelay[] = (user?.wifiNetworks ?? []).map((network) => ({
      ...network,
      ownerId: userId,
      type: 'local' as const,
      viaBluetooth: false,
      latencyMs: 6,
    }));

    const peerRelays: WifiRelay[] = (activePeer?.wifiNetworks ?? [])
      .filter((network: WifiNetwork) => network.shareable)
      .map((network) => ({
        ...network,
        ownerId: activeChatId,
        type: 'peer' as const,
        viaBluetooth: true,
        latencyMs: 24,
      }));

    registerWifiRelays(userId, activeChatId, [...localRelays, ...peerRelays]);
  }, [
    userId,
    activeChatId,
    user?.wifiNetworks,
    activePeer?.wifiNetworks,
    ensureConnection,
    registerWifiRelays,
  ]);

  useEffect(() => {
    if (!userId || !activeTabIdentity) return;
    setUrlInput(activeTabUrl || '');
    setSearchQuery(activeTabStoredQuery);
  }, [userId, activeTabIdentity, activeTabUrl, activeTabStoredQuery]);

  useEffect(() => {
    if (!userId || !activeChatId) return;
    const connectionState = ensureConnection(userId, activeChatId);
    if (!connectionState) return;

    const interval = window.setInterval(() => {
      const base = connectionState.signalStrength ?? 72;
      const variance = Math.random() * 10 - 5;
      updateSignalStrength(userId, activeChatId, base + variance);
    }, 10000);

    return () => window.clearInterval(interval);
  }, [userId, activeChatId, ensureConnection, updateSignalStrength]);

  useEffect(() => {
    if (!activeTabUrl) return;
    setIsLoadingFrame(true);
    setFrameRefreshToken((token) => token + 1);
  }, [activeTabUrl]);

  const handleNewTab = () => {
    if (!userId) return;
    openTab(userId, { title: 'New Tab', url: 'about:blank' });
  };

  const handleCloseTab = (tabId: string) => {
    if (!userId) return;
    closeTab(userId, tabId);
  };

  const handleSelectTab = (tabId: string) => {
    if (!userId) return;
    setActiveTab(userId, tabId);
  };

  const handleSelectWifiRelay = (relayId: string) => {
    if (!userId || !activeChatId) return;
    selectWifiRelay(userId, activeChatId, relayId);
  };

  const handleReload = () => {
    setIsLoadingFrame(true);
    setFrameRefreshToken((token) => token + 1);
  };

  const handleNavigate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId || !activeTab) return;
    const nextUrl = normalizeUrl(urlInput);
    updateTab(userId, activeTab.id, { url: nextUrl, title: nextUrl });
  };

  const handleToggleShields = () => {
    if (!userId || !activeTab) return;
    updateTab(userId, activeTab.id, { shieldsUp: !activeTab.shieldsUp });
  };

  const handleTogglePrivate = () => {
    if (!userId || !activeTab) return;
    togglePrivate(userId, activeTab.id);
  };

  const curateFromBookmarks = useCallback(
    (queryTokens: string[]): SearchResult[] => {
      if (!bookmarks.length) return [];
      return bookmarks
        .map((bookmark) => {
          const snippet = `Saved ${formatTimestamp(bookmark.createdAt)} · ${bookmark.title}`;
          const relevance = computeRelevance(queryTokens, snippet, bookmark.url, queryTokens);
          return {
            title: bookmark.title,
            url: bookmark.url,
            snippet,
            relevance,
            source: 'enclypse' as const,
          };
        })
        .filter((result) => result.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 6);
    },
    [bookmarks]
  );

  const performDiscovery = useCallback(
    async (query: string) => {
      if (!userId || !activeTab) return;
      const trimmed = query.trim();
      if (!trimmed) {
        setSearchResults([]);
        setFilteredOutCount(0);
        setSearchError(null);
        updateTab(userId, activeTab.id, { lastQuery: '' });
        return;
      }

      const queryTokens = dedupeKeywords(tokenize(trimmed));
      const boostKeywords = activeTab.trustedKeywords ?? [];

      setIsSearching(true);
      setSearchError(null);
      setFilteredOutCount(0);

      try {
        const response = await fetch(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(trimmed)}&format=json&no_redirect=1&no_html=1&t=enclypse-alexandria`
        );

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = (await response.json()) as DuckDuckGoResponse;
        const rawResults: { Text: string; FirstURL: string }[] = [];

        if (Array.isArray(data.RelatedTopics)) {
          rawResults.push(...flattenRelatedTopics(data.RelatedTopics));
        }

        if (Array.isArray(data.Results)) {
          const direct = data.Results.flatMap((item) =>
            item && item.Text && item.FirstURL ? [{ Text: item.Text, FirstURL: item.FirstURL }] : []
          );
          rawResults.push(...direct);
        }

        let filteredCount = 0;

        const curated = rawResults
          .filter((item) => {
            if (!item.Text || !item.FirstURL) return false;
            if (NORMALIZED_SPONSOR_TERMS.test(item.Text) || NORMALIZED_SPONSOR_TERMS.test(item.FirstURL)) {
              filteredCount += 1;
              return false;
            }
            return true;
          })
          .map((item) => {
            const snippet = item.Text.replace(/<[^>]+>/g, '');
            const relevance = computeRelevance(queryTokens, snippet, item.FirstURL, boostKeywords);
            return {
              title: snippet.split(' - ')[0] ?? snippet,
              url: item.FirstURL,
              snippet,
              relevance,
              source: 'duckduckgo' as const,
            } satisfies SearchResult;
          })
          .filter((result) => result.relevance > 0)
          .sort((a, b) => b.relevance - a.relevance)
          .slice(0, 8);

        setFilteredOutCount(filteredCount);

        if (curated.length > 0) {
          setSearchResults(curated);
        } else {
          const fallback = curateFromBookmarks(queryTokens);
          if (fallback.length > 0) {
            setSearchResults(fallback);
          } else {
            setSearchResults([]);
            setSearchError('No high-relevance organic sources surfaced yet.');
          }
        }

        updateTab(userId, activeTab.id, {
          lastQuery: trimmed,
          trustedKeywords: dedupeKeywords([...boostKeywords, ...queryTokens]),
        });
      } catch (error) {
        console.error('Enclypse Alexandria discovery failed', error);
        const fallback = curateFromBookmarks(dedupeKeywords(tokenize(trimmed)));
        if (fallback.length > 0) {
          setSearchResults(fallback);
          setSearchError('Live web search unavailable. Showing trusted Enclypse sources instead.');
        } else {
          setSearchResults([]);
          setSearchError('We could not reach the discovery grid. Check your connection and try again.');
        }
      } finally {
        setIsSearching(false);
      }
    },
    [userId, activeTab, updateTab, curateFromBookmarks]
  );

  const handleDiscovery = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    performDiscovery(searchQuery);
  };

  const handleResultOpen = (result: SearchResult) => {
    if (!userId || !activeTab) return;
    updateTab(userId, activeTab.id, { url: result.url, title: result.title });
    setUrlInput(result.url);
  };

  const handleAddBookmark = () => {
    if (!userId || !activeTab) return;
    addBookmark(userId, {
      title: activeTab.title || activeTab.url,
      url: activeTab.url,
    });
  };

  const handleBookmarkOpen = (bookmark: AlexandriaBookmark) => {
    if (!userId || !activeTab) return;
    updateTab(userId, activeTab.id, { url: bookmark.url, title: bookmark.title });
    setUrlInput(bookmark.url);
  };

  const handleBookmarkRemove = (bookmarkId: string) => {
    if (!userId) return;
    removeBookmark(userId, bookmarkId);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) {
      return;
    }

    if (!userId || !activeChatId) {
      setUploadStatus('Select a contact to initiate a secure transfer.');
      event.target.value = '';
      return;
    }

    const activeConnection = ensureConnection(userId, activeChatId);
    if (!activeConnection?.key) {
      setUploadStatus('Establishing encrypted Bluetooth tunnel… try again in a moment.');
      event.target.value = '';
      return;
    }

    setUploadStatus('Encrypting transmission payload…');

    try {
      const tasks = Array.from(fileList).map(async (file) => {
        const buffer = await file.arrayBuffer();
        const encrypted = await encryptBuffer(activeConnection.key, buffer);
        logDownload(userId, {
          name: file.name,
          type: attachmentTypeFromMime(file.type || 'application/octet-stream'),
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          encryptedData: encrypted.ciphertext,
          iv: encrypted.iv,
          source: activeTab?.url ?? 'enclypse://alexandria',
        });
      });

      await Promise.all(tasks);
      setUploadStatus('Encrypted transfer queued over Bluetooth. Operators can retrieve it from downloads.');
    } catch (error) {
      console.error('Failed to encrypt Alexandria workspace upload', error);
      setUploadStatus('Unable to encrypt this upload. Please verify the file and try again.');
    } finally {
      event.target.value = '';
    }
  };

  if (!userId) {
    return (
      <div className="alexandria-workspace alexandria-workspace--empty" role="presentation">
        Sign in to activate the Enclypse Alexandria workspace.
      </div>
    );
  }

  return (
    <section className="alexandria-workspace" aria-label="Enclypse Alexandria encrypted browser">
      <header className="alexandria-workspace__tabs" role="tablist">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab?.id;
          return (
            <div key={tab.id} role="presentation" className="alexandria-workspace__tab-wrapper">
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`alexandria-workspace__tab ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectTab(tab.id)}
              >
                <span className="alexandria-workspace__tab-title">{tab.title || tab.url}</span>
                <span className="sr-only">{isActive ? '(current tab)' : ''}</span>
              </button>
              <button
                type="button"
                className="alexandria-workspace__tab-close"
                onClick={() => handleCloseTab(tab.id)}
                aria-label={`Close tab ${tab.title || tab.url}`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          );
        })}
        <button type="button" className="alexandria-workspace__tab alexandria-workspace__tab--new" onClick={handleNewTab}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>New Tab</span>
        </button>
      </header>

      <div className="alexandria-workspace__toolbar" role="region" aria-label="Browser toolbar">
        <div className="alexandria-workspace__toolbar-main">
          <button type="button" className="alexandria-workspace__icon-button" onClick={handleReload} aria-label="Reload tab">
            <RefreshCw className="h-4 w-4" />
          </button>
          <form className="alexandria-workspace__url-form" onSubmit={handleNavigate} aria-label="Navigate to URL">
            <input
              className="alexandria-workspace__url-input"
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              placeholder="Type a URL or search term"
              aria-label="Address bar"
            />
            <button type="submit">Open</button>
          </form>
        </div>
        <div className="alexandria-workspace__toolbar-actions">
          <button
            type="button"
            className={`alexandria-workspace__chip ${activeTab?.shieldsUp ? 'active' : ''}`}
            onClick={handleToggleShields}
          >
            <Shield className="h-4 w-4" aria-hidden="true" />
            {activeTab?.shieldsUp ? 'Shields On' : 'Shields Off'}
          </button>
          <button
            type="button"
            className={`alexandria-workspace__chip ${activeTab?.isPrivate ? 'active' : ''}`}
            onClick={handleTogglePrivate}
          >
            {activeTab?.isPrivate ? <Lock className="h-4 w-4" aria-hidden="true" /> : <Unlock className="h-4 w-4" aria-hidden="true" />}
            {activeTab?.isPrivate ? 'Private Window' : 'Standard Window'}
          </button>
          <button type="button" className="alexandria-workspace__chip" onClick={handleAddBookmark}>
            <Bookmark className="h-4 w-4" aria-hidden="true" />
            Save Source
          </button>
        </div>
      </div>

      <div className="alexandria-workspace__status" role="region" aria-live="polite">
        <div className="alexandria-workspace__signal">
          <SignalHigh className="h-4 w-4" aria-hidden="true" />
          <div>
            <p>Bluetooth Signal</p>
            <span>
              {connection?.signalStrength ? `${Math.round(connection.signalStrength)}%` : 'Link idle'}
            </span>
          </div>
        </div>
        <div className="alexandria-workspace__wifi" role="group" aria-label="Wi-Fi routing">
          <div className="alexandria-workspace__wifi-heading">
            <p className="alexandria-workspace__wifi-label">Network Route</p>
            <span className="alexandria-workspace__wifi-speed">{wifiSummary}</span>
          </div>
          {wifiLatency && <span className="alexandria-workspace__wifi-latency">{wifiLatency}</span>}
          <p className="alexandria-workspace__wifi-note">
            {borrowedRelay
              ? `Borrowing ${borrowedRelay.ownerName}'s ${borrowedRelay.ssid} through encrypted Bluetooth.`
              : 'Anchored to your Enclypse uplink.'}
          </p>
          <div
            className="alexandria-workspace__wifi-options"
            role="listbox"
            aria-label="Available networks"
          >
            {wifiRelayViews.map((relay) => (
              <button
                key={relay.id}
                type="button"
                role="option"
                aria-selected={activeWifiId === relay.id}
                className={`alexandria-workspace__chip alexandria-workspace__chip--wifi ${activeWifiId === relay.id ? 'active' : ''}`}
                onClick={() => handleSelectWifiRelay(relay.id)}
              >
                <span className="alexandria-workspace__wifi-name">{relay.ssid}</span>
                <span className="alexandria-workspace__wifi-meta">
                  {relay.bandwidthMbps} Mbps · {relay.type === 'peer' ? `via ${relay.ownerName}` : 'on-device'}
                </span>
              </button>
            ))}
            {wifiRelayViews.length === 0 && (
              <span className="alexandria-workspace__wifi-meta">Pair with a contact to unlock relays.</span>
            )}
          </div>
        </div>
        <div className="alexandria-workspace__keywords" role="list" aria-label="Focus terms">
          {(activeTab?.trustedKeywords ?? []).map((keyword) => (
            <span key={keyword} className="alexandria-workspace__keyword" role="listitem">
              #{keyword}
            </span>
          ))}
        </div>
        <div className="alexandria-workspace__upload">
          <label className="alexandria-workspace__chip" htmlFor="alexandria-upload-input">
            <Upload className="h-4 w-4" aria-hidden="true" />
            Beam Attachments
          </label>
          <input
            id="alexandria-upload-input"
            type="file"
            ref={fileInputRef}
            className="sr-only"
            multiple
            onChange={handleFileUpload}
          />
          {uploadStatus && <p className="alexandria-workspace__status-note">{uploadStatus}</p>}
        </div>
      </div>

      <div className="alexandria-workspace__discovery" role="region" aria-label="Organic discovery">
        <form className="alexandria-workspace__search" onSubmit={handleDiscovery}>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Hunt for trustworthy intel…"
            aria-label="Enclypse discovery search"
          />
          <button type="submit" disabled={isSearching}>
            {isSearching ? 'Scanning…' : 'Discover'}
          </button>
        </form>
        {searchError && <div className="alexandria-workspace__alert" role="status">{searchError}</div>}
        {filteredOutCount > 0 && (
          <div className="alexandria-workspace__alert alexandria-workspace__alert--quiet" role="status">
            Filtered out {filteredOutCount} suspected promotions.
          </div>
        )}
        <div className="alexandria-workspace__results" role="list">
          {isSearching ? (
            <div className="alexandria-workspace__result alexandria-workspace__result--loading">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Decrypting noise from the wider web…</span>
            </div>
          ) : (
            searchResults.map((result) => (
              <article key={result.url} className="alexandria-workspace__result" role="listitem">
                <header>
                  <h3>{result.title}</h3>
                  <button type="button" onClick={() => handleResultOpen(result)}>
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    Open
                  </button>
                </header>
                <p>{result.snippet}</p>
                <footer>
                  <span className="alexandria-workspace__result-meta">Relevance {result.relevance.toFixed(1)}</span>
                  <span className="alexandria-workspace__result-meta">
                    Source: {result.source === 'duckduckgo' ? 'Live web' : 'Enclypse vault'}
                  </span>
                </footer>
              </article>
            ))
          )}
          {!isSearching && searchResults.length === 0 && !searchError && (
            <div className="alexandria-workspace__result alexandria-workspace__result--empty">
              <p>Search to surface organic results tuned for your focus.</p>
            </div>
          )}
        </div>
      </div>

      <div className="alexandria-workspace__content">
        <div className="alexandria-workspace__frame" aria-live="polite">
          {isLoadingFrame && (
            <div className="alexandria-workspace__frame-loading">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              <span>Loading {activeTab?.url}</span>
            </div>
          )}
          {activeTab && (
            <iframe
              key={`${activeTab.id}-${frameRefreshToken}`}
              src={activeTab.url}
              title={activeTab.title || activeTab.url}
              onLoad={() => setIsLoadingFrame(false)}
              className="alexandria-workspace__iframe"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            />
          )}
        </div>
        <aside className="alexandria-workspace__intel" aria-label="Saved sources and encrypted transfers">
          <section className="alexandria-workspace__panel" aria-label="Trusted sources">
            <header>
              <Bookmark className="h-4 w-4" aria-hidden="true" />
              <h4>Trusted Sources</h4>
            </header>
            {bookmarks.length === 0 ? (
              <p className="alexandria-workspace__empty">Save a page to pin it here.</p>
            ) : (
              <ul>
                {bookmarks.map((bookmark) => (
                  <li key={bookmark.id}>
                    <button type="button" onClick={() => handleBookmarkOpen(bookmark)}>
                      {bookmark.title}
                    </button>
                    <div className="alexandria-workspace__panel-actions">
                      <span>{bookmark.url}</span>
                      <button
                        type="button"
                        className="alexandria-workspace__icon-button"
                        onClick={() => handleBookmarkRemove(bookmark.id)}
                        aria-label={`Remove ${bookmark.title}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="alexandria-workspace__panel" aria-label="Encrypted downloads">
            <header>
              <Download className="h-4 w-4" aria-hidden="true" />
              <h4>Encrypted Transfers</h4>
            </header>
            {downloads.length === 0 ? (
              <p className="alexandria-workspace__empty">Beam a file to populate your secure download log.</p>
            ) : (
              <ul>
                {downloads.map((download) => (
                  <li key={download.id}>
                    <div>
                      <p>{download.name}</p>
                      <span className="alexandria-workspace__download-meta">
                        {attachmentTypeFromMime(download.mimeType)} · {formatBytes(download.size)} · {formatTimestamp(download.timestamp)}
                      </span>
                    </div>
                    <span className="alexandria-workspace__download-source">{download.source}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}
