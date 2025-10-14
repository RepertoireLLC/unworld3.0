import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const FALLBACK_TIMEZONE = 'UTC';

export const getSystemTimezone = () => {
  if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
    try {
      const { timeZone } = new Intl.DateTimeFormat().resolvedOptions();
      return timeZone ?? FALLBACK_TIMEZONE;
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
          manualTimezone: timezone,
          autoDetect: false,
        }),
      setAutoDetect: (autoDetect) =>
        set((state) => ({
          autoDetect,
          detectedTimezone: autoDetect ? getSystemTimezone() : state.detectedTimezone,
        })),
      setDetectedTimezone: (timezone) => set({ detectedTimezone: timezone }),
    }),
    {
      name: 'time-preferences',
      partialize: (state) => ({
        manualTimezone: state.manualTimezone,
        autoDetect: state.autoDetect,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!state.detectedTimezone) {
          state.detectedTimezone = getSystemTimezone();
        }
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
    return detectedTimezone || getSystemTimezone();
  }

  return manualTimezone || FALLBACK_TIMEZONE;
};
