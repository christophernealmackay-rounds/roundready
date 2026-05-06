import { create } from 'zustand';
import type { Issue } from '../types';
import { issues as seedIssues } from '../seed';

interface IssuesState {
  issues: Issue[];
  addIssue: (issue: Omit<Issue, 'id'>) => void;
  resolveIssue: (id: string, resolvedBy: string, notes: string) => void;
  reopenIssue: (id: string) => void;
}

export const useIssuesStore = create<IssuesState>((set) => ({
  issues: seedIssues,

  addIssue: (issue) => set((s) => ({
    issues: [...s.issues, { ...issue, id: `issue-${Date.now()}` }],
  })),

  resolveIssue: (id, resolvedBy, notes) => set((s) => ({
    issues: s.issues.map((i) =>
      i.id === id
        ? { ...i, status: 'resolved', resolvedAt: new Date().toISOString(), resolvedBy, resolutionNotes: notes }
        : i
    ),
  })),

  reopenIssue: (id) => set((s) => ({
    issues: s.issues.map((i) =>
      i.id === id
        ? { ...i, status: 'open', resolvedAt: undefined, resolvedBy: undefined, resolutionNotes: undefined }
        : i
    ),
  })),
}));
