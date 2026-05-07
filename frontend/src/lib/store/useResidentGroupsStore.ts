import { create } from 'zustand';
import type { ResidentGroup } from '../types';
import {
  createResidentGroup,
  deleteResidentGroup,
  listResidentGroups,
  setResidentGroupMembers,
} from '../api';

interface ResidentGroupsState {
  groups: ResidentGroup[];
  hydrate: (groups: ResidentGroup[]) => void;
  refresh: () => Promise<void>;
  createGroup: (name: string, type: ResidentGroup['type']) => Promise<ResidentGroup>;
  deleteGroup: (id: string) => Promise<void>;
  setMembers: (id: string, residentIds: string[]) => Promise<void>;
}

export const useResidentGroupsStore = create<ResidentGroupsState>((set) => ({
  groups: [],

  hydrate: (groups) => set({ groups }),

  refresh: async () => {
    set({ groups: await listResidentGroups() });
  },

  createGroup: async (name, type) => {
    const created = await createResidentGroup({ name, type });
    set((s) => ({ groups: [...s.groups, created] }));
    return created;
  },

  deleteGroup: async (id) => {
    await deleteResidentGroup(id);
    set((s) => ({ groups: s.groups.filter((g) => g.id !== id) }));
  },

  setMembers: async (id, residentIds) => {
    const updated = await setResidentGroupMembers(id, residentIds);
    set((s) => ({ groups: s.groups.map((g) => (g.id === id ? updated : g)) }));
  },
}));
