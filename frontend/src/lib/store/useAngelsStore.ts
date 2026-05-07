import { create } from 'zustand';
import type { Angel } from '../types';
import {
  createAngel,
  listAngels,
  redistributeAngel,
  setAngelAbsent,
} from '../api';
import { useResidentsStore } from './useResidentsStore';

interface AngelsState {
  angels: Angel[];
  hydrate: (angels: Angel[]) => void;
  refresh: () => Promise<void>;
  addAngel: (input: { userId: string; departmentId: string }) => Promise<Angel>;
  markAbsent: (id: string) => Promise<void>;
  returnToDuty: (id: string) => Promise<void>;
  redistribute: (absentAngelId: string) => Promise<void>;
}

export const useAngelsStore = create<AngelsState>((set) => ({
  angels: [],

  hydrate: (angels) => set({ angels }),

  refresh: async () => {
    set({ angels: await listAngels() });
  },

  addAngel: async (input) => {
    const created = await createAngel(input);
    set((s) => ({ angels: [...s.angels, created] }));
    return created;
  },

  markAbsent: async (id) => {
    const updated = await setAngelAbsent(id, true);
    set((s) => ({ angels: s.angels.map((a) => (a.id === id ? updated : a)) }));
    // Backend cascaded: residents previously assigned to this angel are now unassigned.
    await useResidentsStore.getState().refresh();
  },

  returnToDuty: async (id) => {
    const updated = await setAngelAbsent(id, false);
    set((s) => ({ angels: s.angels.map((a) => (a.id === id ? updated : a)) }));
  },

  redistribute: async (absentAngelId) => {
    await redistributeAngel(absentAngelId);
    await useResidentsStore.getState().refresh();
  },
}));
