import { useCallback } from 'react';
import { EyeOff, Eye } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useToastStore } from '../../../store/toastStore';

interface ContentSettingsProps {
  isActive: boolean;
}

export function ContentSettings({ isActive: _isActive }: ContentSettingsProps) {
  const nsfwAllowed = useAuthStore((state) => state.user?.preferences?.nsfwAllowed ?? false);
  const updatePreferences = useAuthStore((state) => state.updatePreferences);
  const addToast = useToastStore((state) => state.addToast);

  const handleToggle = useCallback(() => {
    updatePreferences({ nsfwAllowed: !nsfwAllowed });
    addToast({
      title: !nsfwAllowed ? 'NSFW feeds unlocked' : 'NSFW content muted',
      variant: !nsfwAllowed ? 'success' : 'info',
      description: !nsfwAllowed
        ? 'Your Harmonia feed will now include mature transmissions and tagged media.'
        : 'Explicit broadcasts will be hidden from feeds and recommendations.',
    });
  }, [addToast, nsfwAllowed, updatePreferences]);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Content Filters</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Mature Content Access</h3>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] ${
            nsfwAllowed
              ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
              : 'border-white/10 bg-white/5 text-white/60'
          }`}>
            {nsfwAllowed ? (
              <>
                <Eye className="h-3.5 w-3.5" />
                Enabled
              </>
            ) : (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                Disabled
              </>
            )}
          </span>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white">Allow NSFW transmissions</p>
                <p className="text-xs text-white/50">
                  When enabled, Harmonia will surface explicit media and mature discussions in your Agora feeds.
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={nsfwAllowed}
                  onChange={handleToggle}
                  className="peer sr-only"
                />
                <div className="relative h-6 w-11 rounded-full border border-white/20 bg-white/10 transition peer-checked:border-fuchsia-400/60 peer-checked:bg-fuchsia-500/20">
                  <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all duration-300 peer-checked:translate-x-5 peer-checked:bg-fuchsia-300" />
                </div>
              </label>
            </div>

            <div className="mt-5 space-y-2 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs text-white/60">
              <p>• Filters apply instantly to Agora feeds, Quantum Broadcast prompts, and resonance recommendations.</p>
              <p>• Content creators you follow are notified of your preference to calibrate future drops.</p>
              <p>• We never share this preference outside your encrypted profile record.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-white/60">
            <p className="text-[10px] uppercase tracking-[0.35em] text-white/40">Signal Forecast</p>
            <p className="mt-2 text-sm text-white/70">
              Harmonia recalibrates feed scores when this toggle changes. Expect your curated streams to refresh within seconds.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
