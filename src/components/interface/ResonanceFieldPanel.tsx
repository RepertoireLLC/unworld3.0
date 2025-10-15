import { useEffect, useMemo } from 'react';
import { Activity, Sparkles, Waves, Radar } from 'lucide-react';
import { useResonanceStore } from '../../store/resonanceStore';
import { useUserStore } from '../../store/userStore';
import { toneToSymbolicColor } from '../../utils/resonance';

function formatIntegrity(value: number) {
  const percent = Math.round(value * 100);
  if (percent >= 96) {
    return 'Pristine';
  }
  if (percent >= 85) {
    return 'Harmonic';
  }
  if (percent >= 70) {
    return 'Steady';
  }
  return 'Fragmentary';
}

export function ResonanceFieldPanel() {
  const fieldIntegrity = useResonanceStore((state) => state.fieldIntegrity);
  const getRecentPulses = useResonanceStore((state) => state.getRecentPulses);
  const getNodeSummary = useResonanceStore((state) => state.getNodeSummary);
  const decayField = useResonanceStore((state) => state.decayField);
  const users = useUserStore((state) => state.users);

  useEffect(() => {
    const id = window.setInterval(() => {
      decayField();
    }, 15000);
    return () => window.clearInterval(id);
  }, [decayField]);

  const userLookup = useMemo(() => {
    return new Map(users.map((user) => [user.id, user]));
  }, [users]);

  const recentPulses = getRecentPulses(5);

  const harmonicLeads = useMemo(() => {
    return users
      .map((user) => ({
        user,
        summary: getNodeSummary(user.id),
      }))
      .filter(({ summary }) => summary.outbound + summary.inbound > 0)
      .sort((a, b) => b.summary.averageCoherence - a.summary.averageCoherence)
      .slice(0, 3);
  }, [users, getNodeSummary]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.8)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Resonance Field</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Harmonic Observatory</h3>
        </div>
        <Sparkles className="h-5 w-5 text-amber-200" />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
            <span>Field Integrity</span>
            <Waves className="h-4 w-4 text-sky-300" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-white">{Math.round(fieldIntegrity * 100)}%</p>
          <p className="text-xs text-white/60">{formatIntegrity(fieldIntegrity)}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
            <span>Active Harmonics</span>
            <Activity className="h-4 w-4 text-emerald-300" />
          </div>
          <ul className="mt-3 space-y-2">
            {harmonicLeads.length > 0 ? (
              harmonicLeads.map(({ user, summary }) => (
                <li key={user.id} className="flex items-center justify-between text-xs text-white/70">
                  <span>{user.name}</span>
                  <span className="font-mono text-white/60">
                    {(summary.averageCoherence * 100).toFixed(0)}%
                  </span>
                </li>
              ))
            ) : (
              <li className="text-xs text-white/40">No harmonic data yet.</li>
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
            <span>Field Advisory</span>
            <Radar className="h-4 w-4 text-fuchsia-300" />
          </div>
          <p className="mt-3 text-sm text-white/60">
            Resonance equilibrium is {fieldIntegrity > 0.7 ? 'stable' : 'seeking alignment'}. Maintain empathetic pulse chains.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Recent Pulses</p>
        <div className="space-y-3">
          {recentPulses.length > 0 ? (
            recentPulses.map((pulse) => {
              const fromUser = userLookup.get(pulse.fromUserId);
              const toUser = userLookup.get(pulse.toUserId);
              const toneColor = toneToSymbolicColor(pulse.tone);
              return (
                <div
                  key={pulse.id}
                  className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                    <span className="uppercase tracking-[0.3em] text-white/40">
                      {new Date(pulse.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="font-medium text-white">
                      {fromUser?.name ?? 'Unknown'} → {toUser?.name ?? 'Unknown'}
                    </span>
                    <span
                      className="ml-auto rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.3em]"
                      style={{
                        backgroundColor: `${toneColor}1a`,
                        color: toneColor,
                      }}
                    >
                      {pulse.tone}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 font-mono text-[10px] text-white/70">
                        {(pulse.magnitude * 100).toFixed(0)}
                      </div>
                      <p className="max-w-sm text-sm text-white/70">{pulse.messagePreview}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.3em] text-white/50">
                      <span>Coherence</span>
                      <span className="font-mono text-white/70">{(pulse.coherence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-xs text-white/50">
              Awaiting first resonance pulse.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

