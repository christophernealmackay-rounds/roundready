import { create } from 'zustand';
import type { QaaNotes, Qapi, QapiItem } from '../types';
import {
  createQapi,
  createQapiItem,
  deleteQapiItem,
  getQaaNotes,
  listQapis,
  updateQapi as apiUpdateQapi,
  updateQapiItem as apiUpdateQapiItem,
  updateQaaNotes,
} from '../api';

interface QapiState {
  qapis: Qapi[];
  notes: QaaNotes;
  hydrate: (data: { qapis: Qapi[]; notes: QaaNotes }) => void;
  refresh: () => Promise<void>;
  addQapi: (q: Omit<Qapi, 'id' | 'items'>) => Promise<Qapi>;
  updateQapi: (q: Qapi) => Promise<Qapi>;
  archiveQapi: (id: string) => Promise<Qapi>;
  restoreQapi: (id: string) => Promise<Qapi>;
  addItem: (
    qapiId: string,
    item: Omit<QapiItem, 'id' | 'qapiId' | 'order'>
  ) => Promise<QapiItem>;
  updateItem: (item: QapiItem) => Promise<QapiItem>;
  removeItem: (qapiId: string, itemId: string) => Promise<void>;
  updateNotes: (content: string) => Promise<void>;
}

function replace(qapis: Qapi[], updated: Qapi): Qapi[] {
  return qapis.map((q) => (q.id === updated.id ? updated : q));
}

export const useQapiStore = create<QapiState>((set) => ({
  qapis: [],
  notes: { content: '', updatedAt: '' },

  hydrate: ({ qapis, notes }) => set({ qapis, notes }),

  refresh: async () => {
    const [qapis, notes] = await Promise.all([listQapis(), getQaaNotes()]);
    set({ qapis, notes });
  },

  addQapi: async (q) => {
    const created = await createQapi({
      title: q.title,
      issuesIdentified: q.issuesIdentified,
      dateIdentified: q.dateIdentified || null,
    });
    set((s) => ({ qapis: [...s.qapis, created] }));
    return created;
  },

  updateQapi: async (q) => {
    const updated = await apiUpdateQapi(q.id, {
      title: q.title,
      status: q.status,
      issuesIdentified: q.issuesIdentified,
      dateIdentified: q.dateIdentified || null,
    });
    set((s) => ({ qapis: replace(s.qapis, updated) }));
    return updated;
  },

  archiveQapi: async (id) => {
    const updated = await apiUpdateQapi(id, { status: 'archived' });
    set((s) => ({ qapis: replace(s.qapis, updated) }));
    return updated;
  },

  restoreQapi: async (id) => {
    const updated = await apiUpdateQapi(id, { status: 'active' });
    set((s) => ({ qapis: replace(s.qapis, updated) }));
    return updated;
  },

  addItem: async (qapiId, item) => {
    const created = await createQapiItem(qapiId, item);
    set((s) => ({
      qapis: s.qapis.map((q) =>
        q.id === qapiId ? { ...q, items: [...q.items, created] } : q
      ),
    }));
    return created;
  },

  updateItem: async (item) => {
    const updated = await apiUpdateQapiItem(item.qapiId, item.id, item);
    set((s) => ({
      qapis: s.qapis.map((q) =>
        q.id === updated.qapiId
          ? {
              ...q,
              items: q.items.map((i) => (i.id === updated.id ? updated : i)),
            }
          : q
      ),
    }));
    return updated;
  },

  removeItem: async (qapiId, itemId) => {
    await deleteQapiItem(qapiId, itemId);
    set((s) => ({
      qapis: s.qapis.map((q) =>
        q.id === qapiId
          ? { ...q, items: q.items.filter((i) => i.id !== itemId) }
          : q
      ),
    }));
  },

  updateNotes: async (content) => {
    const notes = await updateQaaNotes(content);
    set({ notes });
  },
}));
