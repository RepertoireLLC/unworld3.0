export type PermissionLevel = 'owner' | 'editor' | 'viewer';

type TemplateTarget = 'self' | 'all' | 'others' | 'online';

export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  tag: 'Private' | 'Team' | 'Broadcast';
  grants: Array<{ target: TemplateTarget; level: PermissionLevel }>;
}

export const permissionRank: Record<PermissionLevel, number> = {
  owner: 3,
  editor: 2,
  viewer: 1,
};

export function canAccess(current: PermissionLevel, required: PermissionLevel): boolean {
  return permissionRank[current] >= permissionRank[required];
}

export const permissionTemplates: PermissionTemplate[] = [
  {
    id: 'solo-lockdown',
    name: 'Solo Lockdown',
    description: 'Restrict access to the linked operator only. Ideal for personal drafts or red team drops.',
    tag: 'Private',
    grants: [
      { target: 'self', level: 'owner' },
    ],
  },
  {
    id: 'ops-squad',
    name: 'Ops Squad Sync',
    description: 'Grant edit capabilities to the broader ops team while keeping ownership rights.',
    tag: 'Team',
    grants: [
      { target: 'self', level: 'owner' },
      { target: 'others', level: 'editor' },
    ],
  },
  {
    id: 'broadcast-audit',
    name: 'Broadcast Audit',
    description: 'Allow every registered operator to view the asset for limited-time audit scenarios.',
    tag: 'Broadcast',
    grants: [
      { target: 'self', level: 'owner' },
      { target: 'all', level: 'viewer' },
    ],
  },
  {
    id: 'live-online',
    name: 'Live Online Cohort',
    description: 'Share with operators currently online while maintaining editing authority yourself.',
    tag: 'Team',
    grants: [
      { target: 'self', level: 'owner' },
      { target: 'online', level: 'editor' },
    ],
  },
];
