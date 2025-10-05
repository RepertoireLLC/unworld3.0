import { FormEvent, useMemo, useState } from 'react';
import { DownloadCloud, KeyRound, ShieldCheck, UploadCloud } from 'lucide-react';
import { useVaultStore } from '../../../../store/vaultStore';
import { usePermissionStore } from '../../../../store/permissionStore';
import { useAuthStore } from '../../../../store/authStore';

interface WidgetProps {
  widgetId: string;
}

export function EncryptedVaultWidget({ widgetId }: WidgetProps) {
  const files = useVaultStore((state) => state.files);
  const uploadFile = useVaultStore((state) => state.uploadFile);
  const requestDownload = useVaultStore((state) => state.requestDownload);
  const getPermissionsForResource = usePermissionStore((state) => state.getPermissionsForResource);
  const ensureResource = usePermissionStore((state) => state.ensureResource);
  const currentUser = useAuthStore((state) => state.user);

  const defaultKey = useMemo(() => import.meta.env.VITE_VAULT_DEFAULT_KEY ?? '', []);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [encryptionKey, setEncryptionKey] = useState(defaultKey);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [downloadKeys, setDownloadKeys] = useState<Record<string, string>>({});

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      setFeedback('Select a file to encrypt and upload.');
      return;
    }
    setIsSubmitting(true);
    const response = await uploadFile(selectedFile, encryptionKey.trim());
    setIsSubmitting(false);
    setFeedback(response.message);
    if (response.success) {
      setSelectedFile(null);
      ensureResource(widgetId, 'workspace-widget', currentUser?.id ?? 'system');
    }
  };

  const handleDownload = async (fileId: string) => {
    const key = downloadKeys[fileId] ?? encryptionKey;
    if (!key) {
      setFeedback('Provide an encryption key to decrypt the file.');
      return;
    }
    const response = await requestDownload(fileId, key.trim());
    if (!response.success) {
      setFeedback(response.message);
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = response.objectUrl;
    anchor.download = response.fileName;
    anchor.click();
    URL.revokeObjectURL(response.objectUrl);
    setFeedback(`Downloaded ${response.fileName}.`);
  };

  return (
    <div className="flex h-full flex-col">
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border-b border-white/10 bg-white/5 p-5"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
              <UploadCloud className="h-4 w-4 text-emerald-300" />
              Secure Upload Capsule
            </label>
            <input
              type="file"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              className="mt-2 w-full cursor-pointer rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-500/20 file:px-3 file:py-2 file:text-emerald-200"
            />
          </div>
          <div className="md:w-64">
            <label className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
              <KeyRound className="h-4 w-4 text-sky-300" />
              Encryption Key
            </label>
            <input
              type="password"
              value={encryptionKey}
              onChange={(event) => setEncryptionKey(event.target.value)}
              placeholder="Enter strong key"
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="md:w-auto rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-xs uppercase tracking-[0.3em] text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/40"
          >
            {isSubmitting ? 'Encrypting…' : 'Encrypt & Store'}
          </button>
        </div>
        {feedback && <p className="mt-3 text-xs text-white/50">{feedback}</p>}
      </form>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
          <span>Encrypted Capsules</span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-white/60">{files.length} Stored</span>
        </div>

        <div className="mt-4 space-y-4">
          {files.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
              No encrypted files yet. Upload artifacts to populate the vault.
            </div>
          )}

          {files.map((file) => {
            const permissions = getPermissionsForResource(file.id);
            return (
              <div
                key={file.id}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{file.name}</p>
                    <p className="text-xs text-white/40">
                      {(file.size / 1024).toFixed(1)} KB · Uploaded {new Date(file.uploadedAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload(file.id)}
                    className="flex items-center gap-2 rounded-lg border border-sky-400/40 bg-sky-500/10 px-3 py-2 text-xs uppercase tracking-[0.3em] text-sky-200 transition hover:bg-sky-500/20"
                  >
                    <DownloadCloud className="h-4 w-4" />
                    Retrieve
                  </button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs uppercase tracking-[0.3em] text-white/40">Decryption Key</label>
                    <input
                      type="password"
                      value={downloadKeys[file.id] ?? ''}
                      onChange={(event) =>
                        setDownloadKeys((previous) => ({
                          ...previous,
                          [file.id]: event.target.value,
                        }))
                      }
                      placeholder="Provide key to decrypt"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
                    />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/40">Access Vector</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/60">
                      {permissions.length > 0 ? (
                        permissions.map((entry) => (
                          <span
                            key={`${file.id}-${entry.userId}`}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1"
                          >
                            {entry.userId} · {entry.level}
                          </span>
                        ))
                      ) : (
                        <span>No permissions recorded.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <footer className="border-t border-white/10 bg-white/5 px-5 py-3 text-xs text-white/50">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-300" />
          AES-GCM encryption is performed locally in the browser. Keep your passphrases safe—lost keys cannot be recovered.
        </div>
      </footer>
    </div>
  );
}
