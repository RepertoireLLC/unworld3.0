import { useEffect, useState } from 'react';
import { useInterestStore } from '../../store/interestStore';
import { Lock, Unlock, Plus, Hourglass } from 'lucide-react';

interface InterestVectorEditorProps {
  userId: string;
}

export function InterestVectorEditor({ userId }: InterestVectorEditorProps) {
  const descriptors = useInterestStore((state) => state.getInterestDescriptors(userId));
  const setInterestValue = useInterestStore((state) => state.setInterestValue);
  const toggleLock = useInterestStore((state) => state.toggleInterestLock);
  const setHalfLifeDays = useInterestStore((state) => state.setHalfLifeDays);
  const halfLifeDays = useInterestStore((state) => state.getHalfLifeDays(userId));
  const importInterests = useInterestStore((state) => state.importInterests);

  const [newTopic, setNewTopic] = useState('');
  const [newValue, setNewValue] = useState(0.5);
  const [halfLifeInput, setHalfLifeInput] = useState(halfLifeDays);

  useEffect(() => {
    setHalfLifeInput(halfLifeDays);
  }, [halfLifeDays]);

  const handleAddInterest = () => {
    if (!newTopic.trim()) {
      return;
    }
    importInterests(userId, { [newTopic.trim().toLowerCase()]: newValue });
    setNewTopic('');
    setNewValue(0.5);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Interest Fields</p>
          <h4 className="text-lg font-semibold text-white">Resonance Vector</h4>
        </div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
          <Hourglass className="h-4 w-4 text-emerald-300" />
          Half-life {halfLifeDays}d
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
        <label className="text-[11px] uppercase tracking-[0.3em] text-white/40">Decay Half-life (days)</label>
        <input
          type="range"
          min={7}
          max={120}
          step={1}
          value={halfLifeInput}
          onChange={(event) => setHalfLifeInput(Number(event.target.value))}
          onMouseUp={() => setHalfLifeDays(userId, halfLifeInput)}
          onTouchEnd={() => setHalfLifeDays(userId, halfLifeInput)}
          onBlur={() => setHalfLifeDays(userId, halfLifeInput)}
          className="mt-2 h-1 w-full cursor-pointer"
        />
        <p className="mt-2 text-xs text-white/60">
          Resonance will gently decay with exp(-t / half-life). Extend for stable affinities or shorten for agility.
        </p>
      </div>

      <div className="space-y-3">
        {descriptors.length > 0 ? (
          descriptors.map((descriptor) => (
            <div
              key={descriptor.topic}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
            >
              <div className="flex-1">
                <p className="text-sm font-medium capitalize text-white">{descriptor.topic}</p>
                <p className="text-xs text-white/40">
                  Last updated {new Date(descriptor.lastUpdated).toLocaleDateString()} · {descriptor.locked ? 'Locked' : 'Adaptive'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={descriptor.value}
                  onChange={(event) => setInterestValue(userId, descriptor.topic, Number(event.target.value))}
                  disabled={descriptor.locked}
                  className="h-1 w-32 cursor-pointer"
                />
                <span className="w-14 text-center text-sm text-white/70">{(descriptor.value * 100).toFixed(0)}%</span>
                <button
                  type="button"
                  onClick={() => toggleLock(userId, descriptor.topic)}
                  className={`flex items-center gap-1 rounded-xl border px-3 py-1 text-[10px] uppercase tracking-[0.3em] transition ${
                    descriptor.locked
                      ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'
                      : 'border-white/10 bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  {descriptor.locked ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    <Unlock className="h-3.5 w-3.5" />
                  )}
                  {descriptor.locked ? 'Locked' : 'Lock'}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-white/50">
            No declared interests yet. Add fields to calibrate your resonance vector.
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Add New Interest</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            value={newTopic}
            onChange={(event) => setNewTopic(event.target.value)}
            placeholder="Topic"
            className="flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
          />
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={newValue}
            onChange={(event) => setNewValue(Number(event.target.value))}
            className="w-24 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddInterest}
            className="flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-200 transition hover:bg-emerald-500/20"
          >
            <Plus className="h-4 w-4" />
            Add Field
          </button>
        </div>
      </div>
    </section>
  );
}
