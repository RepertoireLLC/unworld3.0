import { useEffect, useState } from 'react';
import { BadgeCheck, Shield, Users } from 'lucide-react';
import { usePermissionStore } from '../../../../store/permissionStore';
import { useVaultStore } from '../../../../store/vaultStore';
import { useAuthStore } from '../../../../store/authStore';

interface WidgetProps {
  widgetId: string;
}

export function PrivacyTemplatesWidget({ widgetId }: WidgetProps) {
  const templates = usePermissionStore((state) => state.templates);
  const applyTemplate = usePermissionStore((state) => state.applyTemplate);
  const getPermissionsForResource = usePermissionStore((state) => state.getPermissionsForResource);
  const ensureResource = usePermissionStore((state) => state.ensureResource);
  const files = useVaultStore((state) => state.files);
  const currentUser = useAuthStore((state) => state.user);

  const [selectedResource, setSelectedResource] = useState<string>(files[0]?.id ?? '');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (files.length > 0 && !selectedResource) {
      setSelectedResource(files[0].id);
    }
  }, [files, selectedResource]);

  const handleApply = (templateId: string) => {
    const resourceId = selectedResource || widgetId;
    ensureResource(resourceId, resourceId === widgetId ? 'workspace-widget' : 'vault-file', currentUser?.id ?? 'system');
    const response = applyTemplate(resourceId, templateId, currentUser?.id ?? 'system');
    setFeedback(response.message);
  };

  const permissions = getPermissionsForResource(selectedResource || widgetId);

  return (
    <div className="flex h-full flex-col gap-4 p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Privacy Presets</p>
        <h4 className="text-lg font-semibold text-white">Deploy Permission Blueprints</h4>
        <p className="mt-1 text-xs text-white/60">
          Templates orchestrate who can view or edit vault capsules. Choose a target asset and push a preset to update access instantly.
        </p>
      </div>

      <div>
        <label className="text-xs uppercase tracking-[0.3em] text-white/40">Target Asset</label>
        <select
          value={selectedResource}
          onChange={(event) => setSelectedResource(event.target.value)}
          className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
        >
          <option value="">Workspace Module ({widgetId})</option>
          {files.map((file) => (
            <option key={file.id} value={file.id}>
              {file.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{template.name}</p>
                <p className="text-xs text-white/60">{template.description}</p>
              </div>
              <button
                type="button"
                onClick={() => handleApply(template.id)}
                className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs uppercase tracking-[0.3em] text-emerald-300 transition hover:bg-emerald-500/20"
              >
                Apply
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/50">
              <BadgeCheck className="h-4 w-4 text-emerald-300" />
              {template.grants.map((rule) => (
                <span key={`${template.id}-${rule.target}-${rule.level}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {rule.target} · {rule.level}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {feedback && <p className="text-xs text-white/50">{feedback}</p>}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
          <Shield className="h-4 w-4 text-emerald-300" /> Current Access Graph
        </div>
        <div className="mt-3 space-y-2">
          {permissions.length > 0 ? (
            permissions.map((entry) => (
              <div
                key={`${entry.userId}-${entry.level}`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white/60"
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-white/40" /> {entry.userId}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/60">{entry.level}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-white/40">No permissions have been recorded for the selected asset.</p>
          )}
        </div>
      </div>
    </div>
  );
}
