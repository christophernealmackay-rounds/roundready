export type Role = 'admin' | 'angel' | 'charge_nurse' | 'viewer';

export interface Department {
  id: string;
  name: string;
  custom: boolean;
}

export interface NotificationPrefs {
  issues?: boolean;
  reminders?: boolean;
  summaries?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string;
  active: boolean;
  notificationPrefs: NotificationPrefs;
}

export interface Angel {
  id: string;
  userId: string;
  name: string;
  departmentId: string;
  department: string;
  absent: boolean;
  absentSince?: string;
}

export interface Resident {
  id: string;
  name: string;
  room: string;
  bed: string;
  angelId: string | null;
  // Non-null while the resident's permanent angel is absent. Points at the
  // permanent owner; angelId during this period is the temporary cover (or
  // null if uncovered).
  originalAngelId: string | null;
  status: 'active' | 'discharged' | 'hospital';
  pccId?: string;
}

export interface QapiItem {
  id: string;
  qapiId: string;
  title: string;
  rootCause: string;
  systemicChange: string;
  monitoringType: 'rounds' | 'completion' | 'cadence';
  monitoringDetail: string;
  responsible: string;
  startDate: string;
  expectedCompletion: string;
  order: number;
}

export interface Qapi {
  id: string;
  title: string;
  issuesIdentified: string;
  dateIdentified: string;
  // null when the QAPI has not been archived yet. Required on the server
  // before status can transition to 'archived'; cleared on restore.
  actualCompletion: string | null;
  status: 'active' | 'archived';
  items: QapiItem[];
}

export interface QaaNotes {
  content: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  text: string;
  section: string;
  issueOn: 'yes' | 'no' | 'either';
  notifyDepartmentId: string;
  inRepository: boolean;
}

export interface TemplateQuestion {
  /** Primary key of the template_questions row (the link). Optional only
   *  for newly-built sections that haven't been persisted yet. */
  id?: string;
  questionId: string;
  text: string;
  issueOn: 'yes' | 'no' | 'either';
  notifyDepartmentId: string;
  order: number;
}

export interface TemplateSection {
  id: string;
  title: string;
  qapiId?: string;
  qapiItemId?: string;
  questions: TemplateQuestion[];
}

export interface RoundTemplate {
  id: string;
  name: string;
  type: 'angel' | 'rapid';
  active: boolean;
  startDate: string;
  endDate?: string;
  archivedAt?: string;
  sections: TemplateSection[];
}

export interface RoundAnswer {
  questionId: string;
  // Null when the angel skipped the question (rare, but the API contract
  // allows it). UI code that needs a boolean should coerce explicitly.
  answer: boolean | null;
  issueFlagged: boolean;
}

export interface CompletedRound {
  id: string;
  templateId: string;
  angelId: string;
  residentId: string;
  completedAt: string;
  answers: RoundAnswer[];
}

export interface IssueNotification {
  id: string;
  issueId: string;
  notifiedUserId: string;
  notifiedUserName?: string;
  notifiedAt: string;
  channel: string;
}

export interface Issue {
  id: string;
  roundId?: string;
  questionId?: string;
  residentId: string;
  residentName: string;
  room: string;
  bed: string;
  angelId: string;
  angelName: string;
  questionText: string;
  departmentId: string;
  department: string;
  status: 'open' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolvedByName?: string;
  resolutionNotes?: string;
  notifications?: IssueNotification[];
}

export type ResidentGroupType = 'wing' | 'cart' | 'custom';

export interface ResidentGroup {
  id: string;
  name: string;
  type: ResidentGroupType;
  facilityId?: string;
  memberIds: string[];
}
