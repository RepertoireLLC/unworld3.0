import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Search, Sparkles } from 'lucide-react';
import { usePluginRegistry, type PluginModuleMeta } from '../core/pluginRegistry';

const toSentence = (value?: string | null): string => {
  if (!value) {
    return '';
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
};

interface PluginManagerProps {
  isActive?: boolean;
}

export function PluginManager({ isActive }: PluginManagerProps) {
  const { plugins, categories, togglePlugin, setAllPluginsVisibility, refresh } = usePluginRegistry();

  useEffect(() => {
    if (isActive) {
      refresh();
    }
  }, [isActive, refresh]);

  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();

  const filteredPlugins = useMemo(() => {
    if (!normalizedQuery) {
      return plugins;
    }

    return plugins.filter((plugin) =>
      [plugin.name, plugin.description, plugin.category, plugin.componentPath]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [normalizedQuery, plugins]);

  const groupedPlugins = useMemo(() => {
    const groupMap = new Map<string, { id: string; label: string; description: string; plugins: PluginModuleMeta[] }>();

    categories.forEach((category) => {
      groupMap.set(category.id, { ...category, plugins: [] });
    });

    filteredPlugins.forEach((plugin) => {
      const group = groupMap.get(plugin.category);
      if (group) {
        group.plugins.push(plugin);
        return;
      }

      const fallbackId = 'uncategorized';
      const fallback = groupMap.get(fallbackId);
      if (fallback) {
        fallback.plugins.push(plugin);
      } else {
        groupMap.set(fallbackId, {
          id: fallbackId,
          label: 'Uncategorized',
          description: 'Modules awaiting categorization.',
          plugins: [plugin],
        });
      }
    });

    return Array.from(groupMap.values())
      .map((group) => ({
        ...group,
        plugins: group.plugins.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter((group) => group.plugins.length > 0)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [categories, filteredPlugins]);

  const hasHiddenPlugin = useMemo(() => plugins.some((plugin) => !plugin.isVisible), [plugins]);
  const hasResults = filteredPlugins.length > 0;

  const handleShowHideAll = () => {
    setAllPluginsVisibility(hasHiddenPlugin);
  };

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Plugins & Modules</p>
            <h3 className="mt-1 text-lg font-semibold text-white">
              Control which Harmonia features appear in your main interface.
            </h3>
            <p className="mt-2 text-xs text-white/60">
              Discoverable UI components are registered automatically. Toggle visibility to tailor the interface without uninstalling
              or losing state.
            </p>
          </div>
          <button
            type="button"
            onClick={handleShowHideAll}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
          >
            {hasHiddenPlugin ? (
              <>
                <Eye className="h-4 w-4" /> Show All
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4" /> Hide All
              </>
            )}
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="search"
              value={query}
              onChange={handleQueryChange}
              placeholder="Search modules by name, category, or path"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/40 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            />
          </div>
          <div className="text-xs uppercase tracking-[0.3em] text-white/40">
            {hasResults ? `${filteredPlugins.length} module${filteredPlugins.length === 1 ? '' : 's'} discovered` : 'No modules match your search'}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {groupedPlugins.map((group) => (
          <div
            key={group.id}
            className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-[0_40px_120px_-70px_rgba(15,23,42,0.85)]"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">{group.label}</p>
                {group.description ? <p className="mt-1 text-xs text-white/60">{group.description}</p> : null}
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-white/50">
                <Sparkles className="h-3.5 w-3.5" /> {group.plugins.length} module{group.plugins.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.plugins.map((plugin) => {
                const isVisible = plugin.isVisible !== false;
                return (
                  <div key={plugin.id} className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-white">{plugin.name}</h4>
                        <p className="mt-1 text-xs text-white/60">{plugin.description}</p>
                        <p className="mt-2 text-[10px] uppercase tracking-[0.35em] text-white/40">
                          {toSentence(plugin.origin)} • {plugin.componentPath}
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => togglePlugin(plugin.id)}
                          className="peer sr-only"
                        />
                        <div className="relative h-6 w-11 rounded-full border border-white/20 bg-white/10 transition peer-checked:border-emerald-400/60 peer-checked:bg-emerald-500/20">
                          <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all duration-300 peer-checked:translate-x-5 peer-checked:bg-emerald-300" />
                        </div>
                      </label>
                    </div>
                    <div
                      className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.35em] ${
                        isVisible
                          ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
                          : 'border-white/10 bg-slate-950/60 text-white/50'
                      }`}
                    >
                      {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {isVisible ? 'Visible' : 'Hidden'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {!hasResults ? (
          <div className="rounded-3xl border border-dashed border-white/20 bg-slate-950/40 p-8 text-center text-sm text-white/60">
            No modules match your filters. Adjust the search query to reveal additional components.
          </div>
        ) : null}
      </div>
    </section>
  );
}
