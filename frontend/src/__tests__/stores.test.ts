/**
 * Frontend store layer is a thin async wrapper around the API now —
 * mutation behaviors (autoAssign, markAbsent cascade, issue auto-creation,
 * QAPI archive/restore) are owned by the backend and exercised by pytest.
 *
 * What we still test in vitest:
 *   - Date-range filtering used by the Reports page (pure UI logic)
 *   - DTO mappers (snake_case API → camelCase domain types)
 */
import { describe, expect, it } from 'vitest';
import {
  mapAngel,
  mapIssue,
  mapQaaMeetingNote,
  mapQuestion,
  mapResident,
  mapResidentGroup,
  mapRound,
  mapRoundTemplate,
  mapUser,
} from '@/lib/api/mappers';
import { unwrap } from '@/lib/api/domain';
import { computeFlag } from '@/components/round/AngelRoundFlow';
import { findDuplicateDepartment } from '@/app/(app)/rounds/page';
import { todayIsoDate, todayEndOfDay, todayStartOfDay, formatDate } from '@/lib/dates';
import type { CompletedRound } from '@/lib/types';

const TODAY_APP = '2026-05-06';
const APP_TODAY_DATE = new Date(`${TODAY_APP}T23:59:59`);

// Inline fixture for date-range tests: 30 days × 1 round/day.
const fixtureRounds: CompletedRound[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(APP_TODAY_DATE);
  d.setDate(APP_TODAY_DATE.getDate() - i);
  d.setHours(10, 0, 0, 0);
  return {
    id: `round-${i}`,
    templateId: 'tmpl-1',
    angelId: 'angel-1',
    residentId: 'res-1',
    completedAt: d.toISOString(),
    answers: [],
  };
});

// ─── Reports date range filtering ────────────────────────────────────────────

describe('Reports date range filtering', () => {
  it('last 7 days returns fewer rounds than last 30 days', () => {
    const end = APP_TODAY_DATE;
    const start7 = new Date(end);
    start7.setDate(end.getDate() - 6);
    start7.setHours(0, 0, 0, 0);
    const start30 = new Date(end);
    start30.setDate(end.getDate() - 29);
    start30.setHours(0, 0, 0, 0);

    const in7 = fixtureRounds.filter((r) => {
      const d = new Date(r.completedAt);
      return d >= start7 && d <= end;
    });
    const in30 = fixtureRounds.filter((r) => {
      const d = new Date(r.completedAt);
      return d >= start30 && d <= end;
    });

    expect(in7.length).toBeGreaterThan(0);
    expect(in30.length).toBeGreaterThan(in7.length);
  });

  it('yesterday only includes rounds from the prior calendar day', () => {
    const end = APP_TODAY_DATE;
    const yStart = new Date(end);
    yStart.setDate(end.getDate() - 1);
    yStart.setHours(0, 0, 0, 0);
    const yEnd = new Date(end);
    yEnd.setHours(0, 0, 0, 0);

    const yesterday = fixtureRounds.filter((r) => {
      const d = new Date(r.completedAt);
      return d >= yStart && d < yEnd;
    });
    expect(yesterday.length).toBe(1);
    expect(yesterday[0].completedAt.startsWith('2026-05-05')).toBe(true);
  });

  it('this month returns only rounds within the current calendar month', () => {
    const monthStart = new Date(APP_TODAY_DATE);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthly = fixtureRounds.filter((r) => {
      const d = new Date(r.completedAt);
      return d >= monthStart && d <= APP_TODAY_DATE;
    });
    expect(monthly.length).toBeGreaterThan(0);
    expect(monthly.every((r) => r.completedAt.startsWith('2026-05'))).toBe(true);
  });
});

// ─── Demo "today" date util ──────────────────────────────────────────────────

