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
    await setAngelAbsent(id, false);
    // Backend restores residents whose original_angel_id == this angel.
    // Refetch both stores so resident assignments AND every angel's count
    // (the giver loses, the returner gains) reflect the swap.
    await Promise.all([
      useResidentsStore.getState().refresh(),
      (async () => set({ angels: await listAngels() }))(),
    ]);
  },

  redistribute: async (absentAngelId) => {
    await redistributeAngel(absentAngelId);
    await Promise.all([
      useResidentsStore.getState().refresh(),
      (async () => set({ angels: await listAngels() }))(),
    ]);
  },
}));
