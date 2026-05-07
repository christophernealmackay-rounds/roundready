/**
 * Typed, domain-shaped wrappers around the OpenAPI client. Each function
 * returns the camelCase domain type the UI/store layer already expects.
 *
 * Throws on non-2xx so callers can `try/catch` or surface to a toast.
 */
import { api } from './client';
import {
  mapAngel,
  mapDepartment,
  mapIssue,
  mapQaaNote,
  mapQapi,
  mapQapiItem,
  mapQuestion,
  mapResident,
  mapResidentGroup,
  mapRound,
  mapRoundTemplate,
  mapUser,
} from './mappers';
import type {
  Angel,
  CompletedRound,
  Department,
  Issue,
  QaaNotes,
  Qapi,
  QapiItem,
  Question,
  Resident,
  ResidentGroup,
  RoundTemplate,
  User,
} from '../types';

function unwrap<T>({ data, error }: { data?: T; error?: unknown }): T {
  if (error || data === undefined) {
    throw new Error(
      typeof error === 'object' && error && 'detail' in error
        ? String((error as { detail: unknown }).detail)
        : 'API error'
    );
  }
  return data;
}

// ── Departments ─────────────────────────────────────────────────────────────
export async function listDepartments(): Promise<Department[]> {
  const res = await api.GET('/api/v1/departments');
  return unwrap(res).map(mapDepartment);
}

export async function createDepartment(name: string): Promise<Department> {
  const res = await api.POST('/api/v1/departments', {
    body: { name, custom: true },
  });
  return mapDepartment(unwrap(res));
}

export async function deleteDepartment(deptId: string): Promise<void> {
  const res = await api.DELETE('/api/v1/departments/{dept_id}', {
    params: { path: { dept_id: deptId } },
  });
  unwrap(res);
}

// ── Users ───────────────────────────────────────────────────────────────────
export async function listUsers(): Promise<User[]> {
  const res = await api.GET('/api/v1/users');
  return unwrap(res).map(mapUser);
}

export async function createUser(input: {
  name: string;
  email: string;
  role: User['role'];
  departmentId: string;
}): Promise<User> {
  const res = await api.POST('/api/v1/users', {
    body: {
      name: input.name,
      email: input.email,
      role: input.role,
      department_id: input.departmentId || null,
      notification_prefs: {},
    },
  });
  return mapUser(unwrap(res));
}

export async function updateUser(
  userId: string,
  input: Partial<{
    name: string;
    email: string;
    role: User['role'];
    departmentId: string | null;
    active: boolean;
    notificationPrefs: User['notificationPrefs'];
  }>
): Promise<User> {
  const res = await api.PATCH('/api/v1/users/{user_id}', {
    params: { path: { user_id: userId } },
    body: {
      name: input.name,
      email: input.email,
      role: input.role,
      department_id: input.departmentId,
      active: input.active,
      notification_prefs: input.notificationPrefs as { [k: string]: unknown } | null,
    },
  });
  return mapUser(unwrap(res));
}

export async function deleteUser(userId: string): Promise<void> {
  const res = await api.DELETE('/api/v1/users/{user_id}', {
    params: { path: { user_id: userId } },
  });
  unwrap(res);
}

// ── Angels ──────────────────────────────────────────────────────────────────
export async function listAngels(): Promise<Angel[]> {
  const res = await api.GET('/api/v1/angels');
  return unwrap(res).map(mapAngel);
}

export async function createAngel(input: {
  userId: string;
  departmentId: string;
}): Promise<Angel> {
  const res = await api.POST('/api/v1/angels', {
    body: { user_id: input.userId, department_id: input.departmentId || null },
  });
  return mapAngel(unwrap(res));
}

export async function setAngelAbsent(
  angelId: string,
  absent: boolean
): Promise<Angel> {
  const res = await api.PATCH('/api/v1/angels/{angel_id}/absent', {
    params: { path: { angel_id: angelId } },
    body: { absent },
  });
  return mapAngel(unwrap(res));
}

export async function redistributeAngel(angelId: string): Promise<void> {
  const res = await api.POST('/api/v1/angels/{angel_id}/redistribute', {
    params: { path: { angel_id: angelId } },
  });
  unwrap(res);
}

