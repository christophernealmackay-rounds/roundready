import { create } from 'zustand';
import type {
  CompletedRound,
  Question,
  RoundTemplate,
  TemplateQuestion,
  TemplateSection,
} from '../types';
import {
  addQuestionToSection,
  createQuestion,
  createRoundTemplate,
  createTemplateSection,
  deleteQuestion,
  deleteRoundTemplate,
  deleteTemplateSection,
  deployRoundTemplate,
  listQuestions,
  listRoundTemplates,
  listRounds,
  removeQuestionFromSection,
  submitRound,
  updateQuestion,
  updateRoundTemplate,
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
    t: Omit<
      RoundTemplate,
      'id' | 'sections' | 'active' | 'archivedAt' | 'deployedAt' | 'rapidCompletionCount'
    >
  ) => Promise<RoundTemplate>;
  archiveTemplate: (id: string) => Promise<RoundTemplate>;
  deleteTemplate: (id: string) => Promise<void>;
  deployTemplate: (id: string) => Promise<RoundTemplate>;
  addSection: (
    templateId: string,
    section: Omit<TemplateSection, 'id' | 'questions'>
  ) => Promise<TemplateSection>;
  removeSection: (templateId: string, sectionId: string) => Promise<void>;
  addQuestion: (
    templateId: string,
    sectionId: string,
    questionId: string
  ) => Promise<TemplateQuestion>;
  removeQuestion: (
    templateId: string,
    sectionId: string,
    templateQuestionId: string
  ) => Promise<void>;
  addRepositoryQuestion: (q: Omit<Question, 'id'>) => Promise<Question>;
  updateRepositoryQuestion: (id: string, patch: Partial<Omit<Question, 'id'>>) => Promise<Question>;
  removeRepositoryQuestion: (id: string) => Promise<void>;
  completeRound: (
    round: Omit<CompletedRound, 'id'>
  ) => Promise<CompletedRound>;
}

function replaceTemplate(
  templates: RoundTemplate[],
  updated: RoundTemplate
): RoundTemplate[] {
  return templates.map((t) => (t.id === updated.id ? updated : t));
}

function patchSection(
  templates: RoundTemplate[],
  templateId: string,
  patcher: (sections: TemplateSection[]) => TemplateSection[]
): RoundTemplate[] {
  return templates.map((t) =>
    t.id === templateId ? { ...t, sections: patcher(t.sections) } : t
  );
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

  archiveTemplate: async (id) => {
    const updated = await updateRoundTemplate(id, {
      active: false,
      archivedAt: new Date().toISOString(),
    });
    set((s) => ({ templates: replaceTemplate(s.templates, updated) }));
    return updated;
  },

  deleteTemplate: async (id) => {
    await deleteRoundTemplate(id);
    set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }));
  },

  deployTemplate: async (id) => {
    const updated = await deployRoundTemplate(id);
    set((s) => ({ templates: replaceTemplate(s.templates, updated) }));
    return updated;
  },

  addSection: async (templateId, section) => {
    const created = await createTemplateSection(templateId, {
      title: section.title,
      qapiId: section.qapiId,
      qapiItemId: section.qapiItemId,
    });
    const newSection: TemplateSection = { ...created, questions: [] };
    set((s) => ({
      templates: patchSection(s.templates, templateId, (sections) => [
        ...sections,
        newSection,
      ]),
    }));
    return newSection;
  },

  removeSection: async (templateId, sectionId) => {
    await deleteTemplateSection(sectionId);
    set((s) => ({
      templates: patchSection(s.templates, templateId, (sections) =>
        sections.filter((sec) => sec.id !== sectionId)
      ),
    }));
  },

  addQuestion: async (templateId, sectionId, questionId) => {
    const created = await addQuestionToSection(sectionId, { questionId });
    // The API returns text + question_id but not the full question metadata.
    // Hydrate the rest from the in-memory repository so the UI is consistent
    // without an extra round-trip.
    const stored = useRoundsStore.getState().questions.find((q) => q.id === questionId);
    const tq: TemplateQuestion = {
      id: created.id,
      questionId: created.questionId,
      text: created.text,
      issueOn: stored?.issueOn ?? 'either',
      notifyDepartmentId: stored?.notifyDepartmentId ?? '',
      type: stored?.type ?? 'yesno',
      scaleMin: stored?.scaleMin ?? null,
      scaleMax: stored?.scaleMax ?? null,
      scaleThreshold: stored?.scaleThreshold ?? null,
      scaleThresholdDirection: stored?.scaleThresholdDirection ?? null,
      order: created.order,
    };
    set((s) => ({
      templates: patchSection(s.templates, templateId, (sections) =>
        sections.map((sec) =>
          sec.id === sectionId
            ? { ...sec, questions: [...sec.questions, tq] }
            : sec
        )
      ),
    }));
    return tq;
  },

  removeQuestion: async (templateId, sectionId, templateQuestionId) => {
    await removeQuestionFromSection(templateQuestionId);
    set((s) => ({
      templates: patchSection(s.templates, templateId, (sections) =>
        sections.map((sec) =>
          sec.id === sectionId
            ? {
                ...sec,
                questions: sec.questions.filter(
                  (q) => q.id !== templateQuestionId
                ),
              }
            : sec
        )
      ),
    }));
  },

  addRepositoryQuestion: async (q) => {
    const created = await createQuestion({
      text: q.text,
      section: q.section,
      issueOn: q.issueOn,
      notifyDepartmentId: q.notifyDepartmentId,
      departmentId: q.departmentId,
      type: q.type,
      scaleMin: q.scaleMin,
      scaleMax: q.scaleMax,
      scaleThreshold: q.scaleThreshold,
      scaleThresholdDirection: q.scaleThresholdDirection,
      inRepository: q.inRepository,
    });
    set((s) => ({ questions: [...s.questions, created] }));
    return created;
  },

  updateRepositoryQuestion: async (id, patch) => {
    const updated = await updateQuestion(id, patch);
    // Refresh templates too — every section that links this question shows
    // its text/issueOn/notifyDepartmentId inline, so the template needs a
    // re-fetch to pick up the change.
    const templates = await listRoundTemplates();
    set((s) => ({
      questions: s.questions.map((q) => (q.id === id ? updated : q)),
      templates,
    }));
    return updated;
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
