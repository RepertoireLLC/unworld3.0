import { Cpu } from 'lucide-react';
import { useModalStore } from '../../store/modalStore';
import { cn } from '../../utils/cn';

interface AIIntegrationButtonProps {
  className?: string;
}

export function AIIntegrationButton({ className }: AIIntegrationButtonProps) {
  const setAIIntegrationOpen = useModalStore((state) => state.setAIIntegrationOpen);

  return (
    <button
      type="button"
      onClick={() => setAIIntegrationOpen(true)}
      className={cn(
        'group relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full',
        'ds-button ds-button-secondary p-0 text-base',
        className
      )}
    >
      <div className="absolute inset-0 animate-pulse rounded-full" style={{ background: 'var(--ds-glow-primary)', opacity: 0.4 }} aria-hidden="true" />
      <Cpu className="relative h-5 w-5 transition-transform duration-300 group-hover:rotate-6" />
      <span className="sr-only">Connect AI</span>
    </button>
  );
}
