import { FormEvent, useMemo, useState } from 'react';
import {
  AlertCircle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Circle,
  FileLock,
  PauseCircle,
  PlayCircle,
  TimerReset,
} from 'lucide-react';
import {
  NotificationItem,
  NotificationPriority,
  useNotificationStore,
} from '../../store/notificationStore';
import { MissionStatus, useMissionStore } from '../../store/missionStore';
import { TransferStatus, useTransferStore } from '../../store/transferStore';

const priorityStyles: Record<NotificationPriority, string> = {
  high: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
  medium: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  low: 'border-sky-400/40 bg-sky-500/10 text-sky-200',
};

const statusCopy: Record<MissionStatus, string> = {
  planning: 'Planning',
  queued: 'Queued',
  'in-progress': 'In Progress',
  completed: 'Completed',
};

const statusAccent: Record<MissionStatus, string> = {
  planning: 'border-sky-400/40 bg-sky-500/10 text-sky-200',
  queued: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  'in-progress': 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  completed: 'border-slate-400/40 bg-slate-500/10 text-slate-200',
};

const transferStatusCopy: Record<TransferStatus, string> = {
  queued: 'Queued',
  transmitting: 'Transmitting',
  verifying: 'Verifying',
  complete: 'Complete',
};

function NotificationCard({ notification }: { notification: NotificationItem }) {
  const acknowledge = useNotificationStore((state) => state.acknowledgeNotification);
  const snooze = useNotificationStore((state) => state.snoozeNotification);

  const minutesUntil = notification.snoozedUntil
    ? Math.max(0, Math.round((notification.snoozedUntil - Date.now()) / 60000))
    : null;

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] ${priorityStyles[notification.priority]}`}>
          {notification.priority === 'high'
            ? 'Critical'
            : notification.priority === 'medium'
            ? 'Warning'
            : 'Info'}
        </div>
        <span className="text-xs text-white/40">
          {new Date(notification.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{notification.title}</p>
        <p className="mt-1 text-sm text-white/60">{notification.message}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          onClick={() => acknowledge(notification.id)}
          className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 uppercase tracking-[0.3em] text-emerald-200 transition hover:bg-emerald-500/20"
        >
          Acknowledge
        </button>
        <button
          onClick={() => snooze(notification.id, 15)}
          className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 uppercase tracking-[0.3em] text-white/60 transition hover:bg-white/20"
        >
          Snooze 15m
        </button>
        {minutesUntil !== null && (
          <span className="ml-auto rounded-full border border-white/10 px-3 py-1 text-white/40">
            Re-arming in {minutesUntil}m
          </span>
        )}
      </div>
    </div>
  );
}

function MissionForm() {
  const addMission = useMissionStore((state) => state.addMission);
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [windowHours, setWindowHours] = useState(2);
  const [encryptionLevel, setEncryptionLevel] = useState<'amber' | 'crimson' | 'onyx'>('crimson');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !objective.trim()) {
      return;
    }

    const now = Date.now();
    addMission({
      title: title.trim(),
      objective: objective.trim(),
      windowStart: now,
      windowEnd: now + windowHours * 60 * 60 * 1000,
      assignedTo: ['You'],
      encryptionLevel,
      status: 'planning',
    });

    setTitle('');
    setObjective('');
    setWindowHours(2);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4"
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
        <span>New Mission Capsule</span>
        <CalendarClock className="h-4 w-4 text-sky-300" />
      </div>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Operation codename"
        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
      />
      <textarea
        value={objective}
        onChange={(event) => setObjective(event.target.value)}
        placeholder="Outline objectives and constraints..."
        className="h-20 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-xs uppercase tracking-[0.3em] text-white/50">
          <span>Window (hrs)</span>
          <input
            type="number"
            min={1}
            max={24}
            value={windowHours}
            onChange={(event) => setWindowHours(Number(event.target.value))}
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
          />
        </label>
        <label className="space-y-1 text-xs uppercase tracking-[0.3em] text-white/50">
          <span>Encryption</span>
          <select
            value={encryptionLevel}
            onChange={(event) => setEncryptionLevel(event.target.value as 'amber' | 'crimson' | 'onyx')}
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
          >
            <option value="amber">Amber</option>
            <option value="crimson">Crimson</option>
            <option value="onyx">Onyx</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-300 transition hover:bg-emerald-500/20"
          >
            Prime Mission
          </button>
        </div>
      </div>
    </form>
  );
}

export function OperationsBoard() {
  const activeNotifications = useNotificationStore((state) => state.getActiveNotifications());
  const missions = useMissionStore((state) => state.missions);
  const updateMissionStatus = useMissionStore((state) => state.updateMissionStatus);
  const transfers = useTransferStore((state) => state.transfers);

  const activeMissions = useMemo(
    () => missions.filter((mission) => mission.status !== 'completed'),
    [missions]
  );

  const recentCompleted = useMemo(
    () => missions.filter((mission) => mission.status === 'completed').slice(0, 2),
    [missions]
  );

  return (
    <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)]">
      <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/50">
        <span className="rounded-full border border-white/10 px-3 py-1 text-white/60">Operations Board</span>
        <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-emerald-300">
          Multi-Vector Sync
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
            <span className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-rose-300" /> Alerts
            </span>
            <span className="text-white/40">{activeNotifications.length} active</span>
          </div>
          {activeNotifications.length > 0 ? (
            <div className="space-y-3">
              {activeNotifications.slice(0, 3).map((notification) => (
                <NotificationCard key={notification.id} notification={notification} />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
              All systems nominal. Awaiting new directives.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <MissionForm />

          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
              <span className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4 text-emerald-300" /> Active Missions
              </span>
              <span className="text-white/40">{activeMissions.length} live</span>
            </div>
            <div className="space-y-3">
              {activeMissions.length > 0 ? (
                activeMissions.map((mission) => (
                  <div
                    key={mission.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40">
                      <span>{mission.title}</span>
                      <span className={`rounded-full border px-2 py-1 ${statusAccent[mission.status]}`}>
                        {statusCopy[mission.status]}
                      </span>
                      <span className="rounded-full border border-white/10 px-2 py-1 text-white/50">
                        {mission.encryptionLevel.toUpperCase()} Shield
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-white/70">{mission.objective}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/50">
                      <span>Window:</span>
                      <span>
                        {new Date(mission.windowStart).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {' — '}
                        {new Date(mission.windowEnd).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="ml-auto flex items-center gap-2">
                        <button
                          onClick={() => updateMissionStatus(mission.id, 'queued')}
                          className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 uppercase tracking-[0.3em] text-white/60 transition hover:bg-white/20"
                        >
                          Queue
                        </button>
                        <button
                          onClick={() => updateMissionStatus(mission.id, 'in-progress')}
                          className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 uppercase tracking-[0.3em] text-emerald-300 transition hover:bg-emerald-500/20"
                        >
                          Launch
                        </button>
                        <button
                          onClick={() => updateMissionStatus(mission.id, 'completed')}
                          className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 uppercase tracking-[0.3em] text-white/40 transition hover:bg-white/20"
                        >
                          Close
                        </button>
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                  <PauseCircle className="h-5 w-5 text-white/40" />
                  No active missions. Queue a new capsule to begin operations.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
            <span className="flex items-center gap-2">
              <FileLock className="h-4 w-4 text-fuchsia-300" /> Secure Transfer Queue
            </span>
            <span className="text-white/40">{transfers.length} items</span>
          </div>
          <div className="space-y-3">
            {transfers.map((transfer) => (
              <div key={transfer.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between text-sm text-white/70">
                  <span>{transfer.label}</span>
                  <span className="text-white/40">{transferStatusCopy[transfer.status]}</span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${
                      transfer.status === 'complete'
                        ? 'bg-emerald-400'
                        : transfer.status === 'verifying'
                        ? 'bg-sky-400'
                        : 'bg-fuchsia-400'
                    }`}
                    style={{ width: `${transfer.progress}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/40">
                  <span>{transfer.size}</span>
                  {transfer.secureHash && (
                    <span className="flex items-center gap-1">
                      <TimerReset className="h-3.5 w-3.5" />
                      {transfer.secureHash}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
            <span className="flex items-center gap-2">
              <Circle className="h-4 w-4 text-sky-300" /> Completed Capsules
            </span>
            <span className="text-white/40">{recentCompleted.length}</span>
          </div>
          <div className="space-y-3">
            {recentCompleted.length > 0 ? (
              recentCompleted.map((mission) => (
                <div key={mission.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between text-sm text-white/70">
                    <span>{mission.title}</span>
                    <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-xs uppercase tracking-[0.3em] text-emerald-300">
                      Archived
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-white/50">{mission.objective}</p>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                <AlertCircle className="h-5 w-5 text-white/40" />
                Awaiting completed capsules.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
