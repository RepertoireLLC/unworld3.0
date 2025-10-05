import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUserStore } from './userStore';

export type ActivityStatus = 'success' | 'warning' | 'error';

export interface ActivityLogEntry {
  id: string;
  timestamp: number;
  actorId: string;
  actorName: string;
  action:
    | 'FILE_UPLOADED'
    | 'FILE_DOWNLOAD_ATTEMPT'
    | 'FILE_DOWNLOAD_SUCCESS'
    | 'PERMISSION_TEMPLATE_APPLIED'
    | 'PERMISSION_GRANTED'
    | 'PERMISSION_REVOKED';
  message: string;
  resourceId?: string;
  status: ActivityStatus;
}

interface ActivityLogState {
  entries: ActivityLogEntry[];
  addLog: (entry: Omit<ActivityLogEntry, 'id' | 'timestamp' | 'actorName'> & { actorName?: string }) => void;
  clearLog: () => void;
}

export const useActivityLogStore = create<ActivityLogState>()(
  persist(
    (set, _get) => ({
      entries: [],
      addLog: (entry) => {
        const users = useUserStore.getState().users;
        const actor = users.find((user) => user.id === entry.actorId);
        const logEntry: ActivityLogEntry = {
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          timestamp: Date.now(),
          actorId: entry.actorId,
          actorName: entry.actorName ?? actor?.name ?? 'System',
          action: entry.action,
          message: entry.message,
          resourceId: entry.resourceId,
          status: entry.status,
        };

        set((state) => ({
          entries: [logEntry, ...state.entries].slice(0, 100),
        }));
      },
      clearLog: () => set({ entries: [] }),
    }),
    {
      name: 'workspace-activity-log',
    }
  )
);
