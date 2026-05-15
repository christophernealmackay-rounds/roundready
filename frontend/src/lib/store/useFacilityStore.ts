import { create } from 'zustand';
import { getFacilitySettings, updateFacilitySettings } from '../api';

interface FacilityState {
  licensedBedCount: number;
  hydrate: (count: number) => void;
  refresh: () => Promise<void>;
  setLicensedBedCount: (count: number) => Promise<void>;
}

export const useFacilityStore = create<FacilityState>((set) => ({
  // 55 mirrors the schema default; replaced on hydrate from the backend.
  licensedBedCount: 55,

  hydrate: (count) => set({ licensedBedCount: count }),

  refresh: async () => {
    set({ licensedBedCount: await getFacilitySettings() });
  },

  setLicensedBedCount: async (count) => {
    const saved = await updateFacilitySettings(count);
    set({ licensedBedCount: saved });
  },
}));
