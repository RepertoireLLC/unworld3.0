import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bluetooth,
  Globe2,
  LogOut,
  MessageCircle,
  NotebookPen,
  Paperclip,
  Search as SearchIcon,
  Send,
  Settings2,
  UserCircle,
  Users,
  Wifi,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUserStore } from '../store/userStore';
import { useModalStore } from '../store/modalStore';
import { useChatStore } from '../store/chatStore';
import { useNotepadStore } from '../store/notepadStore';
import { useFriendStore } from '../store/friendStore';
import { useThemeStore } from '../store/themeStore';

const NAV_ITEMS = [
  { id: 'sphere', label: 'Sphere', icon: Globe2 },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'search', label: 'Search', icon: SearchIcon },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'profile', label: 'Profile', icon: UserCircle },
] as const;

type NavItemId = (typeof NAV_ITEMS)[number]['id'];
type ChannelMode = 'wifi' | 'bluetooth' | 'auto';

const CHANNEL_CONFIG: Record<ChannelMode, { label: string; description: string; tone: string }> = {
  wifi: {
    label: 'Wi-Fi',
    description: 'Connected via secure mesh Wi-Fi',
    tone: 'text-emerald-300',
  },
  bluetooth: {
    label: 'Bluetooth',
    description: 'Channel status unavailable',
    tone: 'text-amber-300',
  },
  auto: {
    label: 'Auto Configure',
    description: 'Optimizing channel selection…',
    tone: 'text-sky-300',
  },
};

