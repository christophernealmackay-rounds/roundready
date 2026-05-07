import { create } from 'zustand';
import type { Resident } from '../types';
import { assignResident, autoAssignResidents, listResidents } from '../api';

interface ResidentsState {
  residents: Resident[];
  hydrate: (residents: Resident[]) => void;
  refresh: () => Promise<void>;
  assignToAngel: (residentId: string, angelId: string | null) => Promise<void>;
  unassignResident: (residentId: string) => Promise<void>;
  autoAssign: () => Promise<void>;
}

export const useResidentsStore = create<ResidentsState>((set) => ({
  residents: [],

  hydrate: (residents) => set({ residents }),

  refresh: async () => {
    set({ residents: await listResidents() });
  },

  assignToAngel: async (residentId, angelId) => {
    const updated = await assignResident(residentId, angelId);
    set((s) => ({
      residents: s.residents.map((r) => (r.id === residentId ? updated : r)),
    }));
  },

  unassignResident: async (residentId) => {
    const updated = await assignResident(residentId, null);
    set((s) => ({
      residents: s.residents.map((r) => (r.id === residentId ? updated : r)),
    }));
  },

  autoAssign: async () => {
    await autoAssignResidents();
    set({ residents: await listResidents() });
  },
}));
