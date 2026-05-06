import { create } from 'zustand';
import type { RoundTemplate, Question, CompletedRound, TemplateSection, TemplateQuestion } from '../types';
import { roundTemplates as seedTemplates, questions as seedQuestions, completedRounds as seedRounds } from '../seed';
import { useIssuesStore } from './useIssuesStore';
import { useResidentsStore } from './useResidentsStore';
import { useAngelsStore } from './useAngelsStore';
import { useUsersStore } from './useUsersStore';

interface RoundsState {
  templates: RoundTemplate[];
  questions: Question[];
  completedRounds: CompletedRound[];
  addTemplate: (t: Omit<RoundTemplate, 'id' | 'sections'>) => void;
  archiveTemplate: (id: string) => void;
  addSection: (templateId: string, section: Omit<TemplateSection, 'id'>) => void;
  removeSection: (templateId: string, sectionId: string) => void;
  addQuestion: (templateId: string, sectionId: string, q: TemplateQuestion) => void;
  removeQuestion: (templateId: string, sectionId: string, questionId: string) => void;
  addRepositoryQuestion: (q: Omit<Question, 'id'>) => void;
  removeRepositoryQuestion: (id: string) => void;
  completeRound: (round: Omit<CompletedRound, 'id'>) => void;
}

export const useRoundsStore = create<RoundsState>((set, get) => ({
  templates: seedTemplates,
  questions: seedQuestions,
  completedRounds: seedRounds,

  addTemplate: (t) => set((s) => ({
    templates: [...s.templates, { ...t, id: `tmpl-${Date.now()}`, sections: [] }],
  })),

  archiveTemplate: (id) => set((s) => ({
    templates: s.templates.map((t) =>
      t.id === id ? { ...t, active: false, archivedAt: new Date().toISOString() } : t
    ),
  })),

  addSection: (templateId, section) => set((s) => ({
    templates: s.templates.map((t) =>
      t.id === templateId
        ? { ...t, sections: [...t.sections, { ...section, id: `sec-${Date.now()}` }] }
        : t
    ),
  })),

  removeSection: (templateId, sectionId) => set((s) => ({
    templates: s.templates.map((t) =>
      t.id === templateId
        ? { ...t, sections: t.sections.filter((sec) => sec.id !== sectionId) }
        : t
    ),
  })),

  addQuestion: (templateId, sectionId, q) => set((s) => ({
    templates: s.templates.map((t) => {
      if (t.id !== templateId) return t;
      return {
        ...t,
        sections: t.sections.map((sec) =>
          sec.id === sectionId ? { ...sec, questions: [...sec.questions, q] } : sec
        ),
      };
    }),
  })),

  removeQuestion: (templateId, sectionId, questionId) => set((s) => ({
    templates: s.templates.map((t) => {
      if (t.id !== templateId) return t;
      return {
        ...t,
        sections: t.sections.map((sec) =>
          sec.id === sectionId
            ? { ...sec, questions: sec.questions.filter((q) => q.questionId !== questionId) }
            : sec
        ),
      };
    }),
  })),

  addRepositoryQuestion: (q) => set((s) => ({
    questions: [...s.questions, { ...q, id: `q-${Date.now()}` }],
  })),

  removeRepositoryQuestion: (id) => set((s) => ({
    questions: s.questions.filter((q) => q.id !== id),
  })),

  completeRound: (round) => {
    const id = `round-${Date.now()}`;
    set((s) => ({ completedRounds: [...s.completedRounds, { ...round, id }] }));

    // Flag issues for any flagged answers
    const { residents } = useResidentsStore.getState();
    const { angels } = useAngelsStore.getState();
    const { departments } = useUsersStore.getState();
    const { templates } = get();
    const template = templates.find((t) => t.id === round.templateId);
    const resident = residents.find((r) => r.id === round.residentId);
    const angel = angels.find((a) => a.id === round.angelId);

    if (!template || !resident || !angel) return;

    for (const answer of round.answers) {
      if (!answer.issueFlagged) continue;

      // Find question details from template sections
      let questionText = '';
      let notifyDeptId = 'dept-1';
      for (const sec of template.sections) {
        const tq = sec.questions.find((q) => q.questionId === answer.questionId);
        if (tq) { questionText = tq.text; notifyDeptId = tq.notifyDepartmentId; break; }
      }
      const dept = departments.find((d) => d.id === notifyDeptId);

      useIssuesStore.getState().addIssue({
        roundId: id,
        residentId: resident.id,
        residentName: resident.name,
        room: resident.room,
        bed: resident.bed,
        angelId: angel.id,
        angelName: angel.name,
        questionText,
        departmentId: notifyDeptId,
        department: dept?.name ?? '',
        status: 'open',
        createdAt: round.completedAt,
      });
    }
  },
}));
