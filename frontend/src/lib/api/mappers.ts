/**
 * Convert snake_case API DTOs to the camelCase domain types used by the
 * Zustand stores and UI. Keeping the boundary in one place means the rest
 * of the frontend stays unchanged when the schema evolves.
 */
import type { components } from './schema';
import type {
  Angel,
  CompletedRound,
  Department,
  Issue,
  IssueNotification,
  QaaNotes,
  Qapi,
  QapiItem,
  Question,
  Resident,
  ResidentGroup,
  ResidentGroupType,
  Role,
  RoundTemplate,
  TemplateQuestion,
  TemplateSection,
  User,
} from '../types';

type S = components['schemas'];

export function mapDepartment(d: S['DepartmentOut']): Department {
  return { id: d.id, name: d.name, custom: d.custom };
}

export function mapUser(u: S['UserOut']): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as Role,
    departmentId: u.department_id ?? '',
    active: u.active,
    notificationPrefs: (u.notification_prefs ?? {}) as User['notificationPrefs'],
  };
}

export function mapAngel(a: S['AngelOut']): Angel {
  return {
    id: a.id,
    userId: a.user_id,
    name: a.name,
    departmentId: a.department_id ?? '',
    department: a.department ?? '',
    absent: a.absent,
    absentSince: a.absent_since ?? undefined,
  };
}

export function mapResident(r: S['ResidentOut']): Resident {
  return {
    id: r.id,
    name: r.name,
    room: r.room,
    bed: r.bed,
    angelId: r.angel_id ?? null,
    originalAngelId: r.original_angel_id ?? null,
    status: r.status as Resident['status'],
    pccId: r.pcc_id ?? undefined,
  };
}

export function mapQapiItem(it: S['QapiItemOut']): QapiItem {
  return {
    id: it.id,
    qapiId: it.qapi_id,
    title: it.title,
    rootCause: it.root_cause,
    systemicChange: it.systemic_change,
    monitoringType: it.monitoring_type as QapiItem['monitoringType'],
    monitoringDetail: it.monitoring_detail,
    responsible: it.responsible,
    startDate: it.start_date ?? '',
    expectedCompletion: it.expected_completion ?? '',
    order: it.order,
  };
}

export function mapQapi(q: S['QapiOut']): Qapi {
  return {
    id: q.id,
    title: q.title,
    issuesIdentified: q.issues_identified,
    dateIdentified: q.date_identified ?? '',
    // Preserve null vs missing — empty string would conflate "no completion"
    // with "completed but unknown date".
    actualCompletion: q.actual_completion ?? null,
    status: q.status as Qapi['status'],
    items: (q.items ?? []).map(mapQapiItem),
  };
}

export function mapQuestion(q: S['QuestionOut']): Question {
  return {
    id: q.id,
    text: q.text,
    section: q.section,
    issueOn: q.issue_on as Question['issueOn'],
    notifyDepartmentId: q.notify_department_id ?? '',
    inRepository: q.in_repository,
  };
}

function mapTemplateQuestion(tq: S['TemplateQuestionOut']): TemplateQuestion {
  return {
    id: tq.id,
    questionId: tq.question_id,
    text: tq.text,
    issueOn: tq.issue_on as TemplateQuestion['issueOn'],
    notifyDepartmentId: tq.notify_department_id ?? '',
    order: tq.order,
  };
}

function mapTemplateSection(s: S['TemplateSectionOut']): TemplateSection {
  return {
    id: s.id,
    title: s.title,
    qapiId: s.qapi_id ?? undefined,
    qapiItemId: s.qapi_item_id ?? undefined,
    questions: (s.questions ?? []).map(mapTemplateQuestion),
  };
}

export function mapRoundTemplate(t: S['RoundTemplateOut']): RoundTemplate {
  return {
    id: t.id,
    name: t.name,
    type: t.type as RoundTemplate['type'],
    active: t.active,
    startDate: t.start_date ?? '',
    endDate: t.end_date ?? undefined,
    archivedAt: t.archived_at ?? undefined,
    sections: (t.sections ?? []).map(mapTemplateSection),
  };
}

export function mapRound(r: S['RoundOut']): CompletedRound {
  // The list endpoint now returns answers inline so the dashboard can
  // compute QAPI compliance without an N+1 fetch. Older callers that don't
  // include answers (legacy schema) fall through to an empty array.
  const rawAnswers = (r as unknown as { answers?: Array<{
    question_id: string;
    answer: boolean | null;
    issue_flagged: boolean;
  }> }).answers;
  return {
    id: r.id,
    templateId: r.template_id,
    angelId: r.angel_id,
    residentId: r.resident_id,
    completedAt: r.completed_at ?? '',
    answers: rawAnswers
      ? rawAnswers.map((a) => ({
          questionId: a.question_id,
          answer: a.answer ?? null,
          issueFlagged: !!a.issue_flagged,
        }))
      : [],
  };
}

export function mapIssueNotification(n: S['IssueNotificationOut']): IssueNotification {
  return {
    id: n.id,
    issueId: n.issue_id,
    notifiedUserId: n.notified_user_id,
    notifiedUserName: n.notified_user_name ?? undefined,
    notifiedAt: n.notified_at,
    channel: n.channel,
  };
}

export function mapIssue(i: S['IssueOut']): Issue {
  return {
    id: i.id,
    roundId: i.round_id ?? undefined,
    questionId: i.question_id ?? undefined,
    residentId: i.resident_id ?? '',
    residentName: i.resident_name ?? '',
    room: i.room ?? '',
    bed: i.bed ?? '',
    angelId: i.angel_id ?? '',
    angelName: i.angel_name ?? '',
    questionText: i.question_text ?? '',
    departmentId: i.department_id ?? '',
    department: i.department_name ?? '',
    status: i.status as Issue['status'],
    createdAt: i.created_at,
    resolvedAt: i.resolved_at ?? undefined,
    resolvedBy: i.resolved_by ?? undefined,
    resolvedByName: i.resolved_by_name ?? undefined,
    resolutionNotes: i.resolution_notes ?? undefined,
    notifications: (i.notifications ?? []).map(mapIssueNotification),
  };
}

export function mapResidentGroup(g: S['ResidentGroupOut']): ResidentGroup {
  return {
    id: g.id,
    name: g.name,
    type: g.type as ResidentGroupType,
    facilityId: g.facility_id ?? undefined,
    memberIds: g.member_ids ?? [],
  };
}

export function mapQaaNote(n: S['QaaNoteOut']): QaaNotes {
  return { content: n.content, updatedAt: n.updated_at };
}
