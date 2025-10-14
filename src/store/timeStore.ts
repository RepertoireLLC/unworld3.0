import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const FALLBACK_TIMEZONE = 'UTC';

const unsupportedTimezones = new Set<string>();

const isTimezoneSupported = (timezone: string) => {
  if (!timezone) return false;

  try {
    new Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    if (!unsupportedTimezones.has(timezone)) {
      console.warn('Unsupported timezone detected', timezone, error);
      unsupportedTimezones.add(timezone);
    }
    return false;
  }
};

export const ensureValidTimezone = (timezone: string) =>
  isTimezoneSupported(timezone) ? timezone : FALLBACK_TIMEZONE;

export const getSystemTimezone = () => {
  if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
    try {
      const { timeZone } = new Intl.DateTimeFormat().resolvedOptions();
      return ensureValidTimezone(timeZone ?? FALLBACK_TIMEZONE);
    } catch (error) {
      console.warn('Failed to resolve system timezone', error);
    }
  }

  return FALLBACK_TIMEZONE;
};

interface TimeState {
  manualTimezone: string;
  detectedTimezone: string;
  autoDetect: boolean;
  setManualTimezone: (timezone: string) => void;
  setAutoDetect: (autoDetect: boolean) => void;
  setDetectedTimezone: (timezone: string) => void;
}

export const useTimeStore = create<TimeState>()(
  persist(
    (set) => ({
      manualTimezone: getSystemTimezone(),
      detectedTimezone: getSystemTimezone(),
      autoDetect: true,
      setManualTimezone: (timezone) =>
        set({
          manualTimezone: ensureValidTimezone(timezone),
          autoDetect: false,
        }),
      setAutoDetect: (autoDetect) =>
        set((state) => ({
          autoDetect,
          detectedTimezone: autoDetect
            ? getSystemTimezone()
            : ensureValidTimezone(state.detectedTimezone),
        })),
      setDetectedTimezone: (timezone) =>
        set({
          detectedTimezone: ensureValidTimezone(timezone),
        }),
    }),
    {
      name: 'time-preferences',
      partialize: (state) => ({
        manualTimezone: ensureValidTimezone(state.manualTimezone),
        autoDetect: state.autoDetect,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.manualTimezone = ensureValidTimezone(state.manualTimezone);
        state.detectedTimezone = ensureValidTimezone(
          state.detectedTimezone ?? getSystemTimezone()
        );
      },
    }
  )
);

export const getEffectiveTimezone = (
  autoDetect: boolean,
  detectedTimezone: string,
  manualTimezone: string
) => {
  if (autoDetect) {
    return ensureValidTimezone(detectedTimezone || getSystemTimezone());
  }

  return ensureValidTimezone(manualTimezone || FALLBACK_TIMEZONE);
};
