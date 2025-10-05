import { useEffect, useMemo, useState } from 'react';
import { useUserStore } from '../../store/userStore';
import { useBusinessStore } from '../../store/businessStore';
import { VISIBILITY_LAYERS, VisibilityLayer } from '../../types/visibility';
import { Search, MapPin, Users, Briefcase } from 'lucide-react';
import { fetchRegistry } from '../../services/apiClient';

export function PublicRegistryWorkspace() {
  const users = useUserStore((state) => state.users);
  const stores = useBusinessStore((state) => state.stores);

  const [searchTerm, setSearchTerm] = useState('');
  const [layerFilter, setLayerFilter] = useState<VisibilityLayer>('public');
  const [industryFilter, setIndustryFilter] = useState<string>('All');
  const [remoteRegistry, setRemoteRegistry] = useState<{ users?: any[]; stores?: any[] } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const industries = useMemo(() => {
    const userIndustries = users.flatMap((user) => user.industries ?? []);
    const storeIndustries = Object.values(stores).map((store) => store.industry);
    return ['All', ...Array.from(new Set([...userIndustries, ...storeIndustries]))];
  }, [users, stores]);

  useEffect(() => {
    let cancelled = false;
    setIsSyncing(true);
    fetchRegistry({
      layer: layerFilter,
      industry: industryFilter === 'All' ? undefined : industryFilter,
      search: searchTerm || undefined,
    })
      .then((response) => {
        if (!cancelled && response) {
          setRemoteRegistry(response as any);
        }
      })
      .finally(() => {
        if (!cancelled) setIsSyncing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [layerFilter, industryFilter, searchTerm]);

  const visibleUsers = useMemo(() =>
    (remoteRegistry?.users ?? users).filter((user: any) => {
      const preferences = user.visibilityPreferences ?? {};
      const layers = user.visibilityLayers ?? {};
      if (!preferences.registryOptIn) return false;
      if (!layers[layerFilter]) return false;
      if (industryFilter !== 'All' && !user.industries?.includes(industryFilter)) return false;
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return (
        user.name.toLowerCase().includes(term) ||
        user.industries?.some((industry) => industry.toLowerCase().includes(term)) ||
        user.skills?.some((skill) => skill.toLowerCase().includes(term))
      );
    }),
  [users, layerFilter, searchTerm, industryFilter]
  );

  const visibleStores = useMemo(() =>
    (remoteRegistry?.stores ?? Object.values(stores)).filter((store: any) => {
      if (!store.published) return false;
      if (store.visibility !== layerFilter && layerFilter !== 'public') return false;
      if (industryFilter !== 'All' && store.industry !== industryFilter) return false;
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return (
        store.name.toLowerCase().includes(term) ||
        store.industry.toLowerCase().includes(term) ||
        store.registrySummary?.toLowerCase().includes(term)
      );
    }),
  [stores, layerFilter, searchTerm, industryFilter]
  );

  return (
    <section className="flex h-full flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)]">
      <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/50">
        <span className="rounded-full border border-sky-400/40 bg-sky-500/10 px-3 py-1 text-sky-300">Enclypse Registry</span>
        <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-emerald-300">Discoverability</span>
        <span className="rounded-full border border-white/10 px-3 py-1 text-white/60">Layer {layerFilter.toUpperCase()}</span>
        {isSyncing && <span className="rounded-full border border-white/10 px-3 py-1 text-white/50">Syncing…</span>}
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Public Intelligence Sphere</h2>
            <p className="mt-1 text-sm text-white/60">
              Filter for collaborators, specialists, and commerce capsules broadcasting to your chosen layer.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white/60">
            <Search className="h-4 w-4" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search skills, industries, stores"
              className="bg-transparent text-sm text-white focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          {VISIBILITY_LAYERS.map((layer) => (
            <button
              key={layer.value}
              onClick={() => setLayerFilter(layer.value)}
              className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                layerFilter === layer.value
                  ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'
                  : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              <p className="text-sm font-semibold">{layer.label}</p>
              <p className="text-xs text-white/60">{layer.description}</p>
            </button>
          ))}
          <select
            value={industryFilter}
            onChange={(event) => setIndustryFilter(event.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
          >
            {industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/60 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">People Broadcasting</h3>
              <p className="mt-1 text-sm text-white/60">Presence-aware profiles currently visible within this layer.</p>
            </div>
            <Users className="h-6 w-6 text-sky-300" />
          </div>

          <div className="space-y-3">
            {visibleUsers.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
                No operators matched your filters.
              </div>
            ) : (
              visibleUsers.map((user) => (
                <div key={user.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{user.name}</p>
                      <p className="text-xs text-white/60">{user.industries?.join(' • ')}</p>
                    </div>
                    <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                      {(user.visibilityPreferences?.profile ?? layerFilter).toUpperCase()}
                    </span>
                  </div>
                  {user.skills?.length ? (
                    <p className="mt-2 text-xs text-white/60">Skills: {user.skills.join(', ')}</p>
                  ) : null}
                  {user.location ? (
                    <p className="mt-2 flex items-center gap-2 text-xs text-white/60">
                      <MapPin className="h-3 w-3" />
                      {user.location}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/60 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Commerce Capsules</h3>
              <p className="mt-1 text-sm text-white/60">Stores opted into the registry for this layer.</p>
            </div>
            <Briefcase className="h-6 w-6 text-emerald-300" />
          </div>

          <div className="space-y-3">
            {visibleStores.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
                No stores have been published to this layer yet.
              </div>
            ) : (
              visibleStores.map((store) => (
                <div key={store.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{store.name}</p>
                      <p className="text-xs text-white/60">{store.industry}</p>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
                      {store.visibility.toUpperCase()}
                    </span>
                  </div>
                  {store.registrySummary ? (
                    <p className="mt-2 text-xs text-white/60">{store.registrySummary}</p>
                  ) : (
                    <p className="mt-2 text-xs text-white/50">No public summary provided yet.</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
