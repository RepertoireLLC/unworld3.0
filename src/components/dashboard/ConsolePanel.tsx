import { useMemo, useState } from 'react';
import { ShieldCheck, SignalHigh, Sparkles, WifiOff } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { useUserStore } from '../../store/userStore';

interface ConsolePanelProps {
  activeSection: string;
}

const tabs = [
  { id: 'broadcast', label: 'Broadcast' },
  { id: 'alliances', label: 'Alliances' },
  { id: 'operations', label: 'Operations' },
  { id: 'research', label: 'Research' },
];

export function ConsolePanel({ activeSection }: ConsolePanelProps) {
  const user = useAuthStore((state) => state.user);
  const contacts = useUserStore((state) => state.users);
  const activeChat = useChatStore((state) => state.activeChat);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const getMessagesForChat = useChatStore((state) => state.getMessagesForChat);

  const [activeTab, setActiveTab] = useState('broadcast');
  const [draft, setDraft] = useState('');

  const availableContacts = useMemo(
    () => contacts.filter((contact) => contact.id !== user?.id),
    [contacts, user?.id]
  );

  const messages = useMemo(() => {
    if (!user?.id || !activeChat) {
      return [];
    }
    return getMessagesForChat(user.id, activeChat);
  }, [activeChat, getMessagesForChat, user?.id]);

  const handleTransmit = () => {
    if (!user?.id || !activeChat || !draft.trim()) {
      return;
    }
    sendMessage(user.id, activeChat, draft.trim());
    setDraft('');
  };

  const activeContact = availableContacts.find((contact) => contact.id === activeChat);

  return (
    <section className="flex-1">
      <div className="h-full rounded-3xl border border-slate-800/60 bg-slate-900/40 shadow-[0_0_60px_-30px_rgba(34,211,238,0.4)]">
        <header className="border-b border-slate-800/60 px-8 py-6">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
            Encrypted Relay • {activeSection === 'logs' ? 'Archive' : 'Broadcast'}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold text-white">Quantum Link Console</h2>
              <p className="mt-2 text-sm text-slate-400">
                {activeContact
                  ? `Secure channel synchronised with ${activeContact.name}.`
                  : 'Select a contact to begin a sealed transmission.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-slate-800/80 bg-slate-950/60 px-4 py-2 text-xs text-slate-300">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Quantum AES Hybrid
              </div>
              <div className="flex items-center gap-2 rounded-full border border-slate-800/80 bg-slate-950/60 px-4 py-2 text-xs text-slate-300">
                <SignalHigh className={`h-4 w-4 ${activeContact ? 'text-cyan-300' : 'text-slate-600'}`} />
                {activeContact ? 'Presence Linked' : 'Awaiting Link'}
              </div>
            </div>
          </div>
        </header>

        <div className="border-b border-slate-800/60 px-8 py-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full border px-5 py-2 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.25)]'
                    : 'border-slate-800/70 bg-slate-950/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex h-[28rem] flex-col gap-6 overflow-hidden px-8 py-6">
          {messages.length > 0 ? (
            <div className="flex-1 space-y-3 overflow-y-auto pr-4">
              {messages.map((message) => {
                const isOwn = message.fromUserId === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`max-w-xl rounded-2xl border px-4 py-3 text-sm ${
                      isOwn
                        ? 'ml-auto border-cyan-500/40 bg-cyan-500/10 text-cyan-100'
                        : 'border-slate-800/70 bg-slate-900/70 text-slate-200'
                    }`}
                  >
                    <p>{message.content}</p>
                    <span className="mt-2 block text-[0.65rem] uppercase tracking-[0.25em] text-slate-500">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800/60 bg-slate-950/40 text-center">
              <Sparkles className="h-12 w-12 text-cyan-300" />
              <p className="mt-4 text-lg font-semibold text-white">No transmissions yet.</p>
              <p className="mt-2 max-w-sm text-sm text-slate-400">
                {activeContact
                  ? 'Compose your first encrypted signal to initialise the double-ratchet session.'
                  : 'Choose a contact and secure the channel to begin communicating.'}
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 p-5">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Secure Channel</p>
            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
              <select
                value={activeChat ?? ''}
                onChange={(event) => setActiveChat(event.target.value || null)}
                className="w-full rounded-xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 md:max-w-xs"
              >
                <option value="">Select a contact to begin</option>
                {availableContacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name} {contact.online ? '• Online' : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={handleTransmit}
                disabled={!activeChat || !draft.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-5 py-3 text-sm font-medium text-cyan-200 transition hover:border-cyan-400/60 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:border-slate-800/60 disabled:bg-slate-900/40 disabled:text-slate-500"
              >
                {activeContact ? <SignalHigh className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                {activeContact ? 'Transmit Signal' : 'Awaiting Link'}
              </button>
            </div>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Compose encrypted transmission..."
              className="mt-3 h-24 w-full rounded-xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