// ── Residents ───────────────────────────────────────────────────────────────
export async function listResidents(): Promise<Resident[]> {
  const res = await api.GET('/api/v1/residents');
  return unwrap(res).map(mapResident);
}

export async function assignResident(
  residentId: string,
  angelId: string | null
): Promise<Resident> {
  const res = await api.PATCH('/api/v1/residents/{resident_id}/assign', {
    params: { path: { resident_id: residentId } },
    body: { angel_id: angelId },
  });
  return mapResident(unwrap(res));
}

export async function autoAssignResidents(): Promise<{
  assigned: number;
  angels: number;
}> {
  const res = await api.POST('/api/v1/residents/auto-assign', {});
  return unwrap(res) as { assigned: number; angels: number };
}

export interface PccSyncResult {
  source: string;
  status: string;
  last_sync: string;
  residents_synced: number;
}

export async function syncPcc(): Promise<PccSyncResult> {
  const res = await api.GET('/api/v1/residents/sync-pcc');
  return unwrap(res) as PccSyncResult;
}

// ── Resident Groups ─────────────────────────────────────────────────────────
export async function listResidentGroups(): Promise<ResidentGroup[]> {
  const res = await api.GET('/api/v1/resident-groups');
  return unwrap(res).map(mapResidentGroup);
}

export async function createResidentGroup(input: {
  name: string;
  type: ResidentGroup['type'];
}): Promise<ResidentGroup> {
  const res = await api.POST('/api/v1/resident-groups', {
    body: { name: input.name, type: input.type },
  });
  return mapResidentGroup(unwrap(res));
}

export async function deleteResidentGroup(groupId: string): Promise<void> {
  const res = await api.DELETE('/api/v1/resident-groups/{group_id}', {
    params: { path: { group_id: groupId } },
  });
  unwrap(res);
}

export async function setResidentGroupMembers(
  groupId: string,
  residentIds: string[]
): Promise<ResidentGroup> {
  const res = await api.PUT('/api/v1/resident-groups/{group_id}/members', {
    params: { path: { group_id: groupId } },
    body: { resident_ids: residentIds },
  });
  return mapResidentGroup(unwrap(res));
}

// ── QAPI ────────────────────────────────────────────────────────────────────
export async function listQapis(): Promise<Qapi[]> {
  const res = await api.GET('/api/v1/qapis');
  return unwrap(res).map(mapQapi);
}

export async function createQapi(input: {
  title: string;
  issuesIdentified?: string;
  dateIdentified?: string | null;
}): Promise<Qapi> {
  const res = await api.POST('/api/v1/qapis', {
    body: {
      title: input.title,
      issues_identified: input.issuesIdentified ?? '',
      date_identified: input.dateIdentified ?? null,
    },
  });
  return mapQapi(unwrap(res));
}

export async function updateQapi(
  qapiId: string,
  input: Partial<{
    title: string;
    status: Qapi['status'];
    issuesIdentified: string;
    dateIdentified: string | null;
  }>
): Promise<Qapi> {
  const res = await api.PATCH('/api/v1/qapis/{qapi_id}', {
    params: { path: { qapi_id: qapiId } },
    body: {
      title: input.title,
      status: input.status,
      issues_identified: input.issuesIdentified,
      date_identified: input.dateIdentified,
    },
  });
  return mapQapi(unwrap(res));
}

export async function deleteQapi(qapiId: string): Promise<void> {
  const res = await api.DELETE('/api/v1/qapis/{qapi_id}', {
    params: { path: { qapi_id: qapiId } },
  });
  unwrap(res);
}

export async function createQapiItem(
  qapiId: string,
  input: Omit<QapiItem, 'id' | 'qapiId' | 'order'>
): Promise<QapiItem> {
  const res = await api.POST('/api/v1/qapis/{qapi_id}/items', {
    params: { path: { qapi_id: qapiId } },
    body: {
      title: input.title,
      root_cause: input.rootCause,
      systemic_change: input.systemicChange,
      monitoring_type: input.monitoringType,
      monitoring_detail: input.monitoringDetail,
      responsible: input.responsible,
      start_date: input.startDate || null,
      expected_completion: input.expectedCompletion || null,
      order: 0,
    },
  });
  return mapQapiItem(unwrap(res));
}

