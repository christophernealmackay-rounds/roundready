import { create } from 'zustand';
import type { Qapi, QapiItem, QaaNotes } from '../types';
import { qapis as seedQapis, qaaNotes as seedNotes } from '../seed';

interface QapiState {
  qapis: Qapi[];
  notes: QaaNotes;
  addQapi: (q: Omit<Qapi, 'id' | 'items'>) => void;
  updateQapi: (q: Qapi) => void;
  archiveQapi: (id: string) => void;
  restoreQapi: (id: string) => void;
  addItem: (qapiId: string, item: Omit<QapiItem, 'id' | 'qapiId' | 'order'>) => void;
  updateItem: (item: QapiItem) => void;
  removeItem: (qapiId: string, itemId: string) => void;
  updateNotes: (content: string) => void;
}

export const useQapiStore = create<QapiState>((set) => ({
  qapis: seedQapis,
  notes: seedNotes,

  addQapi: (q) => set((s) => ({
    qapis: [
      ...s.qapis,
      { ...q, id: `qapi-${Date.now()}`, items: [] },
    ],
  })),

  updateQapi: (q) => set((s) => ({
    qapis: s.qapis.map((x) => (x.id === q.id ? q : x)),
  })),

  archiveQapi: (id) => set((s) => ({
    qapis: s.qapis.map((q) => (q.id === id ? { ...q, status: 'archived' } : q)),
  })),

  restoreQapi: (id) => set((s) => ({
    qapis: s.qapis.map((q) => (q.id === id ? { ...q, status: 'active' } : q)),
  })),

  addItem: (qapiId, item) => set((s) => ({
    qapis: s.qapis.map((q) => {
      if (q.id !== qapiId) return q;
      const newItem: QapiItem = {
        ...item, id: `qitem-${Date.now()}`, qapiId, order: q.items.length + 1,
      };
      return { ...q, items: [...q.items, newItem] };
    }),
  })),

  updateItem: (item) => set((s) => ({
    qapis: s.qapis.map((q) =>
      q.id === item.qapiId
        ? { ...q, items: q.items.map((i) => (i.id === item.id ? item : i)) }
        : q
    ),
  })),

  removeItem: (qapiId, itemId) => set((s) => ({
    qapis: s.qapis.map((q) =>
      q.id === qapiId ? { ...q, items: q.items.filter((i) => i.id !== itemId) } : q
    ),
  })),

  updateNotes: (content) => set({
    notes: { content, updatedAt: new Date().toISOString() },
  }),
}));
