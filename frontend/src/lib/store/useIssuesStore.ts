import { create } from 'zustand';
import type { Issue } from '../types';
import {
  listIssues,
  reopenIssue as apiReopen,
  resolveIssue as apiResolve,
} from '../api';

interface IssuesState {
  issues: Issue[];
  hydrate: (issues: Issue[]) => void;
  refresh: () => Promise<void>;
  resolveIssue: (id: string, resolvedBy: string, notes: string) => Promise<void>;
  reopenIssue: (id: string) => Promise<void>;
}

export const useIssuesStore = create<IssuesState>((set) => ({
  issues: [],

  hydrate: (issues) => set({ issues }),

  refresh: async () => {
    set({ issues: await listIssues() });
  },

  resolveIssue: async (id, resolvedBy, notes) => {
    const updated = await apiResolve(id, resolvedBy, notes);
    set((s) => ({ issues: s.issues.map((i) => (i.id === id ? updated : i)) }));
  },

  reopenIssue: async (id) => {
    const updated = await apiReopen(id);
    set((s) => ({ issues: s.issues.map((i) => (i.id === id ? updated : i)) }));
  },
}));