describe('demo today date util', () => {
  it('todayIsoDate returns YYYY-MM-DD matching the host clock', () => {
    const iso = todayIsoDate();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const now = new Date();
    expect(iso).toBe(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    );
  });

  it('start/end of day frame the full calendar day', () => {
    const start = todayStartOfDay();
    const end = todayEndOfDay();
    expect(start.getHours()).toBe(0);
    expect(end.getHours()).toBe(23);
    expect(end.getTime() - start.getTime()).toBeGreaterThan(23 * 3600 * 1000);
  });

  it('formatDate parses YYYY-MM-DD as local, no UTC drift', () => {
    // Was: new Date("2026-05-07") → UTC midnight → displayed as "May 6"
    // in any negative-UTC locale. formatDate must keep the same calendar
    // day no matter the host timezone.
    expect(formatDate('2026-05-07')).toBe('May 7, 2026');
    expect(formatDate('2026-01-01')).toBe('Jan 1, 2026');
    expect(formatDate('2026-12-31')).toBe('Dec 31, 2026');
  });

  it('formatDate respects a full ISO datetime', () => {
    // Full ISO strings already include offset/Z, so no parsing trick needed.
    const out = formatDate('2026-05-07T15:30:00Z');
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/May/);
  });

  it('formatDate returns empty string for empty input', () => {
    expect(formatDate('')).toBe('');
  });
});

// ─── Round answer flagging logic (mirrors AngelRoundFlow.submit) ────────────

/**
 * Replica of the inline flagging rule in AngelRoundFlow.tsx so the contract
 * is locked in by a test instead of only living inside a component.
 *
 * Rules:
 *   issue_on='no'     → flag when answer === false
 *   issue_on='yes'    → flag when answer === true
 *   issue_on='either' → never auto-flag (informational, manual escalation)
 *   no answer         → never flag
 */
function shouldFlag(issueOn: 'yes' | 'no' | 'either', value: boolean | undefined): boolean {
  if (value === undefined) return false;
  if (issueOn === 'either') return false;
  return (value && issueOn === 'yes') || (!value && issueOn === 'no');
}

describe('round answer flagging', () => {
  it("issue_on='no' flags only on No", () => {
    expect(shouldFlag('no', false)).toBe(true);
    expect(shouldFlag('no', true)).toBe(false);
  });
  it("issue_on='yes' flags only on Yes", () => {
    expect(shouldFlag('yes', true)).toBe(true);
    expect(shouldFlag('yes', false)).toBe(false);
  });
  it("issue_on='either' is informational and never flags", () => {
    expect(shouldFlag('either', true)).toBe(false);
    expect(shouldFlag('either', false)).toBe(false);
  });
  it('a skipped question never flags regardless of issue_on', () => {
    expect(shouldFlag('no', undefined)).toBe(false);
    expect(shouldFlag('yes', undefined)).toBe(false);
    expect(shouldFlag('either', undefined)).toBe(false);
  });
});

// ─── DTO mappers ─────────────────────────────────────────────────────────────