export async function updateQapiItem(
  qapiId: string,
  itemId: string,
  input: Partial<Omit<QapiItem, 'id' | 'qapiId'>>
): Promise<QapiItem> {
  const res = await api.PATCH('/api/v1/qapis/{qapi_id}/items/{item_id}', {
    params: { path: { qapi_id: qapiId, item_id: itemId } },
    body: {
      title: input.title,
      root_cause: input.rootCause,
      systemic_change: input.systemicChange,
      monitoring_type: input.monitoringType,
      monitoring_detail: input.monitoringDetail,
      responsible: input.responsible,
      start_date: input.startDate,
      expected_completion: input.expectedCompletion,
      order: input.order,
    },
  });
  return mapQapiItem(unwrap(res));
}

export async function deleteQapiItem(
  qapiId: string,
  itemId: string
): Promise<void> {
  const res = await api.DELETE('/api/v1/qapis/{qapi_id}/items/{item_id}', {
    params: { path: { qapi_id: qapiId, item_id: itemId } },
  });
  unwrap(res);
}

// ── Questions ───────────────────────────────────────────────────────────────
export async function listQuestions(): Promise<Question[]> {
  const res = await api.GET('/api/v1/questions');
  return unwrap(res).map(mapQuestion);
}

export async function createQuestion(input: {
  text: string;
  section?: string;
  issueOn: Question['issueOn'];
  notifyDepartmentId?: string;
  inRepository?: boolean;
}): Promise<Question> {
  const res = await api.POST('/api/v1/questions', {
    body: {
      text: input.text,
      section: input.section ?? '',
      issue_on: input.issueOn,
      notify_department_id: input.notifyDepartmentId || null,
      in_repository: input.inRepository ?? true,
    },
  });
  return mapQuestion(unwrap(res));
}

export async function updateQuestion(
  questionId: string,
  input: Partial<{
    text: string;
    section: string;
    issueOn: Question['issueOn'];
    notifyDepartmentId: string | null;
    inRepository: boolean;
  }>
): Promise<Question> {
  const res = await api.PATCH('/api/v1/questions/{question_id}', {
    params: { path: { question_id: questionId } },
    body: {
      text: input.text,
      section: input.section,
      issue_on: input.issueOn,
      notify_department_id: input.notifyDepartmentId,
      in_repository: input.inRepository,
    },
  });
  return mapQuestion(unwrap(res));
}

export async function deleteQuestion(questionId: string): Promise<void> {
  const res = await api.DELETE('/api/v1/questions/{question_id}', {
    params: { path: { question_id: questionId } },
  });
  unwrap(res);
}

// ── Rounds ──────────────────────────────────────────────────────────────────
export async function listRoundTemplates(): Promise<RoundTemplate[]> {
  const res = await api.GET('/api/v1/rounds/templates');
  return unwrap(res).map(mapRoundTemplate);
}

export async function createRoundTemplate(input: {
  name: string;
  type: RoundTemplate['type'];
  startDate?: string;
  endDate?: string;
}): Promise<RoundTemplate> {
  const res = await api.POST('/api/v1/rounds/templates', {
    body: {
      name: input.name,
      type: input.type,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
    },
  });
  return mapRoundTemplate(unwrap(res));
}

export async function updateRoundTemplate(
  templateId: string,
  input: Partial<{
    name: string;
    active: boolean;
    startDate: string | null;
    endDate: string | null;
    archivedAt: string | null;
  }>
): Promise<RoundTemplate> {
  const res = await api.PATCH('/api/v1/rounds/templates/{template_id}', {
    params: { path: { template_id: templateId } },
    body: {
      name: input.name,
      active: input.active,
      start_date: input.startDate,
      end_date: input.endDate,
      archived_at: input.archivedAt,
    },
  });
  return mapRoundTemplate(unwrap(res));
}

export async function deleteRoundTemplate(templateId: string): Promise<void> {
  const res = await api.DELETE('/api/v1/rounds/templates/{template_id}', {
    params: { path: { template_id: templateId } },
  });
  unwrap(res);
}

