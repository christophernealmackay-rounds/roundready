/**
 * Pure, unit-testable aggregation for per-QAPI-item KPIs and reports.
 *
 * "Clean rate" = share of answered questions (for the item's linked
 * questions, within the date window) that did NOT raise an issue. A higher
 * number is better — it is the inverse of the flag rate.
 */
import type {
  CompletedRound,
  QapiItem,
  RoundTemplate,
  TemplateSection,
} from '../types';

export interface QuestionBreakdown {
  questionId: string;
  text: string;
  answered: number;
  yes: number;
  no: number;
  issues: number;
}

export interface QapiItemStats {
  answered: number;
  flagged: number;
  /** % of answered questions with no issue flagged; null when nothing answered. */
  cleanRate: number | null;
  /** Chronological per-day clean rate over days that had activity. */
  daily: { date: string; cleanRate: number | null }[];
  byQuestion: QuestionBreakdown[];
}

/** Template sections wired to this QAPI item via template_section.qapiItemId. */
export function qapiItemSections(
  item: QapiItem,
  template: RoundTemplate | undefined,
): TemplateSection[] {
  if (!template) return [];
  return template.sections.filter((s) => s.qapiItemId === item.id);
}

export function qapiItemQuestionIds(
  item: QapiItem,
  template: RoundTemplate | undefined,
): Set<string> {
  return new Set(
    qapiItemSections(item, template).flatMap((s) =>
      s.questions.map((q) => q.questionId),
    ),
  );
}

function questionTextMap(sections: TemplateSection[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const s of sections) {
    for (const q of s.questions) {
      if (!m.has(q.questionId)) m.set(q.questionId, q.text);
    }
  }
  return m;
}

export function qapiItemStats(
  item: QapiItem,
  template: RoundTemplate | undefined,
  rounds: CompletedRound[],
  start: Date,
  end: Date,
): QapiItemStats {
  const sections = qapiItemSections(item, template);
  const qIds = new Set(
    sections.flatMap((s) => s.questions.map((q) => q.questionId)),
  );
  const textOf = questionTextMap(sections);

  let answered = 0;
  let flagged = 0;
  // date -> { answered, flagged }
  const byDay = new Map<string, { answered: number; flagged: number }>();
  // questionId -> breakdown accumulator
  const byQ = new Map<string, QuestionBreakdown>();

  for (const r of rounds) {
    const d = new Date(r.completedAt);
    if (d < start || d > end) continue;
    const day = r.completedAt.slice(0, 10);
    for (const a of r.answers) {
      if (!qIds.has(a.questionId)) continue;
      answered += 1;
      const isFlagged = a.issueFlagged === true;
      if (isFlagged) flagged += 1;

      const dayAgg = byDay.get(day) ?? { answered: 0, flagged: 0 };
      dayAgg.answered += 1;
      if (isFlagged) dayAgg.flagged += 1;
      byDay.set(day, dayAgg);

      const q =
        byQ.get(a.questionId) ?? {
          questionId: a.questionId,
          text: textOf.get(a.questionId) ?? '',
          answered: 0,
          yes: 0,
          no: 0,
          issues: 0,
        };
      q.answered += 1;
      if (a.answer === true) q.yes += 1;
      else if (a.answer === false) q.no += 1;
      if (isFlagged) q.issues += 1;
      byQ.set(a.questionId, q);
    }
  }

  const cleanRate =
    answered > 0 ? Math.round(((answered - flagged) / answered) * 100) : null;

  const daily = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, agg]) => ({
      date,
      cleanRate:
        agg.answered > 0
          ? Math.round(((agg.answered - agg.flagged) / agg.answered) * 100)
          : null,
    }));

  const byQuestion = [...byQ.values()].sort((a, b) => b.issues - a.issues);

  return { answered, flagged, cleanRate, daily, byQuestion };
}

/**
 * Questions flagged at or above `threshold` times in the window, worst
 * first — the "recurring issue" highlight QAPIs must demonstrate.
 */
export function recurringQuestions(
  byQuestion: QuestionBreakdown[],
  threshold = 3,
): QuestionBreakdown[] {
  return byQuestion
    .filter((q) => q.issues >= threshold)
    .sort((a, b) => b.issues - a.issues);
}
