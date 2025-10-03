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

const NAV_ITEMS = [
  { id: 'sphere', label: 'Sphere', icon: Globe2 },
  { id: 'contacts', label: 'Contacts', icon: Users2 },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'profile', label: 'Profile', icon: UserCircle2 },
] as const;

type NavKey = (typeof NAV_ITEMS)[number]['id'];

type ViewKey = Exclude<NavKey, 'profile'>;

const THEME_OPTIONS: { id: ThemeType; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'neon', label: 'Neon' },
  { id: 'galaxy', label: 'Galaxy' },
  { id: 'matrix', label: 'Matrix' },
  { id: 'minimal', label: 'Minimal' },
];

export function ChatShell() {
  const [activeView, setActiveView] = useState<ViewKey>('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);

  const sidebarSearchRef = useRef<HTMLInputElement>(null);
  const headerSearchRef = useRef<HTMLInputElement>(null);

  const currentUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const setProfileUserId = useModalStore((state) => state.setProfileUserId);
  const { activeChat, setActiveChat } = useChatStore();
  const users = useUserStore((state) => state.users);
  const updateUserColor = useUserStore((state) => state.updateUserColor);
  const setOnlineStatus = useUserStore((state) => state.setOnlineStatus);
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
    if (activeView === 'search') {
      const frame = requestAnimationFrame(() => sidebarSearchRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [activeView]);

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

  return (
    <div className="chat-shell p-8">
      <aside className="chat-shell__nav">
        <EnclypseLogo />
        <nav className="chat-shell__nav-buttons" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              (item.id === 'sphere' && activeView === 'sphere') ||
              (item.id !== 'sphere' && item.id !== 'profile' && activeView === item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`chat-shell__nav-button ${isActive ? 'active' : ''}`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <button type="button" onClick={logout} className="chat-shell__nav-button logout">
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </aside>

      <div className="chat-shell__layout">
        <section className="chat-shell__sidebar">
          <header className="chat-shell__sidebar-header">
            <div>
              <p className="chat-shell__eyebrow">{activeView === 'search' ? 'Signal Scan' : 'Linked Operators'}</p>
              <h2>{activeView === 'search' ? 'Search the Sphere' : 'Contact Lattice'}</h2>
            </div>
            <button
              type="button"
              className="chat-shell__sidebar-action"
              onClick={() => {
                setActiveView('search');
                requestAnimationFrame(() => sidebarSearchRef.current?.focus());
              }}
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
                          <span className={`chat-shell__status-dot ${contact.online ? 'online' : ''}`} />
                          {contact.online ? 'Online' : 'Offline'}
                        </span>
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

        <section className="chat-shell__main">
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
                            <span>
                              <span className={`chat-shell__status-dot ${result.online ? 'online' : ''}`} />
                              {result.online ? 'Online' : 'Offline'}
                            </span>
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
                  className={`chat-shell__action-button ${isThemeMenuOpen ? 'active' : ''}`}
                  onClick={() => {
                    setIsThemeMenuOpen((prev) => !prev);
                    setIsRequestsOpen(false);
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
                  }}
                  aria-haspopup="true"
                  aria-expanded={isRequestsOpen}
                >
                  <Bell className="h-4 w-4" />
                  {pendingRequests.length > 0 && (
                    <span className="chat-shell__badge" aria-label={`${pendingRequests.length} pending requests`}>
                      {pendingRequests.length}
                    </span>
                  )}
                </button>

                {isRequestsOpen && (
                  <div className="chat-shell__dropdown chat-shell__dropdown--right">
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
                <span>{currentUser.name}</span>
              </button>
            </div>
          </header>

          <div className="chat-shell__main-content">
            {activeView === 'sphere' ? (
              <div className="chat-shell__scene">
                <Scene />
              </div>
            ) : (
              <ChatWindow activeChatId={activeChat} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
