import { useCallback, useEffect } from 'react';
import { X, UserCog, Sparkles, ShieldCheck, LifeBuoy, Puzzle } from 'lucide-react';
import { useModalStore } from '../../store/modalStore';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { AccountSettings } from './settings/AccountSettings';
import { ContentSettings } from './settings/ContentSettings';
import { PrivacySettings } from './settings/PrivacySettings';
import { SupportSettings } from './settings/SupportSettings';
import { PluginManager } from '../PluginManager';

const categories = [
  {
    id: 'account' as const,
    label: 'Account',
    description: 'Identity, time alignment, and lifecycle controls.',
    icon: UserCog,
  },
  {
    id: 'content' as const,
    label: 'Content',
    description: 'Feed calibration and visual customization.',
    icon: Sparkles,
  },
  {
    id: 'plugins' as const,
    label: 'Plugins & Modules',
    description: 'Feature visibility and component orchestration.',
    icon: Puzzle,
  },
  {
    id: 'privacy' as const,
    label: 'Privacy',
    description: 'Mesh discovery, trust, and encrypted storage.',
    icon: ShieldCheck,
  },
  {
    id: 'support' as const,
    label: 'Support',
    description: 'Help Center, searchable knowledge, and direct contact.',
    icon: LifeBuoy,
  },
];

type CategoryId = (typeof categories)[number]['id'];

export function SettingsModal() {
  const isOpen = useModalStore((state) => state.isSettingsOpen);
  const setIsOpen = useModalStore((state) => state.setSettingsOpen);
  const activeCategory = useModalStore((state) => state.settingsActiveSection);
  const setActiveCategory = useModalStore((state) => state.setSettingsActiveSection);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setActiveCategory('account');
  }, [setActiveCategory, setIsOpen]);

  useEscapeKey(handleClose, isOpen);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (!categories.some((category) => category.id === activeCategory)) {
      setActiveCategory('account');
    }
  }, [activeCategory, isOpen, setActiveCategory]);

  if (!isOpen) {
    return null;
  }

  const renderCategory = (categoryId: CategoryId) => {
    switch (categoryId) {
      case 'account':
        return <AccountSettings onClose={handleClose} isActive={activeCategory === 'account'} />;
      case 'content':
        return <ContentSettings isActive={activeCategory === 'content'} />;
      case 'privacy':
        return <PrivacySettings isActive={activeCategory === 'privacy'} />;
      case 'support':
        return <SupportSettings isActive={activeCategory === 'support'} />;
      case 'plugins':
        return <PluginManager isActive={activeCategory === 'plugins'} />;
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-6 backdrop-blur-xl"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Harmonia settings"
    >
      <div
        className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/85 shadow-[0_40px_120px_-40px_rgba(15,23,42,0.95)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex flex-col gap-4 border-b border-white/10 bg-white/5 px-8 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Harmonia Settings</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Control Nexus</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
          >
            Collapse
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-col gap-6 px-8 py-8 lg:flex-row">
          <nav className="flex flex-col gap-3 lg:w-64">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex flex-col gap-2 rounded-2xl border px-4 py-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 ${
                    isActive
                      ? 'border-emerald-400/60 bg-emerald-500/10 text-white shadow-[0_20px_60px_-30px_rgba(16,185,129,0.7)]'
                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                        isActive
                          ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
                          : 'border-white/10 bg-slate-950/60 text-white/60'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold uppercase tracking-[0.2em]">{category.label}</span>
                      <span className="text-[10px] uppercase tracking-[0.35em] text-white/40">{category.description}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>

          <main className="min-h-[420px] flex-1 overflow-y-auto pr-1">
            <div className="space-y-8 pb-10">{renderCategory(activeCategory)}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
