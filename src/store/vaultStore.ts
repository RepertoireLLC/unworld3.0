import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { encryptFile, decryptPayload, payloadToObjectUrl, EncryptedPayload } from '../services/encryptionService';
import { useAuthStore } from './authStore';
import { usePermissionStore } from './permissionStore';
import { useActivityLogStore } from './activityLogStore';

export interface VaultFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  ownerId: string;
  encryptedPayload: EncryptedPayload;
  uploadedAt: number;
}

interface VaultState {
  files: VaultFile[];
  uploadFile: (file: File, encryptionKey: string) => Promise<{ success: boolean; message: string }>;
  requestDownload: (
    fileId: string,
    encryptionKey: string
  ) => Promise<{ success: true; objectUrl: string; fileName: string } | { success: false; message: string }>;
}

export const useVaultStore = create<VaultState>()(
  persist(
    (set, get) => ({
      files: [],
      uploadFile: async (file, encryptionKey) => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) {
          return { success: false, message: 'Authentication required before uploading.' };
        }
        if (!file) {
          return { success: false, message: 'A file must be selected.' };
        }
        if (!encryptionKey) {
          return { success: false, message: 'Provide an encryption key to secure the upload.' };
        }

        try {
          const encryptedPayload = await encryptFile(file, encryptionKey);
          const vaultEntry: VaultFile = {
            id: `vault_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            size: file.size,
            mimeType: encryptedPayload.mimeType,
            ownerId: currentUser.id,
            encryptedPayload,
            uploadedAt: Date.now(),
          };

          set((state) => ({ files: [vaultEntry, ...state.files] }));

          usePermissionStore
            .getState()
            .ensureResource(vaultEntry.id, 'vault-file', currentUser.id);

          useActivityLogStore.getState().addLog({
            actorId: currentUser.id,
            action: 'FILE_UPLOADED',
            message: `${currentUser.name} secured ${file.name} in the encrypted vault.`,
            resourceId: vaultEntry.id,
            status: 'success',
          });

          return { success: true, message: `${file.name} encrypted and stored.` };
        } catch (error) {
          console.error(error);
          return { success: false, message: 'Failed to encrypt file. Verify the encryption key.' };
        }
      },
      requestDownload: async (fileId, encryptionKey) => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) {
          return { success: false, message: 'Authentication required before download.' };
        }

        const file = get().files.find((item) => item.id === fileId);
        if (!file) {
          return { success: false, message: 'File not found in vault.' };
        }

        useActivityLogStore.getState().addLog({
          actorId: currentUser.id,
          action: 'FILE_DOWNLOAD_ATTEMPT',
          message: `${currentUser.name} initiated a download attempt for ${file.name}.`,
          resourceId: file.id,
          status: 'warning',
        });

        const hasAccess = usePermissionStore
          .getState()
          .hasAccess(file.id, currentUser.id, 'viewer');

        if (!hasAccess) {
          useActivityLogStore.getState().addLog({
            actorId: currentUser.id,
            action: 'FILE_DOWNLOAD_ATTEMPT',
            message: `${currentUser.name} was blocked from accessing ${file.name} due to insufficient permissions.`,
            resourceId: file.id,
            status: 'error',
          });
          return { success: false, message: 'Permission denied for this file.' };
        }

        try {
          const decrypted = await decryptPayload(file.encryptedPayload, encryptionKey);
          const objectUrl = payloadToObjectUrl(decrypted, file.mimeType);

          useActivityLogStore.getState().addLog({
            actorId: currentUser.id,
            action: 'FILE_DOWNLOAD_SUCCESS',
            message: `${currentUser.name} successfully retrieved ${file.name} from the vault.`,
            resourceId: file.id,
            status: 'success',
          });

          return { success: true, objectUrl, fileName: file.name };
        } catch (error) {
          console.error(error);
          return { success: false, message: 'Unable to decrypt file with provided key.' };
        }
      },
    }),
    {
      name: 'workspace-vault',
      partialize: (state) => ({ files: state.files }),
    }
  )
);
