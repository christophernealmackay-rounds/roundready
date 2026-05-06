import { describe, it, expect, beforeEach } from 'vitest';
import { useResidentsStore } from '@/lib/store/useResidentsStore';
import { useAngelsStore } from '@/lib/store/useAngelsStore';
import { useRoundsStore } from '@/lib/store/useRoundsStore';
import { useIssuesStore } from '@/lib/store/useIssuesStore';
import { useQapiStore } from '@/lib/store/useQapiStore';
import {
  residents as seedResidents,
  angels as seedAngels,
  completedRounds as seedRounds,
  roundTemplates as seedTemplates,
  questions as seedQuestions,
  qapis as seedQapis,
  qaaNotes as seedNotes,
  issues as seedIssues,
} from '@/lib/seed';

const TODAY_APP = '2026-05-06';
const APP_TODAY_DATE = new Date(`${TODAY_APP}T23:59:59`);

// Reset all stores to seed state before each test.
// Merge mode (no replace flag) preserves action functions — only data is reset.
beforeEach(() => {
  useResidentsStore.setState({ residents: [...seedResidents] });
  useAngelsStore.setState({ angels: [...seedAngels] });
  useRoundsStore.setState({
    completedRounds: [...seedRounds],
    templates: seedTemplates,
    questions: seedQuestions,
  });
  useIssuesStore.setState({ issues: [...seedIssues] });
  useQapiStore.setState({ qapis: seedQapis, notes: seedNotes });
});

// ─── autoAssign ──────────────────────────────────────────────────────────────

describe('useResidentsStore.autoAssign', () => {
  it('seed has 4 unassigned active residents (Sandra Kim absent)', () => {
    const unassigned = useResidentsStore.getState().residents.filter(
      (r) => r.angelId === null && r.status === 'active'
    );
    expect(unassigned.length).toBe(4);
  });

  it('assigns all unassigned residents to available angels', () => {
    useResidentsStore.getState().autoAssign(['angel-1', 'angel-2', 'angel-4', 'angel-5']);
    const remaining = useResidentsStore.getState().residents.filter(
      (r) => r.angelId === null && r.status === 'active'
    );
    expect(remaining.length).toBe(0);
  });

  it('keeps both beds in the same room on the same angel', () => {
    useResidentsStore.getState().autoAssign(['angel-1']);
    const res5 = useResidentsStore.getState().residents.find((r) => r.id === 'res-5');
    const res6 = useResidentsStore.getState().residents.find((r) => r.id === 'res-6');
    expect(res5?.angelId).toBe(res6?.angelId);
    expect(res5?.angelId).not.toBeNull();
  });
});

// ─── markAbsent / returnToDuty ───────────────────────────────────────────────

describe('useAngelsStore.markAbsent / returnToDuty', () => {
  it('markAbsent flags the angel and unassigns their residents', () => {
    // angel-1 has res-1, res-2, res-11, res-12
    useAngelsStore.getState().markAbsent('angel-1');
    const angel = useAngelsStore.getState().angels.find((a) => a.id === 'angel-1');
    expect(angel?.absent).toBe(true);
    expect(angel?.originalResidentIds).toContain('res-1');

    const res1 = useResidentsStore.getState().residents.find((r) => r.id === 'res-1');
    expect(res1?.angelId).toBeNull();
  });

  it('returnToDuty restores original resident assignments', () => {
    useAngelsStore.getState().markAbsent('angel-1');
    useAngelsStore.getState().returnToDuty('angel-1');

    const angel = useAngelsStore.getState().angels.find((a) => a.id === 'angel-1');
    expect(angel?.absent).toBe(false);

    const res1 = useResidentsStore.getState().residents.find((r) => r.id === 'res-1');
    expect(res1?.angelId).toBe('angel-1');
  });
});

// ─── redistribute ─────────────────────────────────────────────────────────────

