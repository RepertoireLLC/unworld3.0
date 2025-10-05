import { useMemo, useState, useEffect } from 'react';
import {
  Satellite,
  Waves,
  MessageSquare,
  Shield,
  PlugZap,
  Sparkles,
  Signal,
  Clock3,
  History,
  ChevronDown,
} from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';

type MetricTone = 'emerald' | 'sky' | 'violet';

const metricIconClass: Record<MetricTone, string> = {
  emerald: 'text-emerald-300',
  sky: 'text-sky-300',
  violet: 'text-violet-300',
};

const metricValueClass: Record<MetricTone, string> = {
  emerald: 'text-emerald-200',
  sky: 'text-sky-200',
  violet: 'text-violet-200',
};

const workspaceMetrics: Array<{
  id: string;
  label: string;
  value: string;
  description: string;
  tone: MetricTone;
}> = [
  {
    id: 'metric-1',
    label: 'Quantum Sync',
    value: '99.8%',
    description: 'Cross-node alignment across active channels.',
    tone: 'emerald',
  },
  {
    id: 'metric-2',
    label: 'Encrypted Packets',
    value: '312',
    description: 'Packets queued in secure relay buffer.',
    tone: 'sky',
  },
  {
    id: 'metric-3',
    label: 'Presence Vector',
    value: 'Stable',
    description: 'Presence latency within threshold.',
    tone: 'violet',
  },
];

