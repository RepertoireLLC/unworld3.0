import { useMemo } from 'react';
import { ShieldCheck, Waves, Notebook, Images } from 'lucide-react';
import { useLayerStore, LayerId } from '../../store/layerStore';
import { useUserStore } from '../../store/userStore';
import { useChatStore } from '../../store/chatStore';
import { useStoryStore } from '../../store/storyStore';
import { useFieldNoteStore } from '../../store/fieldNoteStore';

const layerIcons: Record<LayerId, typeof ShieldCheck> = {
  presence: ShieldCheck,
  broadcasts: Waves,
  notes: Notebook,
  media: Images,
};

const accentClasses: Record<LayerId, { active: string; inactive: string; badge: string }> = {
  presence: {
    active: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200',
    inactive: 'border-emerald-400/20 bg-emerald-500/5 text-emerald-200/60',
    badge: 'bg-emerald-500/20 text-emerald-200',
  },
  broadcasts: {
    active: 'border-sky-400/50 bg-sky-500/10 text-sky-200',
    inactive: 'border-sky-400/20 bg-sky-500/5 text-sky-200/60',
    badge: 'bg-sky-500/20 text-sky-200',
  },
  notes: {
    active: 'border-amber-400/50 bg-amber-500/10 text-amber-200',
    inactive: 'border-amber-400/20 bg-amber-500/5 text-amber-200/60',
    badge: 'bg-amber-500/20 text-amber-200',
  },
  media: {
    active: 'border-violet-400/50 bg-violet-500/10 text-violet-200',
    inactive: 'border-violet-400/20 bg-violet-500/5 text-violet-200/60',
    badge: 'bg-violet-500/20 text-violet-200',
  },
};

export function LayerFilterBar() {
  const layers = useLayerStore((state) => state.layers);
  const activeLayerIds = useLayerStore((state) => state.activeLayerIds);
  const toggleLayer = useLayerStore((state) => state.toggleLayer);

  const { totalUsers, onlineUsers } = useUserStore((state) => ({
    totalUsers: state.users.length,
    onlineUsers: state.users.filter((user) => user.online).length,
  }));

  const { messageCount, channelCount } = useChatStore((state) => {
    const uniqueChannels = new Set<string>();
    state.messages.forEach((message) => {
      const key = [message.fromUserId, message.toUserId].sort().join('::');
      uniqueChannels.add(key);
    });

    return {
      messageCount: state.messages.length,
      channelCount: uniqueChannels.size,
    };
  });

  const noteCount = useFieldNoteStore((state) => state.notes.length);
  const storyCount = useStoryStore((state) => state.stories.length);

  const layerMetrics = useMemo(
    () => ({
      presence: {
        badge: `${onlineUsers}/${totalUsers}`,
        tooltip: `${onlineUsers} operators visible of ${totalUsers} registered`,
      },
      broadcasts: {
        badge: `${channelCount} ch`,
        tooltip:
          channelCount === 0
            ? 'No secure channels ready'
            : `${channelCount} secure ${channelCount === 1 ? 'channel' : 'channels'} with ${messageCount} transmissions logged`,
      },
      notes: {
        badge: `${noteCount}`,
        tooltip:
          noteCount === 1
            ? '1 field note archived'
            : `${noteCount} field notes archived`,
      },
      media: {
        badge: `${storyCount}`,
        tooltip:
          storyCount === 1
            ? '1 media artifact in vault'
            : `${storyCount} media artifacts in vault`,
      },
    }),
    [channelCount, messageCount, noteCount, onlineUsers, storyCount, totalUsers]
  );

  return (
    <nav className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.8)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Layer Filters</p>
          <p className="text-sm text-white/70">
            Toggle operational layers to refine visible intelligence.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {layers.map((layer) => {
            const Icon = layerIcons[layer.id];
            const isActive = activeLayerIds.includes(layer.id);
            const accent = accentClasses[layer.id];
            const metric = layerMetrics[layer.id];

            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => toggleLayer(layer.id)}
                aria-pressed={isActive}
                title={`${layer.description}\n${metric.tooltip}`}
                className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition hover:border-white/20 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                  isActive ? accent.active : accent.inactive
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl border text-sm ${
                      isActive ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 bg-white/5 text-white/60'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-xs uppercase tracking-[0.2em] text-white/60">
                      {isActive ? 'Active' : 'Dormant'}
                    </span>
                    <span className="text-sm font-semibold text-white">{layer.name}</span>
                  </span>
                </span>
                <span
                  className={`ml-4 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] ${accent.badge}`}
                >
                  {metric.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
