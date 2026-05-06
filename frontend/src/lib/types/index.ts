export type Role = 'admin' | 'angel' | 'charge_nurse' | 'viewer';

export interface Department {
  id: string;
  name: string;
  custom: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string;
  active: boolean;
}

export interface Angel {
  id: string;
  userId: string;
  name: string;
  departmentId: string;
  department: string;
  absent: boolean;
  absentSince?: string;
  originalResidentIds?: string[];
}

export interface Resident {
  id: string;
  name: string;
  room: string;
  bed: string;
  angelId: string | null;
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
  answer: boolean;
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

export interface Issue {
  id: string;
  roundId?: string;
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
  resolutionNotes?: string;
}
