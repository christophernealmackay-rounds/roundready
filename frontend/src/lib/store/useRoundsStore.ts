import { create } from 'zustand';
import type {
  CompletedRound,
  Question,
  RoundTemplate,
  TemplateQuestion,
  TemplateSection,
} from '../types';
import {
  createQuestion,
  createRoundTemplate,
  deleteQuestion,
  listQuestions,
  listRoundTemplates,
  listRounds,
  submitRound,
} from '../api';
import { useIssuesStore } from './useIssuesStore';

interface RoundsState {
  templates: RoundTemplate[];
  questions: Question[];
  completedRounds: CompletedRound[];
  hydrate: (data: {
    templates: RoundTemplate[];
    questions: Question[];
    rounds: CompletedRound[];
  }) => void;
  refresh: () => Promise<void>;
  addTemplate: (
    t: Omit<RoundTemplate, 'id' | 'sections' | 'active'>
  ) => Promise<RoundTemplate>;
  archiveTemplate: (id: string) => void;
  addSection: (
    templateId: string,
    section: Omit<TemplateSection, 'id'>
  ) => void;
  removeSection: (templateId: string, sectionId: string) => void;
  addQuestion: (
    templateId: string,
    sectionId: string,
    q: TemplateQuestion
  ) => void;
  removeQuestion: (
    templateId: string,
    sectionId: string,
    questionId: string
  ) => void;
  addRepositoryQuestion: (q: Omit<Question, 'id'>) => Promise<Question>;
  removeRepositoryQuestion: (id: string) => Promise<void>;
  completeRound: (
    round: Omit<CompletedRound, 'id'>
  ) => Promise<CompletedRound>;
}

export const useRoundsStore = create<RoundsState>((set) => ({
  templates: [],
  questions: [],
  completedRounds: [],

  hydrate: ({ templates, questions, rounds }) =>
    set({ templates, questions, completedRounds: rounds }),

  refresh: async () => {
    const [templates, questions, completedRounds] = await Promise.all([
      listRoundTemplates(),
      listQuestions(),
      listRounds(),
    ]);
    set({ templates, questions, completedRounds });
  },

  addTemplate: async (t) => {
    const created = await createRoundTemplate({
      name: t.name,
      type: t.type,
      startDate: t.startDate,
      endDate: t.endDate,
    });
    set((s) => ({ templates: [...s.templates, created] }));
    return created;
  },

  // Template-section/question mutations are local-only until Phase 8
  // adds the backend endpoints for managing template structure.
  archiveTemplate: (id) =>
    set((s) => ({
      templates: s.templates.map((t) =>
        t.id === id
          ? { ...t, active: false, archivedAt: new Date().toISOString() }
          : t
      ),
    })),

  addSection: (templateId, section) =>
    set((s) => ({
      templates: s.templates.map((t) =>
        t.id === templateId
          ? {
              ...t,
              sections: [
                ...t.sections,
                { ...section, id: `sec-${Date.now()}` },
              ],
            }
          : t
      ),
    })),

  removeSection: (templateId, sectionId) =>
    set((s) => ({
      templates: s.templates.map((t) =>
        t.id === templateId
          ? { ...t, sections: t.sections.filter((sec) => sec.id !== sectionId) }
          : t
      ),
    })),

  addQuestion: (templateId, sectionId, q) =>
    set((s) => ({
      templates: s.templates.map((t) => {
        if (t.id !== templateId) return t;
        return {
          ...t,
          sections: t.sections.map((sec) =>
            sec.id === sectionId
              ? { ...sec, questions: [...sec.questions, q] }
              : sec
          ),
        };
      }),
    })),

  removeQuestion: (templateId, sectionId, questionId) =>
    set((s) => ({
      templates: s.templates.map((t) => {
        if (t.id !== templateId) return t;
        return {
          ...t,
          sections: t.sections.map((sec) =>
            sec.id === sectionId
              ? {
                  ...sec,
                  questions: sec.questions.filter(
                    (q) => q.questionId !== questionId
                  ),
                }
              : sec
          ),
        };
      }),
    })),

  addRepositoryQuestion: async (q) => {
    const created = await createQuestion({
      text: q.text,
      section: q.section,
      issueOn: q.issueOn,
      notifyDepartmentId: q.notifyDepartmentId,
      inRepository: q.inRepository,
    });
    set((s) => ({ questions: [...s.questions, created] }));
    return created;
  },

  removeRepositoryQuestion: async (id) => {
    await deleteQuestion(id);
    set((s) => ({ questions: s.questions.filter((q) => q.id !== id) }));
  },

  completeRound: async (round) => {
    const created = await submitRound({
      templateId: round.templateId,
      angelId: round.angelId,
      residentId: round.residentId,
      answers: round.answers,
    });
    set((s) => ({ completedRounds: [...s.completedRounds, created] }));
    if (round.answers.some((a) => a.issueFlagged)) {
      await useIssuesStore.getState().refresh();
    }
    return created;
  },
}));
