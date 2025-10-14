import { useEffect, useMemo, useState } from 'react';
import { useThemeStore, type ThemeType } from '../../store/themeStore';
import { getEffectiveTimezone, getSystemTimezone, useTimeStore } from '../../store/timeStore';

interface ThemeStyle {
  container: string;
  label: string;
  time: string;
  accent: string;
}

const themeStyles: Record<ThemeType, ThemeStyle> = {
  classic: {
    container: 'bg-white/10 border-white/20 text-white backdrop-blur-xl',
    label: 'text-white/60',
    time: 'text-white',
    accent: 'text-cyan-300',
  },
  neon: {
    container: 'bg-cyan-500/10 border-cyan-300/40 text-cyan-50 backdrop-blur-xl',
    label: 'text-cyan-100/80',
    time: 'text-cyan-50',
    accent: 'text-fuchsia-200',
  },
  galaxy: {
    container: 'bg-indigo-500/10 border-indigo-300/40 text-indigo-50 backdrop-blur-xl',
    label: 'text-indigo-100/80',
    time: 'text-indigo-50',
    accent: 'text-amber-200',
  },
  matrix: {
    container: 'bg-emerald-500/10 border-emerald-300/40 text-emerald-50 backdrop-blur-xl',
    label: 'text-emerald-100/80',
    time: 'text-emerald-50',
    accent: 'text-lime-200',
  },
  minimal: {
    container: 'bg-white/80 border-slate-200 text-slate-900 backdrop-blur-xl',
    label: 'text-slate-600',
    time: 'text-slate-900',
    accent: 'text-slate-500',
  },
  technoPunk: {
    container: 'bg-slate-950/60 border-fuchsia-400/30 text-white backdrop-blur-xl',
    label: 'text-white/60',
    time: 'text-white',
    accent: 'text-lime-300',
  },
};

const formatTimezoneName = (timezone: string) => timezone.replace(/_/g, ' ');

export function TimeDisplay() {
  const [now, setNow] = useState(() => new Date());
  const autoDetect = useTimeStore((state) => state.autoDetect);
  const manualTimezone = useTimeStore((state) => state.manualTimezone);
  const detectedTimezone = useTimeStore((state) => state.detectedTimezone);
  const setDetectedTimezone = useTimeStore((state) => state.setDetectedTimezone);
  const currentTheme = useThemeStore((state) => state.currentTheme);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setDetectedTimezone(getSystemTimezone());
  }, [setDetectedTimezone]);

  useEffect(() => {
    if (autoDetect) {
      setDetectedTimezone(getSystemTimezone());
    }
  }, [autoDetect, setDetectedTimezone]);

  const timezone = getEffectiveTimezone(autoDetect, detectedTimezone, manualTimezone);

  const timeFormatter = useMemo(() =>
    new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: timezone,
      hour12: false,
    }), [timezone]);

  const dateFormatter = useMemo(() =>
    new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: timezone,
    }), [timezone]);

  const timeZoneNameFormatter = useMemo(() =>
    new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
      timeZoneName: 'short',
    }), [timezone]);

  const timeString = timeFormatter.format(now);

  const timezoneNamePart = timeZoneNameFormatter
    .formatToParts(now)
    .find((part) => part.type === 'timeZoneName')?.value;

  const tooltip = `${dateFormatter.format(now)} — ${timezoneNamePart ?? formatTimezoneName(timezone)}`;

  const styles = themeStyles[currentTheme] ?? themeStyles.classic;

  return (
    <div className="pointer-events-none fixed top-6 right-6 z-40">
      <div
        className={`pointer-events-auto flex items-center gap-4 rounded-2xl border px-5 py-3 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.8)] transition-colors duration-500 ${styles.container}`}
        title={tooltip}
      >
        <div className="flex flex-col">
          <span className={`text-[10px] uppercase tracking-[0.4em] ${styles.label}`}>
            Temporal Sync
          </span>
          <span className={`text-xs font-medium ${styles.accent}`}>
            {formatTimezoneName(timezone)}
          </span>
        </div>
        <span className={`font-mono text-lg sm:text-2xl ${styles.time}`}>{timeString}</span>
      </div>
    </div>
  );
}
