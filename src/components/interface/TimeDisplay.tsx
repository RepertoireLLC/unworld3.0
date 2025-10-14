import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { getEffectiveTimezone, getSystemTimezone, useTimeStore } from '../../store/timeStore';

const formatTimezoneName = (timezone: string) => timezone.replace(/_/g, ' ');

const FALLBACK_TIMEZONE = 'UTC';

export function TimeDisplay() {
  const [now, setNow] = useState(() => new Date());
  const autoDetect = useTimeStore((state) => state.autoDetect);
  const manualTimezone = useTimeStore((state) => state.manualTimezone);
  const detectedTimezone = useTimeStore((state) => state.detectedTimezone);
  const setDetectedTimezone = useTimeStore((state) => state.setDetectedTimezone);
  const themeVisual = useThemeStore((state) => state.getResolvedTheme());
  const tokens = themeVisual.tokens;

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

  const safeTimezone = useMemo(() => {
    try {
      // Attempt to instantiate once to validate the provided timezone.
      new Intl.DateTimeFormat(undefined, { timeZone: timezone }).format(new Date());
      return timezone;
    } catch (error) {
      console.warn(
        `Invalid timezone "${timezone}" detected. Falling back to UTC for time display.`,
        error
      );
      return FALLBACK_TIMEZONE;
    }
  }, [timezone]);

  const timeFormatter = useMemo(() =>
    new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: safeTimezone,
      hour12: false,
    }), [safeTimezone]);

  const dateFormatter = useMemo(() =>
    new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: safeTimezone,
    }), [safeTimezone]);

  const timeZoneNameFormatter = useMemo(() =>
    new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: safeTimezone,
      timeZoneName: 'short',
    }), [safeTimezone]);

  const timeString = timeFormatter.format(now);

  const timezoneNamePart = timeZoneNameFormatter
    .formatToParts(now)
    .find((part) => part.type === 'timeZoneName')?.value;

  const timezoneLabel =
    safeTimezone === timezone
      ? formatTimezoneName(safeTimezone)
      : `${formatTimezoneName(safeTimezone)} · Fallback (${FALLBACK_TIMEZONE})`;

  const tooltip = `${dateFormatter.format(now)} — ${timezoneNamePart ?? timezoneLabel}`;

  const containerStyle: CSSProperties = {
    backgroundColor: tokens.surfaceColor,
    borderColor: tokens.borderColor,
    color: tokens.textColor,
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    boxShadow: `0 20px 60px -30px ${tokens.surfaceTransparentColor}`,
  };

  const labelStyle: CSSProperties = {
    color: tokens.textMutedColor,
  };

  const accentStyle: CSSProperties = {
    color: tokens.accentColor,
  };

  const timeStyle: CSSProperties = {
    color: tokens.textColor,
    fontFamily: tokens.headingFontFamily,
  };

  return (
    <div className="pointer-events-none fixed top-6 right-6 z-40">
      <div
        className="pointer-events-auto flex items-center gap-4 rounded-2xl border px-5 py-3 transition-colors duration-500"
        style={containerStyle}
        title={tooltip}
      >
        <div className="flex flex-col">
          <span
            className="text-[10px] uppercase tracking-[0.4em]"
            style={labelStyle}
          >
            Temporal Sync
          </span>
          <span className="text-xs font-medium" style={accentStyle}>
            {timezoneLabel}
          </span>
        </div>
        <span className="font-mono text-lg sm:text-2xl" style={timeStyle}>
          {timeString}
        </span>
      </div>
    </div>
  );
}
