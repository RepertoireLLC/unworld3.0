import { create } from 'zustand';

export type MissionStatus = 'planning' | 'queued' | 'in-progress' | 'completed';

export interface Mission {
  id: string;
  title: string;
  objective: string;
  windowStart: number;
  windowEnd: number;
  status: MissionStatus;
  assignedTo: string[];
  encryptionLevel: 'amber' | 'crimson' | 'onyx';
}

interface MissionState {
  missions: Mission[];
  addMission: (mission: Omit<Mission, 'id' | 'status'> & { status?: MissionStatus }) => void;
  updateMissionStatus: (missionId: string, status: MissionStatus) => void;
  getActiveMissions: () => Mission[];
}

const hoursFromNow = (hours: number) => Date.now() + hours * 60 * 60 * 1000;

export const useMissionStore = create<MissionState>((set, get) => ({
  missions: [
    {
      id: 'm-1',
      title: 'Spectral Sweep',
      objective: 'Deploy orbital listeners to capture stray transmissions from Sector Theta.',
      windowStart: hoursFromNow(-2),
      windowEnd: hoursFromNow(4),
      status: 'in-progress',
      assignedTo: ['Nova Ruiz', 'Adian Holt'],
      encryptionLevel: 'onyx',
    },
    {
      id: 'm-2',
      title: 'Beacon Calibration',
      objective: 'Recalibrate ground beacons and push updated spectrum keys to all operators.',
      windowStart: hoursFromNow(1),
      windowEnd: hoursFromNow(6),
      status: 'queued',
      assignedTo: ['Mira West'],
      encryptionLevel: 'crimson',
    },
    {
      id: 'm-3',
      title: 'Vault Compression',
      objective: 'Compact cold storage archives and redistribute redundant shards.',
      windowStart: hoursFromNow(-5),
      windowEnd: hoursFromNow(-1),
      status: 'completed',
      assignedTo: ['Systems Collective'],
      encryptionLevel: 'amber',
    },
  ],

  addMission: (mission) => {
    const now = Date.now();
    const newMission: Mission = {
      id: `m-${now}`,
      status: mission.status ?? 'planning',
      ...mission,
    };

    set((state) => ({
      missions: [newMission, ...state.missions],
    }));
  },

  updateMissionStatus: (missionId, status) => {
    set((state) => ({
      missions: state.missions.map((mission) =>
        mission.id === missionId ? { ...mission, status } : mission
      ),
    }));
  },

  getActiveMissions: () => {
    return get()
      .missions.filter((mission) => mission.status !== 'completed')
      .sort((a, b) => a.windowStart - b.windowStart);
  },
}));
