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
  mapResident,
  mapResidentGroup,
} from '@/lib/api/mappers';
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

// ─── DTO mappers ─────────────────────────────────────────────────────────────

describe('mappers', () => {
  it('maps a resident DTO with snake-case fields to camelCase', () => {
    const r = mapResident({
      id: 'r1',
      name: 'Eleanor Voss',
      room: '101',
      bed: 'A',
      angel_id: 'a1',
      status: 'active',
      pcc_id: null,
    });
    expect(r).toEqual({
      id: 'r1',
      name: 'Eleanor Voss',
      room: '101',
      bed: 'A',
      angelId: 'a1',
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
      status: 'active',
      pcc_id: null,
    });
    expect(r.angelId).toBeNull();
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
