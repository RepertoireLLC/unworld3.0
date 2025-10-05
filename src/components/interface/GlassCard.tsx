import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  tone?: 'default' | 'subtle';
}

const toneConfig: Record<NonNullable<GlassCardProps['tone']>, {
  wrapper: string;
  baseOverlay: string;
  insetOverlay: string;
  gradient: string;
}> = {
  default: {
    wrapper: 'bg-white/5',
    baseOverlay: 'bg-slate-950/50',
    insetOverlay: 'bg-slate-950/40',
    gradient: 'from-white/10',
  },
  subtle: {
    wrapper: 'bg-white/10',
    baseOverlay: 'bg-slate-950/40',
    insetOverlay: 'bg-slate-950/25',
    gradient: 'from-white/5',
  },
};

export function GlassCard({ children, className = '', tone = 'default' }: GlassCardProps) {
  const toneStyles = toneConfig[tone];
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/10 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.9)] ${toneStyles.wrapper} ${className}`}
    >
      <div className={`absolute inset-0 ${toneStyles.baseOverlay}`} aria-hidden />
      <div className={`absolute inset-px rounded-[26px] border border-white/5 ${toneStyles.insetOverlay}`} aria-hidden />
      <div className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${toneStyles.gradient} via-transparent to-transparent`} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
