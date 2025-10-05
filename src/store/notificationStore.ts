import { create } from 'zustand';

export type NotificationPriority = 'low' | 'medium' | 'high';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  createdAt: number;
  acknowledged: boolean;
  snoozedUntil?: number;
}

interface NotificationState {
  notifications: NotificationItem[];
  addNotification: (notification: Omit<NotificationItem, 'id' | 'createdAt' | 'acknowledged'>) => void;
  acknowledgeNotification: (id: string) => void;
  snoozeNotification: (id: string, minutes: number) => void;
  getActiveNotifications: () => NotificationItem[];
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [
    {
      id: 'n-1',
      title: 'Vault Sync Drift',
      message: 'Node Kappa is 2 minutes out of sync. Schedule recalibration.',
      priority: 'high',
      createdAt: Date.now() - 1000 * 60 * 5,
      acknowledged: false,
    },
    {
      id: 'n-2',
      title: 'Signal Integrity',
      message: 'Atmospheric interference detected over Sector 7.',
      priority: 'medium',
      createdAt: Date.now() - 1000 * 60 * 20,
      acknowledged: false,
    },
    {
      id: 'n-3',
      title: 'Archive Notice',
      message: 'Auto-pruning cold storage in 12 hours.',
      priority: 'low',
      createdAt: Date.now() - 1000 * 60 * 40,
      acknowledged: false,
    },
  ],

  addNotification: (notification) => {
    const now = Date.now();
    const newNotification: NotificationItem = {
      id: `n-${now}`,
      createdAt: now,
      acknowledged: false,
      ...notification,
    };

    set((state) => ({
      notifications: [newNotification, ...state.notifications],
    }));
  },

  acknowledgeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === id
          ? { ...notification, acknowledged: true, snoozedUntil: undefined }
          : notification
      ),
    }));
  },

  snoozeNotification: (id, minutes) => {
    const snoozeUntil = Date.now() + minutes * 60 * 1000;
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === id
          ? { ...notification, snoozedUntil: snoozeUntil, acknowledged: false }
          : notification
      ),
    }));
  },

  getActiveNotifications: () => {
    const now = Date.now();
    return get()
      .notifications.filter((notification) => {
        if (notification.acknowledged) {
          return false;
        }
        if (notification.snoozedUntil && notification.snoozedUntil > now) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  },
}));
