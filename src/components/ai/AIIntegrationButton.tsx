import { Cpu } from 'lucide-react';
import { useModalStore } from '../../store/modalStore';

interface AIIntegrationButtonProps {
  className?: string;
}

export function AIIntegrationButton({ className }: AIIntegrationButtonProps) {
  const setAIIntegrationOpen = useModalStore((state) => state.setAIIntegrationOpen);

  return (
    <button
      type="button"
      onClick={() => setAIIntegrationOpen(true)}
      className={`group relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-cyan-400/40 bg-cyan-500/20 text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.35)] transition duration-300 hover:scale-105 hover:border-cyan-300 hover:text-white ${className ?? ''}`}
    >
      <div className="absolute inset-0 animate-pulse rounded-full bg-cyan-500/20 blur-md" aria-hidden="true" />
      <Cpu className="relative h-5 w-5 transition-transform duration-300 group-hover:rotate-6" />
      <span className="sr-only">Configure Scribe and connected AIs</span>
    </button>
  );
}
