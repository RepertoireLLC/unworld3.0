import { useAgoraStore } from '../../store/agoraStore';
import { BroadcastPanel } from './BroadcastPanel';
import { HarmoniaAgoraPanel } from '../agora/HarmoniaAgoraPanel';
import { PublicForumPanel } from '../agora/PublicForumPanel';
import { AgoraReelsPanel } from '../agora/AgoraReelsPanel';
import { RadioTower, Atom, Users, MessageSquare, PlayCircle } from 'lucide-react';

const tabs = [
  {
    id: 'broadcast' as const,
    label: 'Quantum Broadcast',
    description: 'Maintain encrypted one-to-one relays.',
    icon: RadioTower,
  },
  {
    id: 'agora' as const,
    label: 'Harmonia Agora',
    description: 'Explore resonant public transmissions.',
    icon: Atom,
  },
  {
    id: 'forum' as const,
    label: 'Public Forum',
    description: 'Dive into threaded discussions and replies.',
    icon: MessageSquare,
  },
  {
    id: 'reels' as const,
    label: 'Resonant Reels',
    description: 'Watch adaptive video transmissions.',
    icon: PlayCircle,
  },
];

export function HarmoniaCentralPanel() {
  const { activeTab, setActiveTab } = useAgoraStore();

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-2 text-sm text-white/70">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 min-w-[160px] items-center justify-between gap-2 rounded-xl border px-4 py-2 transition ${
                isActive
                  ? 'border-emerald-400/50 bg-emerald-500/10 text-white'
                  : 'border-white/10 bg-transparent text-white/60 hover:bg-white/5'
              }`}
            >
              <div className="flex flex-col text-left">
                <span className="font-medium">{tab.label}</span>
                <span className="text-xs text-white/50">{tab.description}</span>
              </div>
              <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-300' : 'text-white/40'}`} />
            </button>
          );
        })}
        <div className="ml-auto hidden items-center gap-2 rounded-xl border border-white/10 bg-transparent px-3 py-2 text-xs text-white/60 lg:flex">
          <Users className="h-4 w-4" /> Agora linked
        </div>
      </div>

      {activeTab === 'agora' && <HarmoniaAgoraPanel />}
      {activeTab === 'forum' && <PublicForumPanel />}
      {activeTab === 'reels' && <AgoraReelsPanel />}
      {activeTab === 'broadcast' && <BroadcastPanel />}
    </div>
  );
}
