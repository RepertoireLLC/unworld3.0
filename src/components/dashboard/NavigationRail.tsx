import { useMemo, useState } from 'react';
import {
  Activity,
  Compass,
  LogOut,
  MessageSquare,
  Radar,
  Search,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUserStore } from '../../store/userStore';

interface NavigationRailProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onSelectContact: (contactId: string) => void;
  selectedContactId?: string | null;
}

export function NavigationRail({
  activeSection,
  onSectionChange,
  onSelectContact,
  selectedContactId,
}: NavigationRailProps) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const contacts = useUserStore((state) => state.users);
  const [query, setQuery] = useState('');

  const filteredContacts = useMemo(() => {
    const normalisedQuery = query.toLowerCase();
    return contacts
      .filter((contact) => contact.id !== user?.id)
      .filter((contact) =>
        normalisedQuery ? contact.name.toLowerCase().includes(normalisedQuery) : true
      )
      .slice(0, 5);
  }, [contacts, query, user?.id]);

  const navItems = [
    { id: 'sphere', label: 'Sphere', description: 'Status pulse', icon: Compass },
    { id: 'contacts', label: 'Contacts', description: 'Trusted lattice', icon: Users },
    { id: 'search', label: 'Search', description: 'Locate echoes', icon: Search },
    { id: 'chat', label: 'Chat', description: 'Secure traffic', icon: MessageSquare },
    { id: 'logs', label: 'Logs', description: 'Signal archive', icon: Activity },
  ];

  return (
    <aside className="w-[22rem] border-r border-slate-800/60 bg-slate-950/70 backdrop-blur-xl px-8 py-10 flex flex-col gap-8 text-slate-100">
      <div className="space-y-2">
        <span className="text-[0.7rem] uppercase tracking-[0.5em] text-slate-500">Unworld</span>
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold text-white">Control Lattice</h1>
          <div className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-emerald-400">
            Quantum Ready
          </div>
        </div>
        <p className="text-sm text-slate-400">
          Orchestrate your secure transmissions with zero residual trail.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Linked Operator</p>
        <div className="rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-900/80 to-slate-950/80 px-5 py-4 shadow-lg shadow-cyan-500/5">
          <p className="text-sm text-slate-400">Active Node</p>
          <p className="mt-1 text-lg font-semibold text-white">{user?.name ?? 'Unassigned'}</p>
          <p className="mt-2 text-xs text-emerald-400">Channel integrity verified • XSalsa20 tunnel</p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Contact Lattice</p>
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter operators"
            className="w-full rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
          />
          <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        </div>
        <div className="space-y-2">
          {filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => {
                  onSelectContact(contact.id);
                  onSectionChange('chat');
                }}
                className={`group flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                  selectedContactId === contact.id
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-100'
                    : 'border-transparent bg-slate-900/40 hover:border-cyan-500/30 hover:bg-slate-900/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{ background: contact.color }}
                  >
                    {contact.name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-medium text-slate-100">{contact.name}</p>
                    <p className="text-xs text-slate-500">
                      {contact.online ? 'Synced • Live signal' : 'Dormant • Awaiting ping'}
                    </p>
                  </div>
                </div>
                <span
                  className={`h-2 w-2 rounded-full ${
                    contact.online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                  }`}
                />
              </button>
            ))
          ) : (
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-6 text-center text-sm text-slate-500">
              No operators match the current filter.
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`group flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                isActive
                  ? 'border-cyan-500/40 bg-slate-900/80 text-white shadow-lg shadow-cyan-500/10'
                  : 'border-slate-800/70 bg-slate-950/40 text-slate-300 hover:border-cyan-500/30 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    isActive ? 'bg-cyan-500/10 text-cyan-300' : 'bg-slate-900/70 text-slate-400 group-hover:text-cyan-200'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
              </div>
              <Radar className={`h-4 w-4 ${isActive ? 'text-cyan-300' : 'text-slate-600 group-hover:text-cyan-200'}`} />
            </button>
          );
        })}
      </nav>

      <button
        onClick={() => logout()}
        className="flex items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300 transition hover:border-red-400/50 hover:bg-red-500/20 hover:text-red-200"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </aside>
  );
}
