import { create } from 'zustand';
import type { QaaMeetingNote, QaaNotes, Qapi, QapiItem } from '../types';
import {
  createQapi,
  createQapiItem,
  createQaaMeetingNote,
  deleteQapiItem,
  deleteQaaMeetingNote,
  getQaaNotes,
  listQapis,
  listQaaMeetingNotes,
  updateQapi as apiUpdateQapi,
  updateQapiItem as apiUpdateQapiItem,
  updateQaaMeetingNote as apiUpdateQaaMeetingNote,
  updateQaaNotes,
} from '../api';

interface QapiState {
  qapis: Qapi[];
  notes: QaaNotes;
  meetingNotes: QaaMeetingNote[];
  hydrate: (data: { qapis: Qapi[]; notes: QaaNotes; meetingNotes: QaaMeetingNote[] }) => void;
  refresh: () => Promise<void>;
  addQapi: (q: Omit<Qapi, 'id' | 'items'>) => Promise<Qapi>;
  updateQapi: (q: Qapi) => Promise<Qapi>;
  // actualCompletion is required to archive — the backend rejects archive
  // PATCHes without it. UI must collect the date before calling.
  archiveQapi: (id: string, actualCompletion: string) => Promise<Qapi>;
  restoreQapi: (id: string) => Promise<Qapi>;
  addItem: (
    qapiId: string,
    item: Omit<QapiItem, 'id' | 'qapiId' | 'order'>
  ) => Promise<QapiItem>;
  updateItem: (item: QapiItem) => Promise<QapiItem>;
  removeItem: (qapiId: string, itemId: string) => Promise<void>;
  updateNotes: (content: string) => Promise<void>;
  // QAA per-meeting notes
  addMeetingNote: (input: { meetingDate: string; title?: string; content?: string }) => Promise<QaaMeetingNote>;
  updateMeetingNote: (
    id: string,
    patch: Partial<{ meetingDate: string; title: string; content: string }>,
  ) => Promise<QaaMeetingNote>;
  removeMeetingNote: (id: string) => Promise<void>;
}

function replace(qapis: Qapi[], updated: Qapi): Qapi[] {
  return qapis.map((q) => (q.id === updated.id ? updated : q));
}

export const useQapiStore = create<QapiState>((set) => ({
  qapis: [],
  notes: { content: '', updatedAt: '' },
  meetingNotes: [],

  hydrate: ({ qapis, notes, meetingNotes }) => set({ qapis, notes, meetingNotes }),

  refresh: async () => {
    const [qapis, notes, meetingNotes] = await Promise.all([
      listQapis(),
      getQaaNotes(),
      listQaaMeetingNotes(),
    ]);
    set({ qapis, notes, meetingNotes });
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
      // Forward existing completion so a general edit doesn't accidentally
      // clear it. archiveQapi/restoreQapi handle the transition cases.
      actualCompletion: q.actualCompletion,
    });
    set((s) => ({ qapis: replace(s.qapis, updated) }));
    return updated;
  },

  archiveQapi: async (id, actualCompletion) => {
    const updated = await apiUpdateQapi(id, {
      status: 'archived',
      actualCompletion,
    });
    set((s) => ({ qapis: replace(s.qapis, updated) }));
    return updated;
  },

  restoreQapi: async (id) => {
    // Send explicit null so the backend clears the persisted completion.
    const updated = await apiUpdateQapi(id, {
      status: 'active',
      actualCompletion: null,
    });
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

  addMeetingNote: async (input) => {
    const created = await createQaaMeetingNote(input);
    // Insert in chronological order (meeting_date desc) to match the API's sort.
    set((s) => ({
      meetingNotes: [...s.meetingNotes, created].sort(
        (a, b) => b.meetingDate.localeCompare(a.meetingDate),
      ),
    }));
    return created;
  },

  updateMeetingNote: async (id, patch) => {
    const updated = await apiUpdateQaaMeetingNote(id, patch);
    set((s) => ({
      meetingNotes: s.meetingNotes
        .map((n) => (n.id === id ? updated : n))
        .sort((a, b) => b.meetingDate.localeCompare(a.meetingDate)),
    }));
    return updated;
  },

  removeMeetingNote: async (id) => {
    await deleteQaaMeetingNote(id);
    set((s) => ({ meetingNotes: s.meetingNotes.filter((n) => n.id !== id) }));
  },
}));