export async function createTemplateSection(
  templateId: string,
  input: { title: string; qapiId?: string; qapiItemId?: string; order?: number }
): Promise<{ id: string; title: string; qapiId?: string; qapiItemId?: string; order: number }> {
  const res = await api.POST(
    '/api/v1/rounds/templates/{template_id}/sections',
    {
      params: { path: { template_id: templateId } },
      body: {
        title: input.title,
        qapi_id: input.qapiId ?? null,
        qapi_item_id: input.qapiItemId ?? null,
        order: input.order ?? 0,
      },
    }
  );
  const s = unwrap(res);
  return {
    id: s.id,
    title: s.title,
    qapiId: s.qapi_id ?? undefined,
    qapiItemId: s.qapi_item_id ?? undefined,
    order: s.order,
  };
}

export async function deleteTemplateSection(sectionId: string): Promise<void> {
  const res = await api.DELETE('/api/v1/rounds/sections/{section_id}', {
    params: { path: { section_id: sectionId } },
  });
  unwrap(res);
}

export async function addQuestionToSection(
  sectionId: string,
  input: { questionId: string; order?: number }
): Promise<{ id: string; questionId: string; text: string; order: number }> {
  const res = await api.POST(
    '/api/v1/rounds/sections/{section_id}/questions',
    {
      params: { path: { section_id: sectionId } },
      body: { question_id: input.questionId, order: input.order ?? 0 },
    }
  );
  const tq = unwrap(res);
  return {
    id: tq.id,
    questionId: tq.question_id,
    text: tq.text,
    order: tq.order,
  };
}

export async function removeQuestionFromSection(
  templateQuestionId: string
): Promise<void> {
  const res = await api.DELETE(
    '/api/v1/rounds/template-questions/{template_question_id}',
    { params: { path: { template_question_id: templateQuestionId } } }
  );
  unwrap(res);
}

export async function listRounds(): Promise<CompletedRound[]> {
  const res = await api.GET('/api/v1/rounds');
  return unwrap(res).map(mapRound);
}

export async function submitRound(input: {
  templateId: string;
  angelId: string;
  residentId: string;
  answers: { questionId: string; answer: boolean | null; issueFlagged: boolean }[];
}): Promise<CompletedRound> {
  const res = await api.POST('/api/v1/rounds', {
    body: {
      template_id: input.templateId,
      angel_id: input.angelId,
      resident_id: input.residentId,
      answers: input.answers.map((a) => ({
        question_id: a.questionId,
        answer: a.answer,
        issue_flagged: a.issueFlagged,
      })),
    },
  });
  return mapRound(unwrap(res));
}

// ── Issues ──────────────────────────────────────────────────────────────────
export async function listIssues(): Promise<Issue[]> {
  const res = await api.GET('/api/v1/issues');
  return unwrap(res).map(mapIssue);
}

export async function resolveIssue(
  issueId: string,
  resolvedBy: string,
  resolutionNotes: string
): Promise<Issue> {
  const res = await api.POST('/api/v1/issues/{issue_id}/resolve', {
    params: { path: { issue_id: issueId } },
    body: { resolved_by: resolvedBy, resolution_notes: resolutionNotes },
  });
  return mapIssue(unwrap(res));
}

export async function reopenIssue(issueId: string): Promise<Issue> {
  const res = await api.POST('/api/v1/issues/{issue_id}/reopen', {
    params: { path: { issue_id: issueId } },
  });
  return mapIssue(unwrap(res));
}

// ── QAA Notes ───────────────────────────────────────────────────────────────
export async function getQaaNotes(): Promise<QaaNotes> {
  const res = await api.GET('/api/v1/qaa-notes');
  return mapQaaNote(unwrap(res));
}

export async function updateQaaNotes(content: string): Promise<QaaNotes> {
  const res = await api.PUT('/api/v1/qaa-notes', { body: { content } });
  return mapQaaNote(unwrap(res));
}

// ── Admin ───────────────────────────────────────────────────────────────────
export async function seedReset(): Promise<void> {
  const res = await api.POST('/api/v1/admin/seed-reset', {});
  unwrap(res);
}
