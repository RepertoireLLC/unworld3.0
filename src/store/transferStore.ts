import { create } from 'zustand';

export type TransferStatus = 'queued' | 'transmitting' | 'verifying' | 'complete';

export interface TransferJob {
  id: string;
  label: string;
  size: string;
  status: TransferStatus;
  progress: number;
  secureHash?: string;
}

interface TransferState {
  transfers: TransferJob[];
  startTransfer: (job: Omit<TransferJob, 'status' | 'progress'>) => void;
  updateTransferProgress: (id: string, progress: number, status?: TransferStatus) => void;
}

export const useTransferStore = create<TransferState>((set) => ({
  transfers: [
    {
      id: 't-1',
      label: 'Cryptex Archive // 44MB',
      size: '44 MB',
      status: 'transmitting',
      progress: 68,
      secureHash: 'd2f9:aa17:bb34',
    },
    {
      id: 't-2',
      label: 'Spectral Logs // 1.4GB',
      size: '1.4 GB',
      status: 'queued',
      progress: 0,
    },
    {
      id: 't-3',
      label: 'Presence Mesh Delta // 512KB',
      size: '512 KB',
      status: 'verifying',
      progress: 92,
      secureHash: '99ab:8712:2210',
    },
  ],

  startTransfer: (job) => {
    set((state) => ({
      transfers: [
        {
          id: job.id,
          label: job.label,
          size: job.size,
          secureHash: job.secureHash,
          status: 'queued',
          progress: 0,
        },
        ...state.transfers,
      ],
    }));
  },

  updateTransferProgress: (id, progress, status) => {
    set((state) => ({
      transfers: state.transfers.map((transfer) =>
        transfer.id === id
          ? {
              ...transfer,
              progress,
              status: status ?? transfer.status,
            }
          : transfer
      ),
    }));
  },
}));