export function BroadcastPanel() {
  const { activeChat, setActiveChat, getMessagesForChat } = useChatStore();
  const currentUser = useAuthStore((state) => state.user);
  const users = useUserStore((state) => state.users);
  const [selectedChannel, setSelectedChannel] = useState(activeChat ?? '');
  const [collapsedSections, setCollapsedSections] = useState({
    console: false,
    log: false,
    diagnostics: false,
    synchronization: false,
    power: false,
  });

  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections((previous) => ({
      ...previous,
      [section]: !previous[section],
    }));
  };

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

  const transmissionLog = transcript.length
    ? [...transcript].reverse().slice(0, 5)
    : [
        {
          id: 'log-1',
          content: 'Awaiting decoded intel from Node Sigma. Maintain passive watch.',
          timestamp: '02:11',
        },
        {
          id: 'log-2',
          content: 'Clearance tokens refreshed. Preparing sync capsule for dispatch.',
          timestamp: '01:58',
        },
      ];

  return (
    <section className="flex h-full flex-col gap-6">
      <div className="relative rounded-[36px] border border-white/10 bg-white/5 p-8 shadow-[0_40px_100px_-50px_rgba(59,130,246,0.65)]">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="relative flex flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                Encrypted Ops Workspace
              </p>
              <h2 className="text-3xl font-semibold text-white">Broadcast Relay Console</h2>
              <p className="max-w-xl text-sm text-white/60">
                Select a linked channel to initiate a secure quantum relay. Transmission metrics update in real-time once a channel is engaged.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/50">
                <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-emerald-300">
                  Quantum Axis
                </span>
                <span className="rounded-full border border-sky-400/40 bg-sky-500/10 px-3 py-1 text-sky-300">
                  Broadcast Mode
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1">
                  Link Integrity 99%
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleSection('console')}
                aria-expanded={!collapsedSections.console}
                className="rounded-full border border-white/10 bg-white/10 p-2 text-white/60 transition hover:border-white/30 hover:bg-white/20 hover:text-white"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${collapsedSections.console ? '-rotate-90' : ''}`}
                />
                <span className="sr-only">{collapsedSections.console ? 'Expand broadcast relay console' : 'Collapse broadcast relay console'}</span>
              </button>
            </div>
          </div>

          <div className={`grid gap-6 ${collapsedSections.console ? '' : 'lg:grid-cols-[minmax(0,1fr)_320px]'}`}>
            {!collapsedSections.console && (
              <div className="space-y-6">
                <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
                  <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1 space-y-4">
                      <div>
                        <label className="text-xs uppercase tracking-[0.3em] text-white/50">Channel Selection</label>
                        <select
                          value={selectedChannel}
                          onChange={(event) => setSelectedChannel(event.target.value)}
                          className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
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
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-center justify-between text-sm text-white/60">
                            <span>Handshake Status</span>
                            <Shield className={`h-5 w-5 ${activeUser ? 'text-emerald-300' : 'text-white/40'}`} />
                          </div>
                          <p className="mt-2 text-lg font-semibold text-white">
                            {activeUser ? 'Secured' : 'Awaiting Link'}
                          </p>
                          <p className="text-xs text-white/50">
                            {activeUser
                              ? 'Channel authenticated. Ready to transmit.'
                              : 'Select a channel to initiate the secure handshake.'}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-center justify-between text-sm text-white/60">
                            <span>Presence State</span>
                            <Waves className={`h-5 w-5 ${activeUser ? 'text-sky-300' : 'text-white/40'}`} />
                          </div>
                          <p className="mt-2 text-lg font-semibold text-white">
                            {activeUser ? 'Live' : 'Dormant'}
                          </p>
                          <p className="text-xs text-white/50">
                            {activeUser
                              ? 'Presence telemetry streaming from remote operator.'
                              : 'No active link detected. Awaiting handshake.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          onClick={() => selectedChannel && setActiveChat(selectedChannel)}
                          disabled={!selectedChannel}
                          className="flex-1 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-xs uppercase tracking-[0.3em] text-emerald-300 transition hover:border-emerald-400/60 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/40"
                        >
                          {activeUser ? 'Switch Channel' : 'Prepare Sync Capsule'}
                        </button>
                        {activeUser && (
                          <button
                            onClick={() => setActiveChat(null)}
                            className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-xs uppercase tracking-[0.3em] text-white/60 transition hover:border-white/30 hover:bg-white/20"
                          >
                            Terminate
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
                        <span>Active Transmission</span>
                        <Satellite className="h-4 w-4 text-sky-300" />
                      </div>
                      {activeUser ? (
                        <div className="mt-4 space-y-2">
                          <h3 className="text-xl font-semibold text-white">{activeUser.name}</h3>
                          <p className="text-sm text-white/60">
                            {transcript.length > 0
                              ? `Last signal: ${transcript[transcript.length - 1].content}`
                              : 'Awaiting first transmission...'}
                          </p>
                          <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs text-white/50">
                            <div className="flex items-center justify-between">
                              <span>Packets</span>
                              <span>{transcript.length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Latency</span>
                              <span>14ms</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Integrity</span>
                              <span className="text-emerald-300">99.2%</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 space-y-2">
                          <h3 className="text-xl font-semibold text-white">No channel linked</h3>
                          <p className="text-sm text-white/60">Select a channel to begin encrypted transmission.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {workspaceMetrics.map((metric) => (
                    <div
                      key={metric.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex items-center justify-between text-sm text-white/60">
                        <span>{metric.label}</span>
                        <Sparkles className={`h-4 w-4 ${metricIconClass[metric.tone]}`} />
                      </div>
                      <p className={`mt-3 text-2xl font-semibold ${metricValueClass[metric.tone]}`}>{metric.value}</p>
                      <p className="mt-1 text-xs text-white/50">{metric.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex h-full flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-6">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
                <span>Transmission Log</span>
                <div className="flex items-center gap-2 text-white/50">
                  <Clock3 className="h-4 w-4 text-white/40" />
                  <button
                    type="button"
                    onClick={() => toggleSection('log')}
                    aria-expanded={!collapsedSections.log}
                    className="rounded-full border border-white/10 bg-white/10 p-1.5 text-white/60 transition hover:border-white/30 hover:bg-white/20 hover:text-white"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${collapsedSections.log ? '-rotate-90' : ''}`}
                    />
                    <span className="sr-only">{collapsedSections.log ? 'Expand transmission log' : 'Collapse transmission log'}</span>
                  </button>
                </div>
              </div>
              {!collapsedSections.log ? (
                <>
                  <div className="flex-1 space-y-3 overflow-hidden">
                    {transmissionLog.map((log) => (
                      <div
                        key={log.id ?? log.timestamp}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/40">
                          <span>{log.timestamp ?? '00:00'}</span>
                          <MessageSquare className="h-4 w-4 text-sky-300" />
                        </div>
                        <p className="mt-2 text-sm text-white/70">{log.content}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span className="flex items-center gap-2">
                      <History className="h-4 w-4" /> Session Buffer
                    </span>
                    <span>{transcript.length || 2} packets</span>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-xs text-white/50">
                  Transmission log minimized.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between text-sm text-white/60">
            <span>Relay Diagnostics</span>
            <div className="flex items-center gap-2">
              <Signal className="h-5 w-5 text-emerald-300" />
              <button
                type="button"
                onClick={() => toggleSection('diagnostics')}
                aria-expanded={!collapsedSections.diagnostics}
                className="rounded-full border border-white/10 bg-white/10 p-1.5 text-white/60 transition hover:border-white/30 hover:bg-white/20 hover:text-white"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${collapsedSections.diagnostics ? '-rotate-90' : ''}`}
                />
                <span className="sr-only">{collapsedSections.diagnostics ? 'Expand relay diagnostics' : 'Collapse relay diagnostics'}</span>
              </button>
            </div>
          </div>
          {!collapsedSections.diagnostics ? (
            <>
              <p className="mt-3 text-xs text-white/50">
                Signal clarity stable across encrypted bands. No packet loss detected within current observation window.
              </p>
              <div className="mt-4 space-y-2 text-xs text-white/50">
                <div className="flex items-center justify-between">
                  <span>Active Relays</span>
                  <span>{activeUser ? 1 : 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Standby Capsules</span>
                  <span>{otherUsers.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Signal Integrity</span>
                  <span className="text-emerald-300">99.2%</span>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-4 text-xs text-white/50">Relay diagnostics minimized.</p>
          )}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between text-sm text-white/60">
            <span>Synchronization</span>
            <div className="flex items-center gap-2">
              <Waves className="h-5 w-5 text-sky-300" />
              <button
                type="button"
                onClick={() => toggleSection('synchronization')}
                aria-expanded={!collapsedSections.synchronization}
                className="rounded-full border border-white/10 bg-white/10 p-1.5 text-white/60 transition hover:border-white/30 hover:bg-white/20 hover:text-white"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${collapsedSections.synchronization ? '-rotate-90' : ''}`}
                />
                <span className="sr-only">{collapsedSections.synchronization ? 'Expand synchronization module' : 'Collapse synchronization module'}</span>
              </button>
            </div>
          </div>
          {!collapsedSections.synchronization ? (
            <>
              <p className="mt-3 text-xs text-white/50">
                {activeUser ? 'Live presence detected on linked node.' : 'No active link. Awaiting handshake.'}
              </p>
              <div className="mt-4 space-y-3 text-xs text-white/50">
                <div className="flex items-center justify-between">
                  <span>Presence Uptime</span>
                  <span>12h 44m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Heartbeat</span>
                  <span className="text-emerald-300">Stable</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Variance</span>
                  <span>0.3%</span>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-4 text-xs text-white/50">Synchronization metrics minimized.</p>
          )}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between text-sm text-white/60">
            <span>Power State</span>
            <div className="flex items-center gap-2">
              <PlugZap className="h-5 w-5 text-fuchsia-300" />
              <button
                type="button"
                onClick={() => toggleSection('power')}
                aria-expanded={!collapsedSections.power}
                className="rounded-full border border-white/10 bg-white/10 p-1.5 text-white/60 transition hover:border-white/30 hover:bg-white/20 hover:text-white"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${collapsedSections.power ? '-rotate-90' : ''}`}
                />
                <span className="sr-only">{collapsedSections.power ? 'Expand power state module' : 'Collapse power state module'}</span>
              </button>
            </div>
          </div>
          {!collapsedSections.power ? (
            <>
              <p className="mt-3 text-xs text-white/50">
                All relays operating at nominal capacity. Backup cells charged and ready for auto-failover.
              </p>
              <div className="mt-4 flex flex-col gap-2 text-xs text-white/50">
                <div className="flex items-center justify-between">
                  <span>Primary Grid</span>
                  <span className="text-emerald-300">Online</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Auxiliary Cells</span>
                  <span>94%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Failover</span>
                  <span>Ready</span>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-4 text-xs text-white/50">Power state overview minimized.</p>
          )}
        </div>
      </div>
    </section>
  );
}
