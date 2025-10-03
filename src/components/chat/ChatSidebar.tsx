import { useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { useFriendStore } from '../../store/friendStore';
import { useUserStore } from '../../store/userStore';
import { MessageSquare, UserPlus, UserCheck } from 'lucide-react';
import { createChatId } from '../../utils/chat';

export function ChatSidebar() {
  const [contactQuery, setContactQuery] = useState('');
  const currentUser = useAuthStore((state) => state.user);
  const messages = useChatStore((state) => state.messages);
  const activeChat = useChatStore((state) => state.activeChat);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const users = useUserStore((state) => state.users);
  const { friendRequests, sendFriendRequest, isFriend } = useFriendStore();

  const contacts = useMemo(() => {
    if (!currentUser) return [];
    return users.filter((user) =>
      user.id !== currentUser.id &&
      isFriend(currentUser.id, user.id)
    );
  }, [currentUser, users, isFriend]);

  const availableUsers = useMemo(() => {
    if (!currentUser) return [];
    return users
      .filter((user) => user.id !== currentUser.id)
      .filter((user) => {
        if (isFriend(currentUser.id, user.id)) return false;
        const pendingBetween = friendRequests.some(
          (request) =>
            request.status === 'pending' &&
            ((request.fromUserId === currentUser.id && request.toUserId === user.id) ||
              (request.fromUserId === user.id && request.toUserId === currentUser.id))
        );
        return !pendingBetween;
      })
      .filter((user) =>
        user.name.toLowerCase().includes(contactQuery.toLowerCase())
      );
  }, [contactQuery, currentUser, users, isFriend, friendRequests]);

  if (!currentUser) {
    return null;
  }

  const renderContact = (contactId: string) => {
    const user = users.find((item) => item.id === contactId);
    if (!user) return null;

    const chatId = createChatId(currentUser.id, user.id);
    const conversationMessages = messages
      .filter((message) => message.chatId === chatId)
      .sort((a, b) => b.timestamp - a.timestamp);

    const lastMessage = conversationMessages[0];
    const unreadCount = conversationMessages.filter(
      (message) => message.toUserId === currentUser.id && message.status !== 'read'
    ).length;

    return (
      <button
        key={user.id}
        onClick={() => setActiveChat(user.id, currentUser.id)}
        className={`w-full text-left px-4 py-3 rounded-lg transition-colors border border-transparent ${
          activeChat === user.id ? 'bg-white/15 border-white/20' : 'hover:bg-white/10'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: user.color }}
              >
                <span className="text-white text-sm font-semibold">
                  {user.name[0].toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="text-white font-medium">{user.name}</p>
              <p className="text-xs text-white/70 truncate max-w-[180px]">
                {lastMessage ? lastMessage.content || 'Attachment' : user.statusMessage || 'No recent messages'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {user.online ? <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> : null}
            {unreadCount > 0 && (
              <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-200 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  const pendingRequests = friendRequests.filter(
    (request) => request.status === 'pending' && request.toUserId === currentUser.id
  );

  return (
    <aside className="fixed left-4 top-4 bottom-4 w-72 bg-white/10 backdrop-blur-lg border border-white/10 rounded-2xl p-4 flex flex-col space-y-4 z-20 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5" /> Chats
          </h2>
          <p className="text-xs text-white/60">Stay close to your contacts</p>
        </div>
        {pendingRequests.length > 0 && (
          <span className="px-2 py-1 text-xs bg-amber-500/20 text-amber-200 rounded-full">
            {pendingRequests.length} pending
          </span>
        )}
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">Contacts</label>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {contacts.length > 0 ? contacts.map((contact) => renderContact(contact.id)) : (
            <p className="text-sm text-white/60">No friends yet. Add someone below!</p>
          )}
        </div>
      </div>

      <div className="mt-auto">
        <h3 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Add a contact
        </h3>
        <input
          type="text"
          value={contactQuery}
          onChange={(event) => setContactQuery(event.target.value)}
          placeholder="Search users to add"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/30"
        />
        <div className="mt-2 max-h-40 overflow-y-auto space-y-2">
          {contactQuery && availableUsers.length === 0 && (
            <p className="text-xs text-white/60">No users found</p>
          )}
          {availableUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: user.color }}
                >
                  <span className="text-white text-xs font-semibold">
                    {user.name[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-white text-sm">{user.name}</p>
                  <p className="text-[10px] text-white/60">{user.statusMessage || 'No status yet'}</p>
                </div>
              </div>
              <button
                onClick={() => sendFriendRequest(currentUser.id, user.id)}
                className="flex items-center gap-1 px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs"
              >
                <UserCheck className="w-3 h-3" /> Add
              </button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
