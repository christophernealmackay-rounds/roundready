import { create } from 'zustand';
import type { Angel } from '../types';
import { angels as seedAngels } from '../seed';
import { useResidentsStore } from './useResidentsStore';

interface AngelsState {
  angels: Angel[];
  addAngel: (a: Omit<Angel, 'id'>) => void;
  updateAngel: (a: Angel) => void;
  removeAngel: (id: string) => void;
  markAbsent: (id: string) => void;
  returnToDuty: (id: string) => void;
  redistribute: (absentAngelId: string) => void;
}

export const useAngelsStore = create<AngelsState>((set, get) => ({
  angels: seedAngels,

  addAngel: (a) => set((s) => ({
    angels: [...s.angels, { ...a, id: `angel-${Date.now()}` }],
  })),

  updateAngel: (a) => set((s) => ({
    angels: s.angels.map((x) => (x.id === a.id ? a : x)),
  })),

  removeAngel: (id) => {
    useResidentsStore.getState().unassignByAngel(id);
    set((s) => ({ angels: s.angels.filter((a) => a.id !== id) }));
  },

  markAbsent: (id) => {
    const { residents } = useResidentsStore.getState();
    const originalResidentIds = residents
      .filter((r) => r.angelId === id)
      .map((r) => r.id);
    useResidentsStore.getState().unassignByAngel(id);
    set((s) => ({
      angels: s.angels.map((a) =>
        a.id === id
          ? { ...a, absent: true, absentSince: new Date().toISOString(), originalResidentIds }
          : a
      ),
    }));
  },

  returnToDuty: (id) => {
    const angel = get().angels.find((a) => a.id === id);
    if (!angel) return;
    if (angel.originalResidentIds?.length) {
      useResidentsStore.getState().restoreByAngel(id, angel.originalResidentIds);
    }
    set((s) => ({
      angels: s.angels.map((a) =>
        a.id === id
          ? { ...a, absent: false, absentSince: undefined, originalResidentIds: undefined }
          : a
      ),
    }));
  },

  redistribute: (absentAngelId) => {
    const available = get()
      .angels.filter((a) => !a.absent && a.id !== absentAngelId)
      .map((a) => a.id);
    if (!available.length) return;
    useResidentsStore.getState().autoAssign(available);
  },
}));
