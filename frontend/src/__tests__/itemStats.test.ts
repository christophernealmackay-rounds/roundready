import { describe, expect, it } from 'vitest';
import {
  qapiItemQuestionIds,
  qapiItemStats,
  recurringQuestions,
} from '@/lib/qapi/itemStats';
import type { CompletedRound, QapiItem, RoundTemplate } from '@/lib/types';

function tq(questionId: string, text: string, order: number) {
  return {
    questionId,
    text,
    issueOn: 'no' as const,
    notifyDepartmentId: '',
    type: 'yesno' as const,
    scaleMin: null,
    scaleMax: null,
    scaleThreshold: null,
    scaleThresholdDirection: null,
    order,
  };
}

const itemA: QapiItem = {
  id: 'item-A', qapiId: 'qapi-1', title: 'Item A', rootCause: '',
  systemicChange: '', monitoringType: 'rounds', monitoringDetail: '',
  responsible: '', startDate: '', expectedCompletion: '', order: 0,
};
const itemB: QapiItem = { ...itemA, id: 'item-B', title: 'Item B', order: 1 };

const template: RoundTemplate = {
  id: 'tmpl-1', name: 'Angel', type: 'angel', active: true,
  startDate: '', deployedAt: null, rapidCompletionCount: 0,
  sections: [
    { id: 's1', title: 'A questions', qapiId: 'qapi-1', qapiItemId: 'item-A',
      questions: [tq('q1', 'Repositioned per schedule?', 0), tq('q2', 'Heels offloaded?', 1)] },
    { id: 's2', title: 'B questions', qapiId: 'qapi-1', qapiItemId: 'item-B',
      questions: [tq('q3', 'Hydration offered?', 0)] },
  ],
};

function round(id: string, day: string, answers: { questionId: string; answer: boolean; issueFlagged: boolean }[]): CompletedRound {
  return {
    id, templateId: 'tmpl-1', angelId: 'a1', residentId: 'r1',
    completedAt: `${day}T10:00:00.000Z`,
    answers: answers.map((a) => ({ ...a, answerNumber: null })),
  };
}

const START = new Date('2026-05-01T00:00:00');
const END = new Date('2026-05-31T23:59:59');

describe('qapiItemQuestionIds', () => {
  it('returns only the questions linked to the item via qapiItemId', () => {
    expect([...qapiItemQuestionIds(itemA, template)].sort()).toEqual(['q1', 'q2']);
    expect([...qapiItemQuestionIds(itemB, template)]).toEqual(['q3']);
  });

  it('is empty when the template is undefined', () => {
    expect(qapiItemQuestionIds(itemA, undefined).size).toBe(0);
  });
});

describe('qapiItemStats', () => {
  const rounds: CompletedRound[] = [
    round('rd1', '2026-05-02', [
      { questionId: 'q1', answer: true, issueFlagged: false },
      { questionId: 'q2', answer: false, issueFlagged: true },
      { questionId: 'q3', answer: true, issueFlagged: false }, // belongs to item B — ignored for A
    ]),
    round('rd2', '2026-05-03', [
      { questionId: 'q1', answer: true, issueFlagged: false },
      { questionId: 'q2', answer: true, issueFlagged: false },
    ]),
  ];

  it('counts only the item\'s questions and computes the clean rate', () => {
    const s = qapiItemStats(itemA, template, rounds, START, END);
    // 4 answers for q1/q2, 1 flagged → clean rate = 75%
    expect(s.answered).toBe(4);
    expect(s.flagged).toBe(1);
    expect(s.cleanRate).toBe(75);
  });

  it('returns null clean rate when nothing was answered', () => {
    const s = qapiItemStats(itemA, template, [], START, END);
    expect(s.answered).toBe(0);
    expect(s.cleanRate).toBeNull();
    expect(s.daily).toEqual([]);
  });

  it('excludes rounds outside the date window', () => {
    const outside = [round('old', '2026-04-15', [{ questionId: 'q1', answer: true, issueFlagged: false }])];
    expect(qapiItemStats(itemA, template, outside, START, END).answered).toBe(0);
  });

  it('produces a chronological daily clean-rate series', () => {
    const s = qapiItemStats(itemA, template, rounds, START, END);
    expect(s.daily.map((d) => d.date)).toEqual(['2026-05-02', '2026-05-03']);
    expect(s.daily[0].cleanRate).toBe(50); // 2 answers, 1 flagged
    expect(s.daily[1].cleanRate).toBe(100);
  });

  it('builds a per-question breakdown sorted worst-first', () => {
    const s = qapiItemStats(itemA, template, rounds, START, END);
    expect(s.byQuestion[0].questionId).toBe('q2'); // most issues first
    const q2 = s.byQuestion.find((q) => q.questionId === 'q2')!;
    expect(q2).toMatchObject({ text: 'Heels offloaded?', answered: 2, yes: 1, no: 1, issues: 1 });
  });
});

describe('recurringQuestions', () => {
  const byQuestion = [
    { questionId: 'q1', text: 'A', answered: 10, yes: 5, no: 5, issues: 5 },
    { questionId: 'q2', text: 'B', answered: 10, yes: 9, no: 1, issues: 1 },
    { questionId: 'q3', text: 'C', answered: 10, yes: 7, no: 3, issues: 3 },
  ];

  it('keeps only questions at or above the threshold, worst first', () => {
    const r = recurringQuestions(byQuestion);
    expect(r.map((q) => q.questionId)).toEqual(['q1', 'q3']);
  });

  it('respects a custom threshold', () => {
    expect(recurringQuestions(byQuestion, 1).map((q) => q.questionId)).toEqual(['q1', 'q3', 'q2']);
  });
});
