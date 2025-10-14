import { useAgoraStore } from '../../store/agoraStore';
import { BroadcastPanel } from './BroadcastPanel';
import { HarmoniaAgoraPanel } from '../agora/HarmoniaAgoraPanel';
import { RadioTower, Atom, Users } from 'lucide-react';

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
];

export function HarmoniaCentralPanel() {
  const { activeTab, setActiveTab } = useAgoraStore();

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="theme-surface flex flex-wrap items-center gap-2 rounded-3xl p-3 text-xs uppercase tracking-[0.3em] text-white/50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 min-w-[180px] items-center justify-between gap-2 rounded-2xl px-4 py-3 transition ${
                isActive
                  ? 'border border-emerald-400/60 bg-emerald-500/10 text-emerald-200 shadow-[0_10px_30px_-20px_rgba(16,185,129,0.8)]'
                  : 'theme-chip text-white/60 hover:bg-white/20'
              }`}
            >
              <div className="flex flex-col text-left">
                <span>{tab.label}</span>
                <span className="text-[10px] uppercase tracking-[0.35em] text-white/40">
                  {tab.description}
                </span>
              </div>
              <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-300' : 'text-white/40'}`} />
            </button>
          );
        })}
        <div className="theme-chip ml-auto hidden items-center gap-2 rounded-2xl px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-white/60 lg:flex">
          <Users className="h-4 w-4" />
          Agora Linked
        </div>
      </div>

      {activeTab === 'agora' ? <HarmoniaAgoraPanel /> : <BroadcastPanel />}
    </div>
  );
}
