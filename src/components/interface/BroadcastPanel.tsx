import { useMemo, useState, useEffect } from 'react';
import { Satellite, Waves, MessageSquare, Shield, PlugZap } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';

export function BroadcastPanel() {
  const { activeChat, setActiveChat, getMessagesForChat } = useChatStore();
  const currentUser = useAuthStore((state) => state.user);
  const visibleUsers = useUserStore((state) =>
    currentUser ? state.getVisibleUsers(currentUser.id) : []
  );
  const [selectedChannel, setSelectedChannel] = useState(activeChat ?? '');

  useEffect(() => {
    setSelectedChannel(activeChat ?? '');
  }, [activeChat]);

  const otherUsers = useMemo(
    () => visibleUsers.filter((user) => user.id !== currentUser?.id),
    [visibleUsers, currentUser]
  );

  const activeUser = otherUsers.find((user) => user.id === activeChat);
  const transcript =
    currentUser && activeUser
      ? getMessagesForChat(currentUser.id, activeUser.id, currentUser.id)
      : [];

  return (
    <section className="flex h-full flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)]">
      <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/50">
        <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-emerald-300">
          Quantum Axis // Aligned
        </span>
        <span className="rounded-full border border-sky-400/40 bg-sky-500/10 px-3 py-1 text-sky-300">
          Broadcast Mode
        </span>
        <span className="rounded-full border border-white/10 px-3 py-1 text-white/60">
          Link Integrity 99%
        </span>
      </div>

      <div className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-slate-950/60 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Encrypted Relay // Broadcast</h2>
            <p className="mt-2 max-w-xl text-sm text-white/60">
              Choose a channel to open a secure quantum link. All transmissions are end-to-end encrypted and logged to the vault for 72 hours.
            </p>
          </div>
          <Satellite className="h-8 w-8 text-sky-300" />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          {activeUser ? (
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.3em] text-white/50">Active transmission</p>
              <h3 className="text-2xl font-semibold text-white">{activeUser.name}</h3>
              <p className="text-sm text-white/60">
                {transcript.length > 0
                  ? `Last signal: ${transcript[transcript.length - 1].content}`
                  : 'Awaiting first transmission...'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.3em] text-white/50">No transmissions yet</p>
              <h3 className="text-2xl font-semibold text-white">Select a channel to begin</h3>
              <p className="text-sm text-white/60">Awaiting link handshake...</p>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="text-xs uppercase tracking-[0.3em] text-white/50">
              Channel Selection
            </label>
            <select
              value={selectedChannel}
              onChange={(event) => setSelectedChannel(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
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

          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between text-sm text-white/60">
              <span>Handshake Status</span>
              <Shield className={`h-5 w-5 ${activeUser ? 'text-emerald-300' : 'text-white/40'}`} />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">
                {activeUser ? 'Secured' : 'Awaiting Link'}
              </p>
              <p className="text-xs text-white/50">
                {activeUser
                  ? 'Channel authenticated. Ready to transmit.'
                  : 'Select a channel to initiate the secure handshake.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => selectedChannel && setActiveChat(selectedChannel)}
                disabled={!selectedChannel}
                className="flex-1 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-xs uppercase tracking-[0.3em] text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/40"
              >
                {activeUser ? 'Switch Channel' : 'Prepare Sync Capsule'}
              </button>
              {activeUser && (
                <button
                  onClick={() => setActiveChat(null)}
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-xs uppercase tracking-[0.3em] text-white/60 transition hover:bg-white/20"
                >
                  Terminate
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between text-sm text-white/60">
            <span>Relay Logs</span>
            <MessageSquare className="h-5 w-5 text-sky-300" />
          </div>
          <p className="mt-2 text-xs text-white/50">
            {transcript.length} encrypted packets stored in session buffer.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between text-sm text-white/60">
            <span>Synchronization</span>
            <Waves className="h-5 w-5 text-emerald-300" />
          </div>
          <p className="mt-2 text-xs text-white/50">
            {activeUser ? 'Live presence detected on linked node.' : 'No active link. Awaiting handshake.'}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between text-sm text-white/60">
            <span>Power State</span>
            <PlugZap className="h-5 w-5 text-fuchsia-300" />
          </div>
          <p className="mt-2 text-xs text-white/50">
            All relays operating at nominal capacity.
          </p>
        </div>
      </div>
    </section>
  );
}
