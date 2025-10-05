import { ReactNode } from 'react';

const badgeStyles = {
  emerald: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.25)]',
  sky: 'border-sky-400/50 bg-sky-500/10 text-sky-200 shadow-[0_0_20px_rgba(56,189,248,0.25)]',
  fuchsia: 'border-fuchsia-400/50 bg-fuchsia-500/10 text-fuchsia-200 shadow-[0_0_20px_rgba(232,121,249,0.25)]',
  slate: 'border-white/10 bg-white/5 text-white/70 shadow-[0_0_18px_rgba(148,163,184,0.15)]',
};

type StatusBadgeTone = keyof typeof badgeStyles;

interface StatusBadgeProps {
  tone?: StatusBadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function StatusBadge({ tone = 'slate', icon, children, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1 text-xs uppercase tracking-[0.3em] backdrop-blur-lg ${
        badgeStyles[tone]
      } ${className}`}
    >
      {icon && <span className="text-base">{icon}</span>}
      {children}
    </span>
  );
}
