import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Globe2,
  Users2,
  Search,
  MessageSquare,
  UserCircle2,
  LogOut,
  Plus,
  Bell,
  Palette,
  ChevronDown,
  X,
  Sparkles,
  Sun,
  Moon,
  Coffee,
  Flame,
} from 'lucide-react';
import { Scene } from '../Scene';
import { ChatWindow } from './ChatWindow';
import { useAuthStore } from '../../store/authStore';
import { useModalStore } from '../../store/modalStore';
import { useUserStore } from '../../store/userStore';
import { useChatStore } from '../../store/chatStore';
import { useFriendStore } from '../../store/friendStore';
import { useThemeStore, ThemeType } from '../../store/themeStore';
import { EnclypseLogo } from './EnclypseLogo';
import { BraveWorkspace } from './BraveWorkspace';

const NAV_ITEMS = [
  { id: 'sphere', label: 'Sphere', icon: Globe2 },
  { id: 'contacts', label: 'Contacts', icon: Users2 },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'brave', label: 'Brave', icon: Flame },
  { id: 'profile', label: 'Profile', icon: UserCircle2 },
] as const;

type NavKey = (typeof NAV_ITEMS)[number]['id'];

type ViewKey = Exclude<NavKey, 'profile'>;

type Availability = 'available' | 'focus' | 'away';

const THEME_OPTIONS: { id: ThemeType; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'neon', label: 'Neon' },
  { id: 'galaxy', label: 'Galaxy' },
  { id: 'matrix', label: 'Matrix' },
  { id: 'minimal', label: 'Minimal' },
];

const AVAILABILITY_OPTIONS: {
  id: Availability;
  label: string;
  description: string;
  Icon: typeof Sun;
}[] = [
  {
    id: 'available',
    label: 'Available',
    description: 'Alerts on, ready for rapid collaboration.',
    Icon: Sun,
  },
  {
    id: 'focus',
    label: 'Focus',
    description: 'Mute non-urgent pings while you laser in.',
    Icon: Moon,
  },
  {
    id: 'away',
    label: 'Away',
    description: 'Let the lattice know you will circle back soon.',
    Icon: Coffee,
  },
];

const STATUS_PRESETS = [
  'Synthesizing intel drops.',
  'Coordinating with deep space relays.',
  'On a quick recharge loop.',
  'Tracking resonance anomalies.',
];

