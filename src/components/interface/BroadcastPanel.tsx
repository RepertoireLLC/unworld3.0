import { useMemo, useState, useEffect } from 'react';
import { Satellite, Waves, MessageSquare, Shield, PlugZap } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';

export function BroadcastPanel() {
  const { activeChat, setActiveChat, getMessagesForChat } = useChatStore();
  const currentUser = useAuthStore((state) => state.user);
  const users = useUserStore((state) => state.users);
  const [selectedChannel, setSelectedChannel] = useState(activeChat ?? '');

  useEffect(() => {
    setSelectedChannel(activeChat ?? '');
  }, [activeChat]);

  const otherUsers = useMemo(
    () => users.filter((user) => user.id !== currentUser?.id),
    [users, currentUser]
  );

  const activeUser = otherUsers.find((user) => user.id === activeChat);
  const transcript =
    currentUser && activeUser
      ? getMessagesForChat(currentUser.id, activeUser.id)
      : [];

  return (
    <section className="ui-panel h-full">
      <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/60">
        <span className="ui-chip border-emerald-400/40 text-emerald-200">Quantum Axis // Aligned</span>
        <span className="ui-chip border-sky-400/40 text-sky-200">Broadcast Mode</span>
        <span className="ui-chip border-white/10 text-white/60">Link Integrity 99%</span>
      </div>

      <div className="ui-card gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="ui-stack gap-2">
            <h2 className="text-2xl font-semibold text-white">Encrypted Relay // Broadcast</h2>
            <p className="max-w-xl text-sm text-white/60">
              Choose a channel to open a secure quantum link. All transmissions are end-to-end encrypted and logged to the vault for 72 hours.
            </p>
          </div>
          <Satellite className="h-8 w-8 text-sky-300" />
        </div>

        <div className="ui-card text-center">
          {activeUser ? (
            <div className="ui-stack">
              <p className="text-sm uppercase tracking-[0.3em] text-white/60">Active transmission</p>
              <h3 className="text-2xl font-semibold text-white">{activeUser.name}</h3>
              <p className="text-sm text-white/60">
                {transcript.length > 0
                  ? `Last signal: ${transcript[transcript.length - 1].content}`
                  : 'Awaiting first transmission...'}
              </p>
            </div>
          ) : (
            <div className="ui-stack">
              <p className="text-sm uppercase tracking-[0.3em] text-white/60">No transmissions yet</p>
              <h3 className="text-2xl font-semibold text-white">Select a channel to begin</h3>
              <p className="text-sm text-white/60">Awaiting link handshake...</p>
            </div>
          )}
        </div>

        <div className="ui-grid md:grid-cols-2">
          <div className="ui-card gap-3">
            <label className="text-xs uppercase tracking-[0.3em] text-white/60">Channel Selection</label>
            <select
              value={selectedChannel}
              onChange={(event) => setSelectedChannel(event.target.value)}
              className="w-full rounded-[calc(var(--theme-radius)*0.55)] border border-white/12 bg-slate-950/60 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
            >
              <option value="" disabled>
                Choose linked operator
              </option>
              {otherUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.online ? '(Online)' : '(Offline)'}
                </option>
              ))}
            </select>
            <p className="text-xs text-white/50">
              Selecting a channel prepares a private, encrypted relay path.
            </p>
          </div>

          <div className="ui-card justify-between">
            <div className="flex items-center justify-between text-sm text-white/60">
              <span>Handshake Status</span>
              <Shield className={`h-5 w-5 ${activeUser ? 'text-emerald-300' : 'text-white/40'}`} />
            </div>
            <div className="ui-stack gap-1">
              <p className="text-lg font-semibold text-white">
                {activeUser ? 'Secured' : 'Awaiting Link'}
              </p>
              <p className="text-xs text-white/50">
                {activeUser
                  ? 'Channel authenticated. Ready to transmit.'
                  : 'Select a channel to initiate the secure handshake.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => selectedChannel && setActiveChat(selectedChannel)}
                disabled={!selectedChannel}
                className={`ui-button ui-button--primary flex-1 ${activeUser ? 'text-emerald-100' : ''}`}
              >
                {activeUser ? 'Switch Channel' : 'Prepare Sync Capsule'}
              </button>
              {activeUser && (
                <button onClick={() => setActiveChat(null)} className="ui-button ui-button--ghost">
                  Terminate
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="ui-grid md:grid-cols-3">
        <div className="ui-card">
          <div className="flex items-center justify-between text-sm text-white/60">
            <span>Relay Logs</span>
            <MessageSquare className="h-5 w-5 text-sky-300" />
          </div>
          <p className="text-xs text-white/50">
            {transcript.length} encrypted packets stored in session buffer.
          </p>
        </div>
        <div className="ui-card">
          <div className="flex items-center justify-between text-sm text-white/60">
            <span>Synchronization</span>
            <Waves className="h-5 w-5 text-emerald-300" />
          </div>
          <p className="text-xs text-white/50">
            {activeUser ? 'Live presence detected on linked node.' : 'No active link. Awaiting handshake.'}
          </p>
        </div>
        <div className="ui-card">
          <div className="flex items-center justify-between text-sm text-white/60">
            <span>Power State</span>
            <PlugZap className="h-5 w-5 text-fuchsia-300" />
          </div>
          <p className="text-xs text-white/50">All relays operating at nominal capacity.</p>
        </div>
      </div>
    </section>
  );
}
