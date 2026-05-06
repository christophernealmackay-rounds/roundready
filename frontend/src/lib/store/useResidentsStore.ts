import { create } from 'zustand';
import type { Resident } from '../types';
import { residents as seedResidents } from '../seed';

interface ResidentsState {
  residents: Resident[];
  assignToAngel: (residentId: string, angelId: string) => void;
  unassignResident: (residentId: string) => void;
  unassignByAngel: (angelId: string) => void;
  restoreByAngel: (angelId: string, residentIds: string[]) => void;
  autoAssign: (angelIds: string[]) => void;
}

export const useResidentsStore = create<ResidentsState>((set, get) => ({
  residents: seedResidents,

  assignToAngel: (residentId, angelId) => set((s) => ({
    residents: s.residents.map((r) =>
      r.id === residentId ? { ...r, angelId } : r
    ),
  })),

  unassignResident: (residentId) => set((s) => ({
    residents: s.residents.map((r) =>
      r.id === residentId ? { ...r, angelId: null } : r
    ),
  })),

  unassignByAngel: (angelId) => set((s) => ({
    residents: s.residents.map((r) =>
      r.angelId === angelId ? { ...r, angelId: null } : r
    ),
  })),

  restoreByAngel: (angelId, residentIds) => set((s) => ({
    residents: s.residents.map((r) =>
      residentIds.includes(r.id) ? { ...r, angelId } : r
    ),
  })),

  // Assign all unassigned residents to angels in order, keeping room beds together
  autoAssign: (angelIds) => {
    if (!angelIds.length) return;
    const { residents } = get();
    const unassigned = residents
      .filter((r) => r.angelId === null && r.status === 'active')
      .sort((a, b) => {
        const roomDiff = parseInt(a.room) - parseInt(b.room);
        return roomDiff !== 0 ? roomDiff : a.bed.localeCompare(b.bed);
      });

    // Group by room so all beds in same room go to same angel
    const byRoom = new Map<string, Resident[]>();
    for (const r of unassigned) {
      const group = byRoom.get(r.room) ?? [];
      group.push(r);
      byRoom.set(r.room, group);
    }

    let angelIndex = 0;
    const updates = new Map<string, string>();
    for (const [, group] of byRoom) {
      const angelId = angelIds[angelIndex % angelIds.length];
      for (const r of group) updates.set(r.id, angelId);
      angelIndex++;
    }

    set((s) => ({
      residents: s.residents.map((r) =>
        updates.has(r.id) ? { ...r, angelId: updates.get(r.id)! } : r
      ),
    }));
  },
}));