export function ChatShell() {
  const [activeView, setActiveView] = useState<ViewKey>('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [isPresenceMenuOpen, setIsPresenceMenuOpen] = useState(false);
  const [statusDraft, setStatusDraft] = useState('');
  const [availability, setAvailability] = useState<Availability>('available');

  const sidebarSearchRef = useRef<HTMLInputElement>(null);
  const headerSearchRef = useRef<HTMLInputElement>(null);
  const navButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const currentUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const setProfileUserId = useModalStore((state) => state.setProfileUserId);
  const { activeChat, setActiveChat } = useChatStore();
  const users = useUserStore((state) => state.users);
  const updateUserColor = useUserStore((state) => state.updateUserColor);
  const setOnlineStatus = useUserStore((state) => state.setOnlineStatus);
  const updateUserPresence = useUserStore((state) => state.updateUserPresence);
  const friendRequests = useFriendStore((state) => state.friendRequests);
  const acceptFriendRequest = useFriendStore((state) => state.acceptFriendRequest);
  const rejectFriendRequest = useFriendStore((state) => state.rejectFriendRequest);
  const { currentTheme, setTheme } = useThemeStore();

  const contacts = useMemo(
    () => users.filter((user) => user.id !== currentUser?.id),
    [users, currentUser?.id]
  );

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter((contact) => contact.name.toLowerCase().includes(query));
  }, [contacts, searchQuery]);

  const globalSearchResults = useMemo(() => {
    if (!globalSearch.trim()) return [];
    const query = globalSearch.toLowerCase();
    return contacts.filter((contact) => contact.name.toLowerCase().includes(query));
  }, [contacts, globalSearch]);

  const pendingRequests = useMemo(() => {
    if (!currentUser) return [];
    return friendRequests.filter(
      (request) => request.status === 'pending' && request.toUserId === currentUser.id
    );
  }, [friendRequests, currentUser]);

  useEffect(() => {
    if (!activeChat && contacts.length > 0) {
      setActiveChat(contacts[0].id);
    }
  }, [activeChat, contacts, setActiveChat]);

  useEffect(() => {
    if (!currentUser) return;
    setStatusDraft(currentUser.statusMessage ?? '');
    setAvailability(currentUser.availability ?? 'available');
  }, [currentUser?.statusMessage, currentUser?.availability, currentUser]);

  useEffect(() => {
    if (activeView === 'search') {
      const frame = requestAnimationFrame(() => sidebarSearchRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [activeView]);

  useEffect(() => {
    const handleGlobalShortcuts = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isInputTarget =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (event.key === 'Escape') {
        setIsThemeMenuOpen(false);
        setIsRequestsOpen(false);
        setShowColorPicker(false);
        setIsPresenceMenuOpen(false);
        return;
      }

      if (isInputTarget) {
        return;
      }

      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        setActiveView('search');
        requestAnimationFrame(() => {
          headerSearchRef.current?.focus();
          headerSearchRef.current?.select();
        });
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        requestAnimationFrame(() => {
          headerSearchRef.current?.focus();
          headerSearchRef.current?.select();
        });
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [setActiveView, setIsRequestsOpen, setIsThemeMenuOpen, setShowColorPicker]);

  if (!currentUser) {
    return null;
  }

  const handleNavClick = (itemId: NavKey) => {
    if (itemId === 'profile') {
      setProfileUserId(currentUser.id);
      return;
    }

    if (itemId === 'sphere') {
      setActiveView('sphere');
      return;
    }

    if (itemId === 'contacts') {
      setSearchQuery('');
      setGlobalSearch('');
    }

    setActiveView(itemId as ViewKey);
    setIsPresenceMenuOpen(false);
  };

  const startChatWith = (userId: string) => {
    setActiveChat(userId);
    setActiveView('chat');
    setGlobalSearch('');
    setSearchQuery('');
  };

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = event.target.value;
    if (!currentUser) return;

    updateProfile({ color: newColor });
    updateUserColor(currentUser.id, newColor);
    setOnlineStatus(currentUser.id, true);
  };

  const handleSavePresence = () => {
    if (!currentUser) return;
    const trimmedStatus = statusDraft.trim();
    updateProfile({
      statusMessage: trimmedStatus,
      availability,
    });
    updateUserPresence(currentUser.id, {
      statusMessage: trimmedStatus,
      availability,
    });
    setIsPresenceMenuOpen(false);
  };

  const handleAcceptRequest = (requestId: string) => {
    acceptFriendRequest(requestId);
  };

  const handleRejectRequest = (requestId: string) => {
    rejectFriendRequest(requestId);
  };

  const handleOpenProfile = (userId: string) => {
    setProfileUserId(userId);
    setActiveView('contacts');
    setGlobalSearch('');
  };

  const visibleContacts = activeView === 'search' ? filteredContacts : contacts;

  const sidebarEyebrow = activeView === 'search'
    ? 'Signal Scan'
    : activeView === 'brave'
      ? 'Curated Streams'
      : 'Linked Operators';

  const sidebarHeading = activeView === 'search'
    ? 'Search the Sphere'
    : activeView === 'brave'
      ? 'Trusted Sources'
      : 'Contact Lattice';

  const getAvailabilityBadge = (value: Availability | undefined) => {
    switch (value) {
      case 'focus':
        return 'Focus';
      case 'away':
        return 'Away';
      default:
        return 'Available';
    }
  };

  const handleNavKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const focusable = navButtonRefs.current.filter(
      (button): button is HTMLButtonElement => Boolean(button)
    );

    if (!focusable.length) {
      return;
    }

    const currentIndex = focusable.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      nextIndex = (currentIndex + 1 + focusable.length) % focusable.length;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      nextIndex = (currentIndex - 1 + focusable.length) % focusable.length;
    }

    if (nextIndex !== currentIndex && focusable[nextIndex]) {
      focusable[nextIndex].focus();
    }
  };

  return (
    <div className="chat-shell p-8">
      <a href="#enclypse-chat-main" className="chat-shell__skip-link">
        Skip to active workspace
      </a>
      <aside className="chat-shell__nav" onKeyDown={handleNavKeyDown}>
        <EnclypseLogo />
        <nav className="chat-shell__nav-buttons" aria-label="Primary navigation">
          {NAV_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const isActive =
              (item.id === 'sphere' && activeView === 'sphere') ||
              (item.id !== 'sphere' && item.id !== 'profile' && activeView === item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                ref={(element) => {
                  navButtonRefs.current[index] = element;
                }}
                className={`chat-shell__nav-button ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                title={item.label}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={logout}
          className="chat-shell__nav-button logout"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </aside>

      <div className="chat-shell__layout">
        <section className="chat-shell__sidebar">
          <header className="chat-shell__sidebar-header">
            <div>
              <p className="chat-shell__eyebrow">{sidebarEyebrow}</p>
              <h2>{sidebarHeading}</h2>
            </div>
            <button
              type="button"
              className="chat-shell__sidebar-action"
              onClick={() => {
                setActiveView('search');
                requestAnimationFrame(() => sidebarSearchRef.current?.focus());
              }}
              aria-label="Create a new link"
            >
              <Plus className="h-4 w-4" />
              <span>New Link</span>
            </button>
          </header>

          <div className="chat-shell__search-field">
            <Search className="h-4 w-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Filter operators..."
              ref={sidebarSearchRef}
              aria-label="Filter contacts"
            />
          </div>

          <div className="chat-shell__contacts" role="list">
            {visibleContacts.length > 0 ? (
              visibleContacts.map((contact) => {
                const isActive = activeChat === contact.id;
                return (
                  <div
                    key={contact.id}
                    className={`chat-shell__contact ${isActive ? 'active' : ''}`}
                    role="listitem"
                  >
                    <button
                      type="button"
                      onClick={() => startChatWith(contact.id)}
                      className="chat-shell__contact-main"
                    >
                      <span className="chat-shell__contact-avatar" style={{ backgroundColor: contact.color }} />
                      <div className="chat-shell__contact-meta">
                        <span className="chat-shell__contact-name">{contact.name}</span>
                        <span className="chat-shell__contact-status">
                          <span
                            className={`chat-shell__status-dot ${
                              contact.online ? `online ${contact.availability ?? 'available'}` : ''
                            }`}
                            aria-hidden="true"
                          />
                          {contact.online ? getAvailabilityBadge(contact.availability) : 'Offline'}
                        </span>
                        <span className="chat-shell__contact-status-message">
                          {contact.statusMessage || 'No status broadcast'}
                        </span>
                        {contact.languages && contact.languages.length > 0 && (
                          <span className="chat-shell__contact-languages">
                            {contact.languages.map((code) => code.toUpperCase()).join(' · ')}
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      className="chat-shell__contact-profile"
                      onClick={() => handleOpenProfile(contact.id)}
                      aria-label={`Open ${contact.name}'s profile`}
                    >
                      <UserCircle2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="chat-shell__empty-state">
                <h3>No operators found</h3>
                <p>Try a different search query or initiate a new link.</p>
              </div>
            )}
          </div>
        </section>

        <section className="chat-shell__main" id="enclypse-chat-main">
          <header className="chat-shell__main-header">
            <div className="chat-shell__main-search" aria-expanded={globalSearch.length > 0}>
              <Search className="h-4 w-4" />
              <input
                ref={headerSearchRef}
                type="search"
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                placeholder="Search the sphere for operatives, channels, or signals..."
                aria-label="Search the sphere"
              />
              {globalSearch && (
                <button
                  type="button"
                  className="chat-shell__search-clear"
                  onClick={() => {
                    setGlobalSearch('');
                    headerSearchRef.current?.focus();
                  }}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {globalSearch && (
                <div className="chat-shell__search-results" role="listbox">
                  {globalSearchResults.length > 0 ? (
                    globalSearchResults.map((result) => (
                      <div key={result.id} className="chat-shell__search-result" role="option">
                        <div className="chat-shell__search-result-meta">
                          <span
                            className="chat-shell__contact-avatar"
                            style={{ backgroundColor: result.color }}
                          />
                          <div>
                            <p>{result.name}</p>
                            <span className="chat-shell__search-status">
                            <span
                                className={`chat-shell__status-dot ${
                                  result.online ? `online ${result.availability ?? 'available'}` : ''
                                }`}
                                aria-hidden="true"
                              />
                              {result.online ? getAvailabilityBadge(result.availability) : 'Offline'}
                            </span>
                            <span className="chat-shell__search-status-message">
                              {result.statusMessage || 'No status broadcast'}
                            </span>
                            {result.languages && result.languages.length > 0 && (
                              <span className="chat-shell__search-languages">
                                {result.languages.map((code) => code.toUpperCase()).join(' · ')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="chat-shell__search-result-actions">
                          <button type="button" onClick={() => handleOpenProfile(result.id)}>
                            Profile
                          </button>
                          <button type="button" onClick={() => startChatWith(result.id)}>
                            Open Chat
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="chat-shell__search-empty">No matches found</div>
                  )}
                </div>
              )}
            </div>

              <div className="chat-shell__main-actions">
                <div className="chat-shell__action-group">
                  <button
                    type="button"
                    className={`chat-shell__action-button ${isPresenceMenuOpen ? 'active' : ''}`}
                    onClick={() => {
                      setIsPresenceMenuOpen((prev) => !prev);
                      setIsThemeMenuOpen(false);
                      setIsRequestsOpen(false);
                    }}
                    aria-haspopup="dialog"
                    aria-expanded={isPresenceMenuOpen}
                    aria-controls="enclypse-presence-control"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Presence</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {isPresenceMenuOpen && (
                    <div
                      className="chat-shell__dropdown chat-shell__dropdown--wide"
                      role="dialog"
                      id="enclypse-presence-control"
                      aria-label="Update your Enclypse presence"
                    >
                      <div className="chat-shell__dropdown-section">
                        <p className="chat-shell__dropdown-title">Availability</p>
                        <div className="chat-shell__availability-grid">
                          {AVAILABILITY_OPTIONS.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setAvailability(option.id)}
                              className={`chat-shell__availability-card ${
                                availability === option.id ? 'active' : ''
                              }`}
                            >
                              <option.Icon className="h-4 w-4" aria-hidden="true" />
                              <div>
                                <span>{option.label}</span>
                                <p>{option.description}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="chat-shell__dropdown-section">
                        <label htmlFor="enclypse-status-message">Broadcast</label>
                        <textarea
                          id="enclypse-status-message"
                          value={statusDraft}
                          onChange={(event) => setStatusDraft(event.target.value)}
                          rows={2}
                          placeholder="Signal your focus or intent to the network."
                        />
                        <div className="chat-shell__status-presets" role="list">
                          {STATUS_PRESETS.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              className="chat-shell__status-chip"
                              onClick={() => setStatusDraft(preset)}
                              role="listitem"
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="chat-shell__dropdown-actions">
                        <button type="button" className="chat-shell__dropdown-save" onClick={handleSavePresence}>
                          Update presence
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="chat-shell__action-group">
                  <button
                    type="button"
                    className={`chat-shell__action-button ${isThemeMenuOpen ? 'active' : ''}`}
                    onClick={() => {
                      setIsThemeMenuOpen((prev) => !prev);
                      setIsRequestsOpen(false);
                      setIsPresenceMenuOpen(false);
                    }}
                    aria-haspopup="listbox"
                    aria-expanded={isThemeMenuOpen}
                  >
                  <Palette className="h-4 w-4" />
                  <span>{THEME_OPTIONS.find((theme) => theme.id === currentTheme)?.label ?? 'Theme'}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {isThemeMenuOpen && (
                  <div className="chat-shell__dropdown" role="listbox">
                    {THEME_OPTIONS.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => {
                          setTheme(theme.id);
                          setIsThemeMenuOpen(false);
                        }}
                        className={`chat-shell__dropdown-item ${currentTheme === theme.id ? 'active' : ''}`}
                      >
                        {theme.label}
                      </button>
                    ))}
                    <div className="chat-shell__dropdown-divider" />
                    <button
                      type="button"
                      className="chat-shell__dropdown-item"
                      onClick={() => setShowColorPicker((prev) => !prev)}
                    >
                      Adjust Node Color
                    </button>
                    {showColorPicker && (
                      <div className="chat-shell__color-picker">
                        <input
                          type="color"
                          value={currentUser.color}
                          onChange={handleColorChange}
                          aria-label="Select node color"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

                <div className="chat-shell__action-group">
                  <button
                    type="button"
                    className={`chat-shell__action-button ${isRequestsOpen ? 'active' : ''}`}
                    onClick={() => {
                      setIsRequestsOpen((prev) => !prev);
                      setIsThemeMenuOpen(false);
                      setIsPresenceMenuOpen(false);
                    }}
                    aria-haspopup="true"
                    aria-expanded={isRequestsOpen}
                    aria-controls="enclypse-friend-requests"
                    >
                    <Bell className="h-4 w-4" />
                    {pendingRequests.length > 0 && (
                    <span
                      className="chat-shell__badge"
                      aria-label={`${pendingRequests.length} pending requests`}
                      aria-live="polite"
                    >
                      {pendingRequests.length}
                    </span>
                  )}
                </button>

                {isRequestsOpen && (
                  <div
                    className="chat-shell__dropdown chat-shell__dropdown--right"
                    id="enclypse-friend-requests"
                    role="dialog"
                    aria-label="Pending friend requests"
                  >
                    <header>
                      <h3>Friend Requests</h3>
                    </header>
                    {pendingRequests.length > 0 ? (
                      <ul>
                        {pendingRequests.map((request) => {
                          const fromUser = users.find((user) => user.id === request.fromUserId);
                          if (!fromUser) return null;
                          return (
                            <li key={request.id}>
                              <div className="chat-shell__request">
                                <div className="chat-shell__request-meta">
                                  <span
                                    className="chat-shell__contact-avatar"
                                    style={{ backgroundColor: fromUser.color }}
                                  />
                                  <div>
                                    <p>{fromUser.name}</p>
                                    <span>Wants to connect</span>
                                  </div>
                                </div>
                                <div className="chat-shell__request-actions">
                                  <button type="button" onClick={() => handleAcceptRequest(request.id)}>
                                    Accept
                                  </button>
                                  <button type="button" onClick={() => handleRejectRequest(request.id)}>
                                    Dismiss
                                  </button>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="chat-shell__empty-dropdown">No pending requests</div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="chat-shell__user-button"
                onClick={() => setProfileUserId(currentUser.id)}
              >
                <span
                  className="chat-shell__user-avatar"
                  style={{ backgroundColor: currentUser.color }}
                />
                <div className="chat-shell__user-meta">
                  <div className="chat-shell__user-header">
                    <span className="chat-shell__user-name">{currentUser.name}</span>
                    <span className={`chat-shell__availability-pill ${currentUser.availability ?? 'available'}`}>
                      {getAvailabilityBadge(currentUser.availability)}
                    </span>
                  </div>
                  <span className="chat-shell__user-status">
                    {currentUser.statusMessage?.trim() || 'Broadcast your focus to the lattice.'}
                  </span>
                </div>
              </button>
            </div>
          </header>

          <div className="chat-shell__main-content">
            {activeView === 'sphere' ? (
              <div className="chat-shell__scene">
                <Scene />
              </div>
            ) : activeView === 'brave' ? (
              <BraveWorkspace />
            ) : (
              <ChatWindow activeChatId={activeChat} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