describe('useAngelsStore.redistribute', () => {
  it('assigns absent angel residents to active angels — proves button has real effect', () => {
    // angel-3 (Sandra Kim) is absent with 4 unassigned residents in seed
    const before = useResidentsStore.getState().residents.filter(
      (r) => r.angelId === null && r.status === 'active'
    ).length;
    expect(before).toBe(4); // proves unassigned exist

    useAngelsStore.getState().redistribute('angel-3');

    const after = useResidentsStore.getState().residents.filter(
      (r) => r.angelId === null && r.status === 'active'
    ).length;
    expect(after).toBe(0); // proves redistribution worked
  });
});

// ─── completeRound + issue creation ──────────────────────────────────────────

describe('useRoundsStore.completeRound', () => {
  it('adds round to completedRounds', () => {
    const before = useRoundsStore.getState().completedRounds.length;
    useRoundsStore.getState().completeRound({
      templateId: 'tmpl-1', angelId: 'angel-1', residentId: 'res-1',
      completedAt: `${TODAY_APP}T11:00:00.000Z`,
      answers: [{ questionId: 'q-1', answer: true, issueFlagged: false }],
    });
    expect(useRoundsStore.getState().completedRounds.length).toBe(before + 1);
  });

  it('creates an issue for each flagged answer', () => {
    const before = useIssuesStore.getState().issues.length;
    useRoundsStore.getState().completeRound({
      templateId: 'tmpl-1', angelId: 'angel-1', residentId: 'res-1',
      completedAt: `${TODAY_APP}T11:00:00.000Z`,
      answers: [
        { questionId: 'q-1', answer: false, issueFlagged: true },
        { questionId: 'q-2', answer: true,  issueFlagged: false },
      ],
    });
    expect(useIssuesStore.getState().issues.length).toBe(before + 1);
  });

  it('does NOT create issues for non-flagged answers', () => {
    const before = useIssuesStore.getState().issues.length;
    useRoundsStore.getState().completeRound({
      templateId: 'tmpl-1', angelId: 'angel-1', residentId: 'res-1',
      completedAt: `${TODAY_APP}T11:00:00.000Z`,
      answers: [
        { questionId: 'q-1', answer: true, issueFlagged: false },
        { questionId: 'q-2', answer: true, issueFlagged: false },
      ],
    });
    expect(useIssuesStore.getState().issues.length).toBe(before);
  });

  // ─── BUG: round simulator uses real system clock ──────────────────────────
  it('BUG — round with real system date is NOT in app TODAY filter', () => {
    const systemDate = new Date().toISOString();
    useRoundsStore.getState().completeRound({
      templateId: 'tmpl-1', angelId: 'angel-1', residentId: 'res-1',
      completedAt: systemDate,
      answers: [],
    });
    const lastRound = useRoundsStore.getState().completedRounds.at(-1)!;
    // If real system year != 2026, round won't match app TODAY
    if (!systemDate.startsWith(TODAY_APP)) {
      const todayCount = useRoundsStore.getState().completedRounds.filter(
        (r) => r.completedAt.startsWith(TODAY_APP)
      ).length;
      // The last submitted round does NOT appear in today's filter
      expect(lastRound.completedAt.startsWith(TODAY_APP)).toBe(false);
    }
  });

  it('FIX — round with app TODAY date IS in app TODAY filter', () => {
    const appDate = `${TODAY_APP}T${new Date().toISOString().slice(11)}`;
    useRoundsStore.getState().completeRound({
      templateId: 'tmpl-1', angelId: 'angel-1', residentId: 'res-1',
      completedAt: appDate,
      answers: [],
    });
    const lastRound = useRoundsStore.getState().completedRounds.at(-1)!;
    expect(lastRound.completedAt.startsWith(TODAY_APP)).toBe(true);
  });
});

// ─── Issues resolveIssue ──────────────────────────────────────────────────────