export function InterfacePanel() {
  const [activeTab, setActiveTab] = useState<NavItemId>('chat');
  const [channelMode, setChannelMode] = useState<ChannelMode>('wifi');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const messageEndRef = useRef<HTMLDivElement>(null);

  const logout = useAuthStore((state) => state.logout);
  const currentUser = useAuthStore((state) => state.user);
  const users = useUserStore((state) => state.users);
  const setProfileUserId = useModalStore((state) => state.setProfileUserId);
  const { activeChat, setActiveChat, sendMessage, getMessagesForChat } = useChatStore();
  const setNotepadOpen = useNotepadStore((state) => state.setPanelOpen);
  const theme = useThemeStore((state) => state.currentTheme);

  const {
    friendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    sendFriendRequest,
    hasPendingRequest,
    isFriend,
  } = useFriendStore();

  const contacts = useMemo(
    () => users.filter((user) => user.id !== currentUser?.id),
    [users, currentUser?.id]
  );

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === activeChat) ?? null,
    [contacts, activeChat]
  );

  const messages = currentUser && activeChat
    ? getMessagesForChat(currentUser.id, activeChat)
    : [];

  useEffect(() => {
    requestAnimationFrame(() => {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, [messages.length, activeChat]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return contacts;
    }

    return contacts.filter((user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contacts, searchQuery]);

  const pendingRequests = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    return friendRequests.filter(
      (request) =>
        request.status === 'pending' && request.toUserId === currentUser.id
    );
  }, [friendRequests, currentUser]);

  const handleSendMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser || !activeChat) {
      return;
    }

    const trimmed = messageDraft.trim();
    if (!trimmed) {
      return;
    }

    sendMessage(currentUser.id, activeChat, trimmed);
    setMessageDraft('');

    requestAnimationFrame(() => {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  const handleSelectFriend = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextId = event.target.value || null;
    setActiveChat(nextId);
  };

  const handleTabChange = (tab: NavItemId) => {
    setActiveTab(tab);
    if (tab === 'chat' && !activeChat && contacts[0]) {
      setActiveChat(contacts[0].id);
    }
  };

  const handleLogout = () => {
    logout();
    setActiveTab('chat');
  };

  const handleOpenNotepad = () => {
    if (!currentUser) {
      return;
    }

    setNotepadOpen(currentUser.id, true);
  };

  const renderChannelButton = (mode: ChannelMode) => {
    const isActive = channelMode === mode;
    const Icon = mode === 'wifi' ? Wifi : mode === 'bluetooth' ? Bluetooth : Settings2;

    return (
      <button
        key={mode}
        onClick={() => setChannelMode(mode)}
        type="button"
        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 ${
          isActive
            ? 'bg-white/20 border-white/40 text-white'
            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
        }`}
      >
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{CHANNEL_CONFIG[mode].label}</span>
      </button>
    );
  };

  const renderChatContent = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold text-white">Chat</h2>
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
          </div>
          <p className="mt-1 text-sm text-white/70">
            {selectedContact
              ? `Channel with ${selectedContact.name}`
              : 'Select a friend to start a conversation.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col text-xs text-white/50">
            <span className="uppercase tracking-[0.2em]">Select a friend</span>
            <select
              value={activeChat ?? ''}
              onChange={handleSelectFriend}
              className="mt-2 w-48 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none"
            >
              <option value="">Choose a contact…</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleOpenNotepad}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            <NotebookPen className="w-4 h-4" />
            Notepad
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-[0.3em] text-white/50">Channel</h3>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {(['wifi', 'bluetooth', 'auto'] as ChannelMode[]).map(renderChannelButton)}
          <span className={`text-sm ${CHANNEL_CONFIG[channelMode].tone}`}>
            {CHANNEL_CONFIG[channelMode].description}
          </span>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <div className="h-72 overflow-y-auto space-y-4 pr-1 custom-scroll">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-white/50">
              {activeChat
                ? 'No messages yet. Say hi!'
                : 'Choose someone from your contacts to begin chatting.'}
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.fromUserId === currentUser?.id;
              const alignment = isOwn ? 'items-end text-right' : 'items-start text-left';
              const bubbleStyles = isOwn
                ? 'bg-sky-500/30 text-white'
                : 'bg-white/15 text-white';

              return (
                <div key={msg.id} className={`flex flex-col ${alignment}`}>
                  <div className={`inline-flex max-w-[75%] flex-col gap-1 rounded-2xl px-4 py-3 ${bubbleStyles}`}>
                    <span className="text-sm leading-relaxed">{msg.content}</span>
                  </div>
                  <span className="mt-1 text-xs text-white/40">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messageEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="mt-4 flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
          >
            <Paperclip className="w-4 h-4" />
            Attach
          </button>
          <input
            value={messageDraft}
            onChange={(event) => setMessageDraft(event.target.value)}
            placeholder={selectedContact ? 'Type an encrypted message…' : 'Select a friend to enable messaging'}
            disabled={!selectedContact}
            className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!selectedContact || !messageDraft.trim()}
            className="flex items-center gap-2 rounded-xl bg-sky-500/80 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
          >
            Send
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );

  const renderContactsContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Contacts</h2>
        <span className="rounded-full bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.2em] text-white/60">
          {contacts.filter((contact) => contact.online).length} online
        </span>
      </div>

      {pendingRequests.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="text-sm font-semibold text-white">Pending Requests</h3>
          <div className="mt-3 space-y-3">
            {pendingRequests.map((request) => {
              const fromUser = users.find((user) => user.id === request.fromUserId);
              if (!fromUser) {
                return null;
              }

              return (
                <div key={request.id} className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-full border border-white/20"
                      style={{ backgroundColor: fromUser.color }}
                    />
                    <div>
                      <p className="text-sm font-medium text-white">{fromUser.name}</p>
                      <p className="text-xs text-white/50">wants to connect</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => acceptFriendRequest(request.id)}
                      className="rounded-lg bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-200 hover:bg-emerald-500/30"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => rejectFriendRequest(request.id)}
                      className="rounded-lg bg-red-500/20 px-3 py-1 text-sm font-medium text-red-200 hover:bg-red-500/30"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5">
        <div className="border-b border-white/10 px-6 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">Friends</h3>
        </div>
        <div className="divide-y divide-white/10">
          {contacts.map((contact) => {
            const pendingToContact = currentUser
              ? hasPendingRequest(currentUser.id, contact.id)
              : false;
            const alreadyFriend = currentUser
              ? isFriend(currentUser.id, contact.id)
              : false;
            const pendingFromContact = pendingRequests.some(
              (request) => request.fromUserId === contact.id
            );
            const disableAddFriend =
              alreadyFriend || pendingToContact || pendingFromContact || !currentUser;
            const addFriendLabel = alreadyFriend
              ? 'Connected'
              : pendingToContact
                ? 'Request sent'
                : pendingFromContact
                  ? 'Respond in inbox'
                  : 'Add friend';

            return (
              <div key={contact.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-full border border-white/10"
                    style={{ backgroundColor: contact.color }}
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{contact.name}</p>
                    <p className="text-xs text-white/50">
                      {contact.online ? 'Online now' : 'Offline'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveChat(contact.id);
                      setActiveTab('chat');
                    }}
                    className="rounded-lg border border-white/10 px-3 py-1 text-sm text-white hover:bg-white/10"
                  >
                    Open chat
                  </button>
                  <button
                    onClick={() => setProfileUserId(contact.id)}
                    className="rounded-lg border border-white/10 px-3 py-1 text-sm text-white/70 hover:bg-white/10"
                  >
                    View profile
                  </button>
                  <button
                    onClick={() => currentUser && sendFriendRequest(currentUser.id, contact.id)}
                    disabled={disableAddFriend}
                    className="rounded-lg border border-white/10 px-3 py-1 text-sm text-white/70 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {addFriendLabel}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderSearchContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Search</h2>
        <span className="text-sm text-white/50">Discover people across the sphere</span>
      </div>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search users by name…"
          className="w-full rounded-2xl border border-white/10 bg-white/10 py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredUsers.map((user) => (
          <div key={user.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div
                className="h-12 w-12 rounded-full border border-white/20"
                style={{ backgroundColor: user.color }}
              />
              <div>
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-white/50">
                  {user.online ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => setProfileUserId(user.id)}
                className="rounded-lg border border-white/10 px-3 py-1 text-sm text-white/80 hover:bg-white/10"
              >
                View profile
              </button>
              {currentUser && user.id !== currentUser.id && (
                <button
                  onClick={() => {
                    setActiveChat(user.id);
                    setActiveTab('chat');
                  }}
                  className="rounded-lg border border-white/10 px-3 py-1 text-sm text-white hover:bg-white/10"
                >
                  Message
                </button>
              )}
            </div>
          </div>
        ))}
        {filteredUsers.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/50">
            No users match your search yet.
          </div>
        )}
      </div>
    </div>
  );

  const renderSphereContent = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-white">Sphere overview</h2>
      <p className="text-sm leading-6 text-white/70">
        The sphere visualizes the current network of connected explorers. Orbit the
        scene to inspect active nodes, or select a contact to open their profile
        without leaving the experience.
      </p>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">
          Current theme
        </h3>
        <p className="mt-2 text-sm text-white">
          {theme.charAt(0).toUpperCase() + theme.slice(1)}
        </p>
        <p className="mt-1 text-xs text-white/50">
          Use the palette control to the right of the interface to experiment with
          different looks.
        </p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">
          Quick tips
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-white/70">
          <li>• Drag to orbit, scroll to zoom, and click nodes to open profiles.</li>
          <li>• Online contacts glow with motion to make them easy to spot.</li>
          <li>• Switch to another tab at any time to manage chats or notes.</li>
        </ul>
      </div>
    </div>
  );

  const renderProfileContent = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div
          className="h-16 w-16 rounded-full border border-white/20"
          style={{ backgroundColor: currentUser?.color ?? '#64748b' }}
        />
        <div>
          <h2 className="text-2xl font-semibold text-white">{currentUser?.name}</h2>
          {currentUser?.status && (
            <p className="text-sm text-white/60">{currentUser.status}</p>
          )}
          <p className="text-xs text-white/40">Signed in as {currentUser?.email}</p>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-semibold text-white">Profile controls</h3>
        <p className="mt-2 text-sm text-white/70">
          Update your avatar, status, and personal details to stay in sync across the
          experience.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => currentUser && setProfileUserId(currentUser.id)}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
          >
            Edit profile
          </button>
          <button
            onClick={handleOpenNotepad}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/10"
          >
            Open notepad
          </button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'sphere':
        return renderSphereContent();
      case 'contacts':
        return renderContactsContent();
      case 'search':
        return renderSearchContent();
      case 'profile':
        return renderProfileContent();
      case 'chat':
      default:
        return renderChatContent();
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 py-10 sm:px-8">
      <div className="pointer-events-auto w-full max-w-5xl rounded-[2.5rem] border border-white/10 bg-black/40 p-8 shadow-2xl backdrop-blur-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-6">
          <nav className="flex flex-wrap items-center gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabChange(item.id)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all ${
                    isActive
                      ? 'bg-white/20 text-white shadow-lg shadow-cyan-500/20'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/20 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
