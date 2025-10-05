import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { permissionTemplates, PermissionTemplate, PermissionLevel, canAccess, permissionRank } from '../services/permissionService';
import { useUserStore } from './userStore';
import { useActivityLogStore } from './activityLogStore';

export interface ResourcePermissionEntry {
  userId: string;
  level: PermissionLevel;
}

export interface ResourcePermission {
  resourceId: string;
  resourceType: 'vault-file' | 'workspace-widget';
  entries: ResourcePermissionEntry[];
  templateId?: string;
  updatedAt: number;
}

interface PermissionState {
  resources: Record<string, ResourcePermission>;
  templates: PermissionTemplate[];
  ensureResource: (resourceId: string, resourceType: ResourcePermission['resourceType'], ownerId: string) => void;
  applyTemplate: (resourceId: string, templateId: string, actorId: string) => { success: boolean; message: string };
  grantPermission: (
    resourceId: string,
    userId: string,
    level: PermissionLevel,
    actorId: string,
    options?: { silent?: boolean }
  ) => void;
  revokePermission: (resourceId: string, userId: string, actorId: string) => void;
  hasAccess: (resourceId: string, userId: string | null | undefined, requiredLevel?: PermissionLevel) => boolean;
  getPermissionsForResource: (resourceId: string) => ResourcePermissionEntry[];
}

export const usePermissionStore = create<PermissionState>()(
  persist(
    (set, get) => ({
      resources: {},
      templates: permissionTemplates,
      ensureResource: (resourceId, resourceType, ownerId) => {
        const { resources } = get();
        if (resources[resourceId]) return;
        const baseline: ResourcePermission = {
          resourceId,
          resourceType,
          entries: [{ userId: ownerId, level: 'owner' }],
          updatedAt: Date.now(),
        };
        set({ resources: { ...resources, [resourceId]: baseline } });
      },
      applyTemplate: (resourceId, templateId, actorId) => {
        const template = permissionTemplates.find((preset) => preset.id === templateId);
        if (!template) {
          return { success: false, message: 'Template not found.' };
        }
        const users = useUserStore.getState().users;
        const actor = users.find((user) => user.id === actorId);
        const allUserIds = users.map((user) => user.id);
        const onlineUserIds = users.filter((user) => user.online).map((user) => user.id);
        const otherUserIds = users.filter((user) => user.id !== actorId).map((user) => user.id);

        const grants = template.grants.reduce<Record<string, PermissionLevel>>((accumulator, rule) => {
          let targets: string[] = [];
          switch (rule.target) {
            case 'self':
              targets = actorId ? [actorId] : [];
              break;
            case 'all':
              targets = allUserIds;
              break;
            case 'others':
              targets = otherUserIds;
              break;
            case 'online':
              targets = onlineUserIds;
              break;
            default:
              targets = [];
          }
          targets.forEach((userId) => {
            const currentLevel = accumulator[userId];
            if (!currentLevel || permissionRank[rule.level] > permissionRank[currentLevel]) {
              accumulator[userId] = rule.level;
            }
          });
          return accumulator;
        }, {});

        if (actorId && !grants[actorId]) {
          grants[actorId] = 'owner';
        }

        const entries: ResourcePermissionEntry[] = Object.entries(grants).map(([userId, level]) => ({
          userId,
          level,
        }));

        set((state) => ({
          resources: {
            ...state.resources,
            [resourceId]: {
              resourceId,
              resourceType: state.resources[resourceId]?.resourceType ?? 'vault-file',
              entries,
              templateId,
              updatedAt: Date.now(),
            },
          },
        }));

        const actorName = actor?.name ?? 'System';
        useActivityLogStore.getState().addLog({
          actorId,
          actorName,
          action: 'PERMISSION_TEMPLATE_APPLIED',
          message: `${actorName} applied the ${template.name} template to ${resourceId}.`,
          resourceId,
          status: 'success',
        });

        return { success: true, message: `${template.name} applied.` };
      },
      grantPermission: (resourceId, userId, level, actorId, options) => {
        set((state) => {
          const resource = state.resources[resourceId];
          if (!resource) return state;
          const nextEntries = resource.entries.filter((entry) => entry.userId !== userId);
          nextEntries.push({ userId, level });
          const updated: ResourcePermission = {
            ...resource,
            entries: nextEntries,
            updatedAt: Date.now(),
          };

          if (!options?.silent) {
            const actor = useUserStore.getState().users.find((user) => user.id === actorId);
            const subject = useUserStore.getState().users.find((user) => user.id === userId);
            useActivityLogStore.getState().addLog({
              actorId,
              actorName: actor?.name ?? 'System',
              action: 'PERMISSION_GRANTED',
              message: `${actor?.name ?? 'System'} granted ${level} access to ${subject?.name ?? userId} on ${resourceId}.`,
              resourceId,
              status: 'success',
            });
          }

          return {
            resources: {
              ...state.resources,
              [resourceId]: updated,
            },
          };
        });
      },
      revokePermission: (resourceId, userId, actorId) => {
        set((state) => {
          const resource = state.resources[resourceId];
          if (!resource) return state;
          const filteredEntries = resource.entries.filter((entry) => entry.userId !== userId);
          const updated: ResourcePermission = {
            ...resource,
            entries: filteredEntries,
            updatedAt: Date.now(),
          };

          const actor = useUserStore.getState().users.find((user) => user.id === actorId);
          const subject = useUserStore.getState().users.find((user) => user.id === userId);
          useActivityLogStore.getState().addLog({
            actorId,
            actorName: actor?.name ?? 'System',
            action: 'PERMISSION_REVOKED',
            message: `${actor?.name ?? 'System'} revoked access for ${subject?.name ?? userId} on ${resourceId}.`,
            resourceId,
            status: 'warning',
          });

          return {
            resources: {
              ...state.resources,
              [resourceId]: updated,
            },
          };
        });
      },
      hasAccess: (resourceId, userId, requiredLevel = 'viewer') => {
        if (!userId) return false;
        const { resources } = get();
        const resource = resources[resourceId];
        if (!resource) return false;
        const entry = resource.entries.find((item) => item.userId === userId);
        if (!entry) return false;
        return canAccess(entry.level, requiredLevel);
      },
      getPermissionsForResource: (resourceId) => {
        const resource = get().resources[resourceId];
        return resource ? [...resource.entries].sort((a, b) => permissionRank[b.level] - permissionRank[a.level]) : [];
      },
    }),
    {
      name: 'workspace-permissions',
      partialize: (state) => ({
        resources: state.resources,
      }),
    }
  )
);