describe('mappers', () => {
  it('maps a resident DTO with snake-case fields to camelCase', () => {
    const r = mapResident({
      id: 'r1',
      name: 'Eleanor Voss',
      room: '101',
      bed: 'A',
      angel_id: 'a1',
      original_angel_id: null,
      status: 'active',
      pcc_id: null,
    });
    expect(r).toEqual({
      id: 'r1',
      name: 'Eleanor Voss',
      room: '101',
      bed: 'A',
      angelId: 'a1',
      originalAngelId: null,
      status: 'active',
      pccId: undefined,
    });
  });

  it('preserves null angel_id as null on Resident', () => {
    const r = mapResident({
      id: 'r1',
      name: 'Eleanor Voss',
      room: '101',
      bed: 'A',
      angel_id: null,
      original_angel_id: null,
      status: 'active',
      pcc_id: null,
    });
    expect(r.angelId).toBeNull();
  });

  it('exposes original_angel_id as originalAngelId for covering display', () => {
    // When an angel is absent and their resident is being covered, the
    // resident row carries both: angelId points at the cover, originalAngelId
    // points at the permanent owner.
    const r = mapResident({
      id: 'r1',
      name: 'Pearl Tomlinson',
      room: '304',
      bed: 'a',
      angel_id: 'cover-angel',
      original_angel_id: 'permanent-angel',
      status: 'active',
      pcc_id: null,
    });
    expect(r.angelId).toBe('cover-angel');
    expect(r.originalAngelId).toBe('permanent-angel');
  });

  it('maps an angel DTO including department name', () => {
    const a = mapAngel({
      id: 'a1',
      user_id: 'u1',
      name: 'Maria Rodriguez',
      department_id: 'd1',
      department: 'Nursing',
      absent: false,
      absent_since: null,
      resident_count: 4,
    });
    expect(a).toEqual({
      id: 'a1',
      userId: 'u1',
      name: 'Maria Rodriguez',
      departmentId: 'd1',
      department: 'Nursing',
      absent: false,
      absentSince: undefined,
    });
  });

  it('maps an issue DTO with notification trail', () => {
    const i = mapIssue({
      id: 'i1',
      round_id: 'r1',
      question_id: 'q1',
      resident_id: 'res1',
      angel_id: 'a1',
      department_id: 'd1',
      status: 'open',
      created_at: '2026-05-06T10:00:00Z',
      resolved_at: null,
      resolved_by: null,
      resolution_notes: null,
      resident_name: 'Eleanor Voss',
      room: '101',
      bed: 'A',
      angel_name: 'Maria Rodriguez',
      department_name: 'Nursing',
      question_text: 'Skin intact?',
      resolved_by_name: null,
      notifications: [
        {
          id: 'n1',
          issue_id: 'i1',
          notified_user_id: 'u1',
          notified_user_name: 'Patricia Nguyen',
          notified_at: '2026-05-06T10:00:01Z',
          channel: 'in_app',
        },
      ],
    });
    expect(i.notifications).toHaveLength(1);
    expect(i.notifications?.[0].notifiedUserName).toBe('Patricia Nguyen');
    expect(i.status).toBe('open');
    expect(i.questionText).toBe('Skin intact?');
  });

  it('maps a round and includes inline answers from the API', () => {
    // Regression: the dashboard QAPI compliance card was silently broken
    // because mapRound dropped the answers array even after the backend
    // started returning it. Lock in that the mapper preserves answers.
    const r = mapRound({
      id: 'rnd-1',
      template_id: 'tmpl-1',
      angel_id: 'ang-1',
      resident_id: 'res-1',
      completed_at: '2026-05-07T10:00:00Z',
      answers: [
        { question_id: 'q1', answer: true, issue_flagged: false },
        { question_id: 'q2', answer: false, issue_flagged: true },
        { question_id: 'q3', answer: null, issue_flagged: false },
      ],
    } as never);
    expect(r.answers).toHaveLength(3);
    expect(r.answers[0]).toEqual({ questionId: 'q1', answer: true, answerNumber: null, issueFlagged: false });
    expect(r.answers[1].issueFlagged).toBe(true);
    expect(r.answers[2].answer).toBeNull();
  });

  it('mapRound falls back to empty answers when API omits them', () => {
    // Older callers may still send a response without the answers field;
    // the mapper should default to [] not crash.
    const r = mapRound({
      id: 'rnd-2',
      template_id: 'tmpl-2',
      angel_id: 'ang-2',
      resident_id: 'res-2',
      completed_at: '2026-05-07T10:00:00Z',
    } as never);
    expect(r.answers).toEqual([]);
  });

  it('maps a user including notification prefs and role', () => {
    const u = mapUser({
      id: 'u1',
      name: 'Mary Smith',
      email: 'msmith@roundready.demo',
      role: 'admin',
      department_id: 'dept-admin',
      notification_prefs: { issues: true, reminders: false, summaries: true },
      active: true,
    });
    expect(u.role).toBe('admin');
    expect(u.notificationPrefs.issues).toBe(true);
    expect(u.notificationPrefs.reminders).toBe(false);
    expect(u.departmentId).toBe('dept-admin');
  });

  it('maps a user with null department_id to empty string', () => {
    const u = mapUser({
      id: 'u2',
      name: 'No Dept',
      email: 'nd@roundready.demo',
      role: 'viewer',
      department_id: null,
      notification_prefs: {},
      active: true,
    });
    expect(u.departmentId).toBe('');
  });

  it('maps a yes/no question with default fields', () => {
    const q = mapQuestion({
      id: 'q1',
      text: 'Skin intact?',
      section: 'Skin Inspection',
      issue_on: 'no',
      notify_department_id: 'd1',
      department_id: 'd1',
      type: 'yesno',
      scale_min: null,
      scale_max: null,
      scale_threshold: null,
      scale_threshold_direction: null,
      in_repository: true,
    });
    expect(q.type).toBe('yesno');
    expect(q.departmentId).toBe('d1');
    expect(q.scaleMin).toBeNull();
    expect(q.scaleThreshold).toBeNull();
    expect(q.scaleThresholdDirection).toBeNull();
    expect(q.notifyDepartmentId).toBe('d1');
  });

  it('maps a scale question and round-trips scale metadata', () => {
    const q = mapQuestion({
      id: 'q2',
      text: 'Pain level 1-10?',
      section: 'Pain',
      issue_on: 'either',
      notify_department_id: 'd-nursing',
      department_id: 'd-nursing',
      type: 'scale',
      scale_min: 1,
      scale_max: 10,
      scale_threshold: 7,
      scale_threshold_direction: 'gte',
      in_repository: true,
    });
    expect(q.type).toBe('scale');
    expect(q.scaleMin).toBe(1);
    expect(q.scaleMax).toBe(10);
    expect(q.scaleThreshold).toBe(7);
    expect(q.scaleThresholdDirection).toBe('gte');
  });

  it('maps a question with no notify dept to empty string', () => {
    // Empty-string convention: keeps the field a plain string so the form
    // controls don't need a null-aware code path. Backend stores null.
    const q = mapQuestion({
      id: 'q3',
      text: 'Open question',
      section: '',
      issue_on: 'either',
      notify_department_id: null,
      department_id: null,
      type: 'yesno',
      scale_min: null,
      scale_max: null,
      scale_threshold: null,
      scale_threshold_direction: null,
      in_repository: true,
    } as never);
    expect(q.notifyDepartmentId).toBe('');
    expect(q.departmentId).toBe('');
  });

  it('mapRound carries answerNumber for scale answers', () => {
    const r = mapRound({
      id: 'rnd-scale',
      template_id: 'tmpl-1',
      angel_id: 'ang-1',
      resident_id: 'res-1',
      completed_at: '2026-05-07T10:00:00Z',
      answers: [
        // pain level 8 — answer_number populated, answer is null
        { question_id: 'q-pain', answer: null, answer_number: 8, issue_flagged: true },
        // yes/no answer with no number
        { question_id: 'q-skin', answer: true, answer_number: null, issue_flagged: false },
      ],
    } as never);
    expect(r.answers[0].answerNumber).toBe(8);
    expect(r.answers[0].answer).toBeNull();
    expect(r.answers[1].answerNumber).toBeNull();
    expect(r.answers[1].answer).toBe(true);
  });

  it('findDuplicateDepartment matches case-insensitively and trims', () => {
    const depts = [
      { id: 'd1', name: 'Nursing' },
      { id: 'd2', name: 'Rapid Round' },
    ];
    expect(findDuplicateDepartment('nursing', depts)?.id).toBe('d1');
    expect(findDuplicateDepartment('  RAPID ROUND  ', depts)?.id).toBe('d2');
    expect(findDuplicateDepartment('Dietary', depts)).toBeNull();
    expect(findDuplicateDepartment('', depts)).toBeNull();
    expect(findDuplicateDepartment('   ', depts)).toBeNull();
  });

  it('unwrap treats 204 no-content responses as success', () => {
    // Regression: openapi-fetch returns {data: undefined, error: undefined}
    // for successful 204 DELETEs. The old `data === undefined ⇒ throw` rule
    // made every delete throw "API error" — and the UI never updated, so
    // users would retry and hit a real 404. Lock in the new behavior.
    expect(() => unwrap({ data: undefined, error: undefined })).not.toThrow();
  });

  it('unwrap throws when the response carries an error detail', () => {
    expect(() => unwrap({ data: undefined, error: { detail: 'Not found' } }))
      .toThrowError('Not found');
  });

  it('unwrap throws "API error" for opaque errors', () => {
    expect(() => unwrap({ data: undefined, error: 'boom' }))
      .toThrowError('API error');
  });

  it('mapRoundTemplate projects deployedAt and rapidCompletionCount', () => {
    // A deployed rapid round carries the timestamp and an integer count;
    // an angel template surfaces null + 0 since the fields are rapid-only.
    const deployed = mapRoundTemplate({
      id: 't-rapid',
      name: 'Flu screen',
      type: 'rapid',
      active: true,
      start_date: '2026-05-13',
      end_date: '2026-05-20',
      archived_at: null,
      deployed_at: '2026-05-13T10:00:00Z',
      rapid_completion_count: 4,
      sections: [],
    } as never);
    expect(deployed.deployedAt).toBe('2026-05-13T10:00:00Z');
    expect(deployed.rapidCompletionCount).toBe(4);
    expect(deployed.type).toBe('rapid');

    const angel = mapRoundTemplate({
      id: 't-angel',
      name: 'Skin integrity',
      type: 'angel',
      active: true,
      start_date: '2026-04-10',
      end_date: null,
      archived_at: null,
      deployed_at: null,
      rapid_completion_count: 0,
      sections: [],
    } as never);
    expect(angel.deployedAt).toBeNull();
    expect(angel.rapidCompletionCount).toBe(0);
  });

  it('mapQaaMeetingNote round-trips per-meeting fields', () => {
    const n = mapQaaMeetingNote({
      id: 'mn-1',
      facility_id: 'fac-1',
      meeting_date: '2026-05-13',
      title: 'May 2026 committee',
      content: 'Attendees: …',
      created_at: '2026-05-13T15:00:00Z',
      updated_at: '2026-05-13T15:30:00Z',
    });
    expect(n.id).toBe('mn-1');
    expect(n.facilityId).toBe('fac-1');
    expect(n.meetingDate).toBe('2026-05-13');
    expect(n.title).toBe('May 2026 committee');
    expect(n.content).toBe('Attendees: …');
    expect(n.updatedAt).toBe('2026-05-13T15:30:00Z');
  });

  it('mapQaaMeetingNote defaults title and content to empty strings', () => {
    const n = mapQaaMeetingNote({
      id: 'mn-2',
      facility_id: null,
      meeting_date: '2026-06-01',
      title: null,
      content: null,
      created_at: '2026-06-01T00:00:00Z',
      updated_at: '2026-06-01T00:00:00Z',
    } as never);
    expect(n.facilityId).toBeNull();
    expect(n.title).toBe('');
    expect(n.content).toBe('');
  });

  it('maps a resident group with member ids', () => {
    const g = mapResidentGroup({
      id: 'g1',
      name: 'Wing 100',
      type: 'wing',
      facility_id: 'f1',
      member_ids: ['r1', 'r2', 'r3'],
    });
    expect(g.type).toBe('wing');
    expect(g.memberIds).toEqual(['r1', 'r2', 'r3']);
  });
});