describe('useIssuesStore', () => {
  it('resolveIssue changes status to resolved', () => {
    useIssuesStore.getState().resolveIssue('issue-1', 'Patricia Nguyen', 'Fixed');
    const issue = useIssuesStore.getState().issues.find((i) => i.id === 'issue-1');
    expect(issue?.status).toBe('resolved');
    expect(issue?.resolvedBy).toBe('Patricia Nguyen');
  });

  it('reopenIssue changes status back to open', () => {
    useIssuesStore.getState().resolveIssue('issue-1', 'Patricia Nguyen', 'Fixed');
    useIssuesStore.getState().reopenIssue('issue-1');
    const issue = useIssuesStore.getState().issues.find((i) => i.id === 'issue-1');
    expect(issue?.status).toBe('open');
    expect(issue?.resolvedAt).toBeUndefined();
  });
});

// ─── QAPI store ───────────────────────────────────────────────────────────────

describe('useQapiStore', () => {
  it('archiveQapi changes status to archived', () => {
    useQapiStore.getState().archiveQapi('qapi-1');
    const q = useQapiStore.getState().qapis.find((q) => q.id === 'qapi-1');
    expect(q?.status).toBe('archived');
  });

  it('restoreQapi changes status back to active', () => {
    useQapiStore.getState().archiveQapi('qapi-1');
    useQapiStore.getState().restoreQapi('qapi-1');
    const q = useQapiStore.getState().qapis.find((q) => q.id === 'qapi-1');
    expect(q?.status).toBe('active');
  });

  it('updateNotes saves content and advances timestamp', () => {
    const original = useQapiStore.getState().notes.updatedAt;
    useQapiStore.getState().updateNotes('Updated minutes content');
    const notes = useQapiStore.getState().notes;
    expect(notes.content).toBe('Updated minutes content');
    expect(notes.updatedAt).not.toBe(original);
  });
});

// ─── Reports date range filtering ─────────────────────────────────────────────

describe('Reports date range filtering', () => {
  it('last 7 days returns fewer rounds than last 30 days', () => {
    const rounds = useRoundsStore.getState().completedRounds;
    const end = APP_TODAY_DATE;

    const start7 = new Date(end); start7.setDate(end.getDate() - 6); start7.setHours(0,0,0,0);
    const start30 = new Date(end); start30.setDate(end.getDate() - 29); start30.setHours(0,0,0,0);

    const in7  = rounds.filter((r) => { const d = new Date(r.completedAt); return d >= start7  && d <= end; });
    const in30 = rounds.filter((r) => { const d = new Date(r.completedAt); return d >= start30 && d <= end; });

    expect(in7.length).toBeGreaterThan(0);
    expect(in30.length).toBeGreaterThan(in7.length);
  });

  it('yesterday only includes rounds from 2026-05-05', () => {
    const rounds = useRoundsStore.getState().completedRounds;
    const end = APP_TODAY_DATE;
    const yStart = new Date(end); yStart.setDate(end.getDate() - 1); yStart.setHours(0,0,0,0);
    const yEnd   = new Date(end); yEnd.setHours(0,0,0,0);

    const yesterday = rounds.filter((r) => { const d = new Date(r.completedAt); return d >= yStart && d < yEnd; });
    expect(yesterday.length).toBeGreaterThan(0);
    expect(yesterday.every((r) => r.completedAt.startsWith('2026-05-05'))).toBe(true);
  });

  it('this month returns only may rounds', () => {
    const rounds = useRoundsStore.getState().completedRounds;
    const monthStart = new Date(APP_TODAY_DATE); monthStart.setDate(1); monthStart.setHours(0,0,0,0);

    const monthly = rounds.filter((r) => {
      const d = new Date(r.completedAt);
      return d >= monthStart && d <= APP_TODAY_DATE;
    });
    expect(monthly.length).toBeGreaterThan(0);
    expect(monthly.every((r) => r.completedAt.startsWith('2026-05'))).toBe(true);
  });
});
