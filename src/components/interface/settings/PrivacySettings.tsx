import { useCallback, useEffect } from 'react';
import { ShieldCheck, Users, Lock, HardDrive, EyeOff } from 'lucide-react';
import { useMeshStore } from '../../../store/meshStore';
import { useToastStore } from '../../../store/toastStore';
import { useStorageStore } from '../../../store/storageStore';

interface PrivacySettingsProps {
  isActive: boolean;
}

export function PrivacySettings({ isActive }: PrivacySettingsProps) {
  const meshPreferences = useMeshStore((state) => state.preferences);
  const setMeshPreferences = useMeshStore((state) => state.setPreferences);
  const assets = useStorageStore((state) => state.assets);
  const hydrateAssets = useStorageStore((state) => state.hydrate);
  const updateAssetVisibility = useStorageStore((state) => state.updateVisibility);
  const deleteAsset = useStorageStore((state) => state.deleteAsset);

  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    if (isActive) {
      void hydrateAssets();
    }
  }, [hydrateAssets, isActive]);

  const handleMeshDiscoveryToggle = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const allowPublicDiscovery = event.target.checked;
      setMeshPreferences({ allowPublicDiscovery });
      addToast({
        title: allowPublicDiscovery ? 'Discovery enabled' : 'Discovery disabled',
        variant: allowPublicDiscovery ? 'success' : 'info',
        description: allowPublicDiscovery
          ? 'Trusted indexers can now see your node in the lattice.'
          : 'Your node is invisible to discovery beacons. Direct invites only.',
      });
    },
    [addToast, setMeshPreferences]
  );

  const handleAutoAcceptToggle = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const autoAcceptTrusted = event.target.checked;
      setMeshPreferences({ autoAcceptTrusted });
      addToast({
        title: autoAcceptTrusted ? 'Trusted auto-link enabled' : 'Manual approval required',
        variant: 'info',
        description: autoAcceptTrusted
          ? 'Trusted peers may establish channels instantly.'
          : 'You will review every mesh handshake before linking.',
      });
    },
    [addToast, setMeshPreferences]
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Mesh Governance</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Connection Policy</h3>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/60">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            Secure
          </span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">Public discovery opt-in</p>
                <p className="text-xs text-white/50">Allow Harmonia indexers to surface your node to trusted peers.</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={meshPreferences.allowPublicDiscovery}
                  onChange={handleMeshDiscoveryToggle}
                  className="peer sr-only"
                />
                <div className="relative h-6 w-11 rounded-full border border-white/20 bg-white/10 transition peer-checked:border-cyan-400/60 peer-checked:bg-cyan-500/20">
                  <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all duration-300 peer-checked:translate-x-5 peer-checked:bg-cyan-300" />
                </div>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">Auto-link trusted peers</p>
                <p className="text-xs text-white/50">Skip manual approval when allies initiate a channel.</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={meshPreferences.autoAcceptTrusted}
                  onChange={handleAutoAcceptToggle}
                  className="peer sr-only"
                />
                <div className="relative h-6 w-11 rounded-full border border-white/20 bg-white/10 transition peer-checked:border-emerald-400/60 peer-checked:bg-emerald-500/20">
                  <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all duration-300 peer-checked:translate-x-5 peer-checked:bg-emerald-300" />
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <div className="flex items-center gap-3 text-white/70">
              <Users className="h-4 w-4 text-cyan-300" />
              <span className="text-xs uppercase tracking-[0.3em]">Trusted peers</span>
            </div>
            <p className="mt-3 text-sm text-white/60">
              Connections marked as trusted will inherit these policies automatically. Adjust them anytime to tighten your lattice.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <div className="flex items-center gap-3 text-white/70">
              <Lock className="h-4 w-4 text-emerald-300" />
              <span className="text-xs uppercase tracking-[0.3em]">Encrypted channels</span>
            </div>
            <p className="mt-3 text-sm text-white/60">
              Harmonia enforces end-to-end encryption. Your discovery policy never weakens message security.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Encrypted Vault</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Local Asset Control</h3>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/60">
            <HardDrive className="h-4 w-4 text-emerald-300" />
            {assets.length} asset{assets.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {assets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-white/50">
              <EyeOff className="mx-auto mb-3 h-6 w-6 text-white/40" />
              No encrypted files stored yet. Uploads remain on this device only.
            </div>
          ) : (
            assets.slice(0, 6).map((asset) => (
              <div
                key={asset.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">{asset.name}</p>
                  <p className="text-xs text-white/50">
                    {(asset.size / 1024).toFixed(1)} KB • {asset.mimeType || 'binary'} • {new Date(asset.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
                  <select
                    value={asset.visibility}
                    onChange={(event) => void updateAssetVisibility(asset.id, event.target.value as typeof asset.visibility)}
                    className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-1"
                  >
                    <option value="private">Private</option>
                    <option value="trusted">Trusted Peers</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void deleteAsset(asset.id)}
                    className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-rose-200 transition hover:bg-rose-500/20"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