describe('flag notes', () => {
  const yesno = (issueOn: 'yes' | 'no' | 'either') =>
    ({ type: 'yesno', issueOn, scaleThreshold: null, scaleThresholdDirection: null } as const);
  const scale = (dir: 'gte' | 'lte', t: number) =>
    ({ type: 'scale', issueOn: 'either', scaleThreshold: t, scaleThresholdDirection: dir } as const);

  it('computeFlag: yes/no honors issueOn', () => {
    expect(computeFlag(yesno('yes'), true)).toBe(true);
    expect(computeFlag(yesno('yes'), false)).toBe(false);
    expect(computeFlag(yesno('no'), false)).toBe(true);
    expect(computeFlag(yesno('no'), true)).toBe(false);
    expect(computeFlag(yesno('either'), true)).toBe(false);
    expect(computeFlag(yesno('either'), false)).toBe(false);
  });

  it('computeFlag: scale honors threshold + direction', () => {
    expect(computeFlag(scale('gte', 7), 7)).toBe(true);
    expect(computeFlag(scale('gte', 7), 6)).toBe(false);
    expect(computeFlag(scale('lte', 2), 2)).toBe(true);
    expect(computeFlag(scale('lte', 2), 3)).toBe(false);
  });

  it('computeFlag: no answer never flags', () => {
    expect(computeFlag(yesno('yes'), undefined)).toBe(false);
    expect(computeFlag(scale('gte', 7), undefined)).toBe(false);
  });

  it('mapIssue carries flag_notes through to flagNotes', () => {
    const base = {
      id: 'i1', round_id: 'r1', question_id: 'q1', resident_id: 'res1',
      angel_id: 'a1', department_id: 'd1', status: 'open' as const,
      created_at: '2026-05-06T10:00:00Z', resolved_at: null, resolved_by: null,
      resolution_notes: null, resident_name: 'A', room: '1', bed: 'A',
      angel_name: 'B', department_name: 'Nursing', question_text: 'Q?',
      resolved_by_name: null, notifications: [],
    };
    expect(mapIssue({ ...base, flag_notes: 'Heels not offloaded.' }).flagNotes)
      .toBe('Heels not offloaded.');
    // Absent / null → undefined (no UI callout rendered).
    expect(mapIssue({ ...base, flag_notes: null }).flagNotes).toBeUndefined();
    expect(mapIssue(base).flagNotes).toBeUndefined();
  });
});
