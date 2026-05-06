import type {
  Department, User, Angel, Resident, Qapi, Question,
  RoundTemplate, CompletedRound, Issue,
} from '../types';

export const departments: Department[] = [
  { id: 'dept-1',  name: 'Nursing',         custom: false },
  { id: 'dept-2',  name: 'Dietary',          custom: false },
  { id: 'dept-3',  name: 'Activities',       custom: false },
  { id: 'dept-4',  name: 'MDS',              custom: false },
  { id: 'dept-5',  name: 'Therapy',          custom: false },
  { id: 'dept-6',  name: 'Social Services',  custom: false },
  { id: 'dept-7',  name: 'Housekeeping',     custom: false },
  { id: 'dept-8',  name: 'Maintenance',      custom: false },
  { id: 'dept-9',  name: 'Admissions',       custom: false },
  { id: 'dept-10', name: 'Medical Records',  custom: false },
  { id: 'dept-11', name: 'Administration',   custom: false },
];

export const users: User[] = [
  { id: 'user-1', name: 'Christopher Mackay', email: 'chris@sunrisegardens.com',   role: 'admin',        departmentId: 'dept-11', active: true },
  { id: 'user-2', name: 'Maria Rodriguez',    email: 'mrodriguez@sunrise.com',     role: 'angel',        departmentId: 'dept-1',  active: true },
  { id: 'user-3', name: 'James Thompson',     email: 'jthompson@sunrise.com',      role: 'angel',        departmentId: 'dept-2',  active: true },
  { id: 'user-4', name: 'Sandra Kim',         email: 'skim@sunrise.com',           role: 'angel',        departmentId: 'dept-3',  active: true },
  { id: 'user-5', name: 'David Martinez',     email: 'dmartinez@sunrise.com',      role: 'angel',        departmentId: 'dept-5',  active: true },
  { id: 'user-6', name: 'Linda Patterson',    email: 'lpatterson@sunrise.com',     role: 'angel',        departmentId: 'dept-7',  active: true },
  { id: 'user-7', name: 'Patricia Nguyen',    email: 'pnguyen@sunrise.com',        role: 'charge_nurse', departmentId: 'dept-1',  active: true },
  { id: 'user-8', name: 'Robert Chen',        email: 'rchen@sunrise.com',          role: 'angel',        departmentId: 'dept-6',  active: true },
];

export const angels: Angel[] = [
  { id: 'angel-1', userId: 'user-2', name: 'Maria Rodriguez', departmentId: 'dept-1', department: 'Nursing',       absent: false },
  { id: 'angel-2', userId: 'user-3', name: 'James Thompson',  departmentId: 'dept-2', department: 'Dietary',        absent: false },
  { id: 'angel-3', userId: 'user-4', name: 'Sandra Kim',      departmentId: 'dept-3', department: 'Activities',     absent: true,  absentSince: '2026-05-06T00:00:00.000Z', originalResidentIds: ['res-5','res-6','res-19','res-20'] },
  { id: 'angel-4', userId: 'user-5', name: 'David Martinez',  departmentId: 'dept-5', department: 'Therapy',        absent: false },
  { id: 'angel-5', userId: 'user-6', name: 'Linda Patterson', departmentId: 'dept-7', department: 'Housekeeping',   absent: false },
];

export const residents: Resident[] = [
  { id: 'res-1',  name: 'Eleanor Voss',     room: '101', bed: 'A', angelId: 'angel-1', status: 'active' },
  { id: 'res-2',  name: 'Harold Simmons',   room: '101', bed: 'B', angelId: 'angel-1', status: 'active' },
  { id: 'res-3',  name: 'Dorothy Crane',    room: '102', bed: 'A', angelId: 'angel-2', status: 'active' },
  { id: 'res-4',  name: 'Robert Finley',    room: '102', bed: 'B', angelId: 'angel-2', status: 'active' },
  { id: 'res-5',  name: 'Agnes Whitfield',  room: '103', bed: 'A', angelId: null,      status: 'active' },
  { id: 'res-6',  name: 'Frank Deluca',     room: '103', bed: 'B', angelId: null,      status: 'active' },
  { id: 'res-7',  name: 'Mildred Oakes',    room: '104', bed: 'A', angelId: 'angel-4', status: 'active' },
  { id: 'res-8',  name: 'George Stanton',   room: '104', bed: 'B', angelId: 'angel-4', status: 'active' },
  { id: 'res-9',  name: 'Beatrice Holt',    room: '105', bed: 'A', angelId: 'angel-5', status: 'active' },
  { id: 'res-10', name: 'Walter Pruett',    room: '105', bed: 'B', angelId: 'angel-5', status: 'active' },
  { id: 'res-11', name: 'Ruth Morrison',    room: '106', bed: 'A', angelId: 'angel-1', status: 'active' },
  { id: 'res-12', name: 'Chester Dunbar',   room: '106', bed: 'B', angelId: 'angel-1', status: 'active' },
  { id: 'res-13', name: 'Harold Bingham',   room: '107', bed: 'A', angelId: 'angel-2', status: 'active' },
  { id: 'res-14', name: 'Dorothy Ashford',  room: '107', bed: 'B', angelId: 'angel-2', status: 'active' },
  { id: 'res-15', name: 'Alice Gentry',     room: '108', bed: 'A', angelId: 'angel-4', status: 'active' },
  { id: 'res-16', name: 'Vernon Mitchell',  room: '108', bed: 'B', angelId: 'angel-4', status: 'active' },
  { id: 'res-17', name: 'Edna Carpenter',   room: '109', bed: 'A', angelId: 'angel-5', status: 'active' },
  { id: 'res-18', name: 'Eugene Watkins',   room: '109', bed: 'B', angelId: 'angel-5', status: 'active' },
  { id: 'res-19', name: 'Gladys Hutchins',  room: '110', bed: 'A', angelId: null,      status: 'active' },
  { id: 'res-20', name: 'Lucille Farmer',   room: '110', bed: 'B', angelId: null,      status: 'active' },
];

export const qapis: Qapi[] = [
  {
    id: 'qapi-1', title: 'Fall Prevention Program', status: 'active',
    issuesIdentified: 'Increasing fall rate in Wing B — 4 falls reported in Q4 2025, up from 1 in Q3.',
    dateIdentified: '2025-11-15',
    items: [
      { id: 'qitem-1', qapiId: 'qapi-1', order: 1, title: 'Environmental Safety Assessment', responsible: 'Maria Rodriguez', startDate: '2025-12-01', expectedCompletion: '2026-06-30', monitoringType: 'rounds', monitoringDetail: 'Nursing Angel — per round completion', rootCause: 'Environmental hazards not consistently identified during nursing rounds.', systemicChange: 'Revised angel rounding checklist to include 4 mandatory environmental safety checkpoints. All Nursing angels trained on updated protocol.' },
      { id: 'qitem-2', qapiId: 'qapi-1', order: 2, title: 'High-Risk Resident Identification', responsible: 'Patricia Nguyen', startDate: '2025-12-15', expectedCompletion: '2026-03-31', monitoringType: 'cadence', monitoringDetail: 'MDS Coordinator — monthly audit', rootCause: 'High-risk residents not consistently flagged or reassessed after incidents.', systemicChange: 'Implemented mandatory fall risk reassessment within 24 hours of any fall event. MDS coordinator to review care plans monthly.' },
    ],
  },
  {
    id: 'qapi-2', title: 'Pressure Injury Prevention', status: 'active',
    issuesIdentified: 'Two Stage II pressure injuries identified in January 2026 during routine skin assessment.',
    dateIdentified: '2026-01-10',
    items: [
      { id: 'qitem-3', qapiId: 'qapi-2', order: 1, title: 'Skin Integrity Rounds', responsible: 'Maria Rodriguez', startDate: '2026-01-20', expectedCompletion: '2026-07-31', monitoringType: 'rounds', monitoringDetail: 'Nursing Angel — per round completion', rootCause: 'Repositioning intervals not consistently followed during night shift.', systemicChange: 'Added skin integrity checkpoints to night shift angel rounds. Repositioning documentation required every 2 hours.' },
    ],
  },
  {
    id: 'qapi-3', title: 'Hydration & Nutrition Monitoring', status: 'active',
    issuesIdentified: 'MDS data shows 3 residents with unintended weight loss >5% over 30 days in Feb 2026.',
    dateIdentified: '2026-02-20',
    items: [
      { id: 'qitem-4', qapiId: 'qapi-3', order: 1, title: 'Meal & Fluid Intake Documentation', responsible: 'James Thompson', startDate: '2026-03-01', expectedCompletion: '2026-08-31', monitoringType: 'rounds', monitoringDetail: 'Dietary Angel — per meal round', rootCause: 'Meal and fluid intake documentation incomplete — estimated at 60% completion rate.', systemicChange: 'Dietary angel to document fluid intake and meal completion percentage at each meal. Charge nurse notified if resident misses >2 consecutive meals.' },
      { id: 'qitem-5', qapiId: 'qapi-3', order: 2, title: 'IDT Weight Review', responsible: 'Patricia Nguyen', startDate: '2026-03-01', expectedCompletion: '2026-09-01', monitoringType: 'cadence', monitoringDetail: 'IDT — monthly review', rootCause: 'Weight trends not reviewed with interdisciplinary team until quarterly MDS.', systemicChange: 'Implement monthly weight review in IDT meeting with Dietary, Nursing, and Medical Records.' },
    ],
  },
  {
    id: 'qapi-4', title: 'Infection Control — Hand Hygiene', status: 'archived',
    issuesIdentified: 'Hand hygiene compliance audit in Sep 2025 showed 72% compliance rate, below target of 90%.',
    dateIdentified: '2025-09-10',
    items: [
      { id: 'qitem-6', qapiId: 'qapi-4', order: 1, title: 'Hand Hygiene Monitoring', responsible: 'Patricia Nguyen', startDate: '2025-09-15', expectedCompletion: '2025-12-31', monitoringType: 'rounds', monitoringDetail: 'Nursing Angel — weekly compliance check', rootCause: 'Inconsistent hand hygiene practices observed across departments.', systemicChange: 'Hand hygiene compliance checkpoints added to rounding template. Monthly compliance audits by Infection Control Nurse.' },
    ],
  },
];

export const questions: Question[] = [
  { id: 'q-1',  text: 'Is the call light within reach?',                             section: 'Environmental Safety', issueOn: 'no', notifyDepartmentId: 'dept-1', inRepository: true },
  { id: 'q-2',  text: 'Are bed rails in proper position per care plan?',             section: 'Environmental Safety', issueOn: 'no', notifyDepartmentId: 'dept-1', inRepository: true },
  { id: 'q-3',  text: 'Is the floor free of fall hazards?',                         section: 'Environmental Safety', issueOn: 'no', notifyDepartmentId: 'dept-7', inRepository: true },
  { id: 'q-4',  text: 'Are non-slip footwear and mobility aids accessible?',         section: 'Environmental Safety', issueOn: 'no', notifyDepartmentId: 'dept-1', inRepository: true },
  { id: 'q-5',  text: 'Is fall risk assessment completed and current?',              section: 'High-Risk Residents',  issueOn: 'no', notifyDepartmentId: 'dept-4', inRepository: true },
  { id: 'q-6',  text: 'Are fall precaution interventions in place?',                section: 'High-Risk Residents',  issueOn: 'no', notifyDepartmentId: 'dept-1', inRepository: true },
  { id: 'q-7',  text: 'Has skin assessment been completed this shift?',              section: 'Skin Integrity',       issueOn: 'no', notifyDepartmentId: 'dept-1', inRepository: true },
  { id: 'q-8',  text: 'Are repositioning intervals being followed?',                section: 'Skin Integrity',       issueOn: 'no', notifyDepartmentId: 'dept-1', inRepository: true },
  { id: 'q-9',  text: 'Is pressure-relieving equipment in place?',                  section: 'Skin Integrity',       issueOn: 'no', notifyDepartmentId: 'dept-5', inRepository: true },
  { id: 'q-10', text: 'Has meal completion been documented?',                       section: 'Nutrition',            issueOn: 'no', notifyDepartmentId: 'dept-2', inRepository: true },
  { id: 'q-11', text: 'Has fluid intake been documented this shift?',               section: 'Nutrition',            issueOn: 'no', notifyDepartmentId: 'dept-2', inRepository: true },
  { id: 'q-12', text: "Is the resident's room temperature comfortable?",             section: 'Environment',          issueOn: 'no', notifyDepartmentId: 'dept-8', inRepository: true },
  { id: 'q-13', text: 'Has the resident received scheduled medications?',            section: 'Clinical',             issueOn: 'no', notifyDepartmentId: 'dept-1', inRepository: true },
  { id: 'q-14', text: 'Is the resident free from signs of pain or distress?',       section: 'Clinical',             issueOn: 'no', notifyDepartmentId: 'dept-1', inRepository: true },
  { id: 'q-15', text: 'Has the resident been offered activities today?',             section: 'Engagement',           issueOn: 'no', notifyDepartmentId: 'dept-3', inRepository: true },
  { id: 'q-16', text: 'Is meal assistance being provided per care plan?',           section: 'Nutrition',            issueOn: 'no', notifyDepartmentId: 'dept-2', inRepository: true },
  { id: 'q-17', text: "Is the resident's dignity being maintained during care?",     section: 'Quality of Life',      issueOn: 'no', notifyDepartmentId: 'dept-6', inRepository: true },
  { id: 'q-18', text: 'Is the resident free from signs of dehydration?',            section: 'Clinical',             issueOn: 'no', notifyDepartmentId: 'dept-1', inRepository: true },
  { id: 'q-19', text: 'Has the call schedule been communicated to the resident?',   section: 'Communication',        issueOn: 'no', notifyDepartmentId: 'dept-1', inRepository: true },
  { id: 'q-20', text: 'Is the resident participating in their plan of care?',       section: 'Quality of Life',      issueOn: 'no', notifyDepartmentId: 'dept-6', inRepository: true },
];

export const roundTemplates: RoundTemplate[] = [
  {
    id: 'tmpl-1', name: 'May 2026 Angel Rounds', type: 'angel', active: true, startDate: '2026-05-01',
    sections: [
      { id: 'sec-1', title: 'Environmental Safety Assessment', qapiId: 'qapi-1', qapiItemId: 'qitem-1',
        questions: [
          { questionId: 'q-1', text: 'Is the call light within reach?',                      issueOn: 'no', notifyDepartmentId: 'dept-1', order: 1 },
          { questionId: 'q-2', text: 'Are bed rails in proper position per care plan?',      issueOn: 'no', notifyDepartmentId: 'dept-1', order: 2 },
          { questionId: 'q-3', text: 'Is the floor free of fall hazards?',                   issueOn: 'no', notifyDepartmentId: 'dept-7', order: 3 },
          { questionId: 'q-4', text: 'Are non-slip footwear and mobility aids accessible?',  issueOn: 'no', notifyDepartmentId: 'dept-1', order: 4 },
        ],
      },
      { id: 'sec-2', title: 'High-Risk Resident Identification', qapiId: 'qapi-1', qapiItemId: 'qitem-2',
        questions: [
          { questionId: 'q-5', text: 'Is fall risk assessment completed and current?',       issueOn: 'no', notifyDepartmentId: 'dept-4', order: 1 },
          { questionId: 'q-6', text: 'Are fall precaution interventions in place?',          issueOn: 'no', notifyDepartmentId: 'dept-1', order: 2 },
        ],
      },
      { id: 'sec-3', title: 'Skin Integrity Rounds', qapiId: 'qapi-2', qapiItemId: 'qitem-3',
        questions: [
          { questionId: 'q-7', text: 'Has skin assessment been completed this shift?',       issueOn: 'no', notifyDepartmentId: 'dept-1', order: 1 },
          { questionId: 'q-8', text: 'Are repositioning intervals being followed?',          issueOn: 'no', notifyDepartmentId: 'dept-1', order: 2 },
          { questionId: 'q-9', text: 'Is pressure-relieving equipment in place?',            issueOn: 'no', notifyDepartmentId: 'dept-5', order: 3 },
        ],
      },
      { id: 'sec-4', title: 'Meal & Fluid Intake Documentation', qapiId: 'qapi-3', qapiItemId: 'qitem-4',
        questions: [
          { questionId: 'q-10', text: 'Has meal completion been documented?',                issueOn: 'no', notifyDepartmentId: 'dept-2', order: 1 },
          { questionId: 'q-11', text: 'Has fluid intake been documented this shift?',        issueOn: 'no', notifyDepartmentId: 'dept-2', order: 2 },
        ],
      },
    ],
  },
  {
    id: 'tmpl-arch-1', name: 'April 2026 Angel Rounds', type: 'angel', active: false, startDate: '2026-04-01', archivedAt: '2026-04-30',
    sections: [],
  },
  {
    id: 'tmpl-arch-2', name: 'March 2026 Angel Rounds', type: 'angel', active: false, startDate: '2026-03-01', archivedAt: '2026-03-31',
    sections: [],
  },
];

function mkRound(
  id: string, angelId: string, residentId: string,
  date: string, hour: number, min = 0, flagQ?: string
): CompletedRound {
  const allQIds = ['q-1','q-2','q-3','q-4','q-5','q-6','q-7','q-8','q-9','q-10','q-11'];
  return {
    id, templateId: 'tmpl-1', angelId, residentId,
    completedAt: `${date}T${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}:00.000Z`,
    answers: allQIds.map(qId => ({
      questionId: qId,
      answer: qId === flagQ ? false : true,
      issueFlagged: qId === flagQ,
    })),
  };
}

// 4 active angels × 4 residents each = 16 expected rounds/day
// Today = May 6, 2026

export const completedRounds: CompletedRound[] = [
  // Today May 6 — 12/16 completed (75%)
  mkRound('r-t1',  'angel-1', 'res-1',  '2026-05-06', 7,  5),
  mkRound('r-t2',  'angel-1', 'res-2',  '2026-05-06', 8, 12),
  mkRound('r-t3',  'angel-1', 'res-11', '2026-05-06', 9,  3),
  // res-12 not done yet (Maria 3/4)
  mkRound('r-t4',  'angel-2', 'res-3',  '2026-05-06', 7, 22),
  mkRound('r-t5',  'angel-2', 'res-4',  '2026-05-06', 9, 18, 'q-1'), // flags issue
  // res-13, res-14 not done yet (James 2/4)
  mkRound('r-t6',  'angel-4', 'res-7',  '2026-05-06', 7, 45),
  mkRound('r-t7',  'angel-4', 'res-8',  '2026-05-06', 8, 30),
  mkRound('r-t8',  'angel-4', 'res-15', '2026-05-06', 9, 15),
  mkRound('r-t9',  'angel-4', 'res-16', '2026-05-06', 10, 0),
  // David 4/4 ✓
  mkRound('r-t10', 'angel-5', 'res-9',  '2026-05-06', 8,  5),
  mkRound('r-t11', 'angel-5', 'res-10', '2026-05-06', 9, 44),
  mkRound('r-t12', 'angel-5', 'res-17', '2026-05-06', 10, 20, 'q-4'), // flags issue
  // res-18 not done (Linda 3/4)

  // May 5 (Mon) — 15/16 (94%)
  mkRound('r-5a',  'angel-1', 'res-1',  '2026-05-05', 7, 10),
  mkRound('r-5b',  'angel-1', 'res-2',  '2026-05-05', 8,  5),
  mkRound('r-5c',  'angel-1', 'res-11', '2026-05-05', 9, 22),
  mkRound('r-5d',  'angel-1', 'res-12', '2026-05-05', 10, 0),
  mkRound('r-5e',  'angel-2', 'res-3',  '2026-05-05', 7, 30),
  mkRound('r-5f',  'angel-2', 'res-4',  '2026-05-05', 8, 45),
  mkRound('r-5g',  'angel-2', 'res-13', '2026-05-05', 9, 10),
  mkRound('r-5h',  'angel-2', 'res-14', '2026-05-05', 10, 25),
  mkRound('r-5i',  'angel-4', 'res-7',  '2026-05-05', 7, 15),
  mkRound('r-5j',  'angel-4', 'res-8',  '2026-05-05', 8, 35),
  mkRound('r-5k',  'angel-4', 'res-15', '2026-05-05', 9, 50),
  mkRound('r-5l',  'angel-5', 'res-9',  '2026-05-05', 8,  0),
  mkRound('r-5m',  'angel-5', 'res-10', '2026-05-05', 9, 20),
  mkRound('r-5n',  'angel-5', 'res-17', '2026-05-05', 10, 5),
  mkRound('r-5o',  'angel-5', 'res-18', '2026-05-05', 11, 0),
  // res-16 missed (David 3/4)

  // May 1 (Thu) — 13/16 (81%)
  mkRound('r-1a',  'angel-1', 'res-1',  '2026-05-01', 7,  0),
  mkRound('r-1b',  'angel-1', 'res-2',  '2026-05-01', 8, 10),
  mkRound('r-1c',  'angel-1', 'res-11', '2026-05-01', 9,  5),
  mkRound('r-1d',  'angel-2', 'res-3',  '2026-05-01', 7, 15),
  mkRound('r-1e',  'angel-2', 'res-4',  '2026-05-01', 8, 25, 'q-3'), // flags issue
  mkRound('r-1f',  'angel-2', 'res-13', '2026-05-01', 9, 30),
  mkRound('r-1g',  'angel-4', 'res-7',  '2026-05-01', 7, 40),
  mkRound('r-1h',  'angel-4', 'res-8',  '2026-05-01', 8, 50),
  mkRound('r-1i',  'angel-4', 'res-15', '2026-05-01', 9, 55),
  mkRound('r-1j',  'angel-4', 'res-16', '2026-05-01', 10, 10),
  mkRound('r-1k',  'angel-5', 'res-9',  '2026-05-01', 8, 15),
  mkRound('r-1l',  'angel-5', 'res-10', '2026-05-01', 9, 35),
  mkRound('r-1m',  'angel-5', 'res-17', '2026-05-01', 10, 45),

  // Apr 30 (Wed) — 14/16 (88%)
  mkRound('r-30a', 'angel-1', 'res-1',  '2026-04-30', 7,  5),
  mkRound('r-30b', 'angel-1', 'res-2',  '2026-04-30', 8, 20),
  mkRound('r-30c', 'angel-1', 'res-11', '2026-04-30', 9, 10),
  mkRound('r-30d', 'angel-1', 'res-12', '2026-04-30', 10, 0),
  mkRound('r-30e', 'angel-2', 'res-3',  '2026-04-30', 7, 30),
  mkRound('r-30f', 'angel-2', 'res-4',  '2026-04-30', 8, 40),
  mkRound('r-30g', 'angel-4', 'res-7',  '2026-04-30', 7, 50),
  mkRound('r-30h', 'angel-4', 'res-8',  '2026-04-30', 9,  0),
  mkRound('r-30i', 'angel-4', 'res-15', '2026-04-30', 10, 15),
  mkRound('r-30j', 'angel-4', 'res-16', '2026-04-30', 11,  5),
  mkRound('r-30k', 'angel-5', 'res-9',  '2026-04-30', 8, 10),
  mkRound('r-30l', 'angel-5', 'res-10', '2026-04-30', 9, 25),
  mkRound('r-30m', 'angel-5', 'res-17', '2026-04-30', 10, 30),
  mkRound('r-30n', 'angel-5', 'res-18', '2026-04-30', 11, 20),

  // Apr 29 (Tue) — 15/16 (94%)
  mkRound('r-29a', 'angel-1', 'res-1',  '2026-04-29', 7,  0),
  mkRound('r-29b', 'angel-1', 'res-2',  '2026-04-29', 8,  0),
  mkRound('r-29c', 'angel-1', 'res-11', '2026-04-29', 9,  0),
  mkRound('r-29d', 'angel-1', 'res-12', '2026-04-29', 10, 0),
  mkRound('r-29e', 'angel-2', 'res-3',  '2026-04-29', 7, 15),
  mkRound('r-29f', 'angel-2', 'res-4',  '2026-04-29', 8, 15),
  mkRound('r-29g', 'angel-2', 'res-13', '2026-04-29', 9, 15),
  mkRound('r-29h', 'angel-2', 'res-14', '2026-04-29', 10, 15),
  mkRound('r-29i', 'angel-4', 'res-7',  '2026-04-29', 7, 30),
  mkRound('r-29j', 'angel-4', 'res-8',  '2026-04-29', 8, 30),
  mkRound('r-29k', 'angel-4', 'res-15', '2026-04-29', 9, 30),
  mkRound('r-29l', 'angel-4', 'res-16', '2026-04-29', 10, 30),
  mkRound('r-29m', 'angel-5', 'res-9',  '2026-04-29', 8, 45),
  mkRound('r-29n', 'angel-5', 'res-10', '2026-04-29', 9, 45),
  mkRound('r-29o', 'angel-5', 'res-18', '2026-04-29', 10, 45),
  // res-17 missed

  // Apr 28 (Mon) — 14/16 (88%)
  mkRound('r-28a', 'angel-1', 'res-1',  '2026-04-28', 7,  5),
  mkRound('r-28b', 'angel-1', 'res-2',  '2026-04-28', 8,  5),
  mkRound('r-28c', 'angel-1', 'res-11', '2026-04-28', 9,  5),
  mkRound('r-28d', 'angel-1', 'res-12', '2026-04-28', 10, 5),
  mkRound('r-28e', 'angel-2', 'res-3',  '2026-04-28', 7, 20),
  mkRound('r-28f', 'angel-2', 'res-4',  '2026-04-28', 8, 20),
  mkRound('r-28g', 'angel-2', 'res-13', '2026-04-28', 9, 20),
  mkRound('r-28h', 'angel-4', 'res-7',  '2026-04-28', 7, 35),
  mkRound('r-28i', 'angel-4', 'res-8',  '2026-04-28', 8, 35),
  mkRound('r-28j', 'angel-4', 'res-15', '2026-04-28', 9, 35),
  mkRound('r-28k', 'angel-5', 'res-9',  '2026-04-28', 8, 50),
  mkRound('r-28l', 'angel-5', 'res-10', '2026-04-28', 9, 50),
  mkRound('r-28m', 'angel-5', 'res-17', '2026-04-28', 10, 50),
  mkRound('r-28n', 'angel-5', 'res-18', '2026-04-28', 11, 50),

  // Apr 25 (Fri) — 13/16 (81%)
  mkRound('r-25a', 'angel-1', 'res-1',  '2026-04-25', 7, 0),
  mkRound('r-25b', 'angel-1', 'res-2',  '2026-04-25', 8, 0),
  mkRound('r-25c', 'angel-1', 'res-12', '2026-04-25', 9, 0),
  mkRound('r-25d', 'angel-2', 'res-3',  '2026-04-25', 7, 15),
  mkRound('r-25e', 'angel-2', 'res-14', '2026-04-25', 8, 15),
  mkRound('r-25f', 'angel-4', 'res-7',  '2026-04-25', 7, 30),
  mkRound('r-25g', 'angel-4', 'res-8',  '2026-04-25', 8, 30),
  mkRound('r-25h', 'angel-4', 'res-15', '2026-04-25', 9, 30),
  mkRound('r-25i', 'angel-4', 'res-16', '2026-04-25', 10, 30),
  mkRound('r-25j', 'angel-5', 'res-9',  '2026-04-25', 8, 45),
  mkRound('r-25k', 'angel-5', 'res-10', '2026-04-25', 9, 45),
  mkRound('r-25l', 'angel-5', 'res-17', '2026-04-25', 10, 45),
  mkRound('r-25m', 'angel-5', 'res-18', '2026-04-25', 11, 45),

  // Apr 21 (Mon) — 14/16 (88%)
  mkRound('r-21a', 'angel-1', 'res-1',  '2026-04-21', 7,  0),
  mkRound('r-21b', 'angel-1', 'res-2',  '2026-04-21', 8,  0),
  mkRound('r-21c', 'angel-1', 'res-11', '2026-04-21', 9,  0),
  mkRound('r-21d', 'angel-1', 'res-12', '2026-04-21', 10, 0),
  mkRound('r-21e', 'angel-2', 'res-3',  '2026-04-21', 7, 15),
  mkRound('r-21f', 'angel-2', 'res-4',  '2026-04-21', 8, 15),
  mkRound('r-21g', 'angel-2', 'res-13', '2026-04-21', 9, 15),
  mkRound('r-21h', 'angel-2', 'res-14', '2026-04-21', 10, 15),
  mkRound('r-21i', 'angel-4', 'res-7',  '2026-04-21', 7, 30),
  mkRound('r-21j', 'angel-4', 'res-8',  '2026-04-21', 8, 30),
  mkRound('r-21k', 'angel-5', 'res-9',  '2026-04-21', 8, 45),
  mkRound('r-21l', 'angel-5', 'res-10', '2026-04-21', 9, 45),
  mkRound('r-21m', 'angel-5', 'res-17', '2026-04-21', 10, 45),
  mkRound('r-21n', 'angel-5', 'res-18', '2026-04-21', 11, 45),

  // Apr 14 (Mon) — 12/16 (75%)
  mkRound('r-14a', 'angel-1', 'res-1',  '2026-04-14', 7, 0),
  mkRound('r-14b', 'angel-1', 'res-2',  '2026-04-14', 8, 0),
  mkRound('r-14c', 'angel-1', 'res-11', '2026-04-14', 9, 0),
  mkRound('r-14d', 'angel-2', 'res-3',  '2026-04-14', 7, 15),
  mkRound('r-14e', 'angel-2', 'res-4',  '2026-04-14', 8, 15),
  mkRound('r-14f', 'angel-2', 'res-13', '2026-04-14', 9, 15),
  mkRound('r-14g', 'angel-4', 'res-7',  '2026-04-14', 7, 30),
  mkRound('r-14h', 'angel-4', 'res-8',  '2026-04-14', 8, 30),
  mkRound('r-14i', 'angel-4', 'res-15', '2026-04-14', 9, 30),
  mkRound('r-14j', 'angel-5', 'res-9',  '2026-04-14', 8, 45),
  mkRound('r-14k', 'angel-5', 'res-10', '2026-04-14', 9, 45),
  mkRound('r-14l', 'angel-5', 'res-17', '2026-04-14', 10, 45),

  // Apr 7 (Mon) — 12/16 (75%)
  mkRound('r-7a',  'angel-1', 'res-1',  '2026-04-07', 7, 0),
  mkRound('r-7b',  'angel-1', 'res-2',  '2026-04-07', 8, 0),
  mkRound('r-7c',  'angel-2', 'res-3',  '2026-04-07', 7, 15),
  mkRound('r-7d',  'angel-2', 'res-4',  '2026-04-07', 8, 15),
  mkRound('r-7e',  'angel-2', 'res-13', '2026-04-07', 9, 15),
  mkRound('r-7f',  'angel-4', 'res-7',  '2026-04-07', 7, 30),
  mkRound('r-7g',  'angel-4', 'res-8',  '2026-04-07', 8, 30),
  mkRound('r-7h',  'angel-4', 'res-15', '2026-04-07', 9, 30),
  mkRound('r-7i',  'angel-4', 'res-16', '2026-04-07', 10, 30),
  mkRound('r-7j',  'angel-5', 'res-9',  '2026-04-07', 8, 45),
  mkRound('r-7k',  'angel-5', 'res-10', '2026-04-07', 9, 45),
  mkRound('r-7l',  'angel-5', 'res-18', '2026-04-07', 10, 45),
];

export const issues: Issue[] = [
  {
    id: 'issue-1', roundId: 'r-t5', residentId: 'res-4', residentName: 'Robert Finley',
    room: '102', bed: 'B', angelId: 'angel-2', angelName: 'James Thompson',
    questionText: 'Is the call light within reach?', departmentId: 'dept-1', department: 'Nursing',
    status: 'open', createdAt: '2026-05-06T09:18:00.000Z',
  },
  {
    id: 'issue-2', roundId: 'r-t12', residentId: 'res-17', residentName: 'Edna Carpenter',
    room: '109', bed: 'A', angelId: 'angel-5', angelName: 'Linda Patterson',
    questionText: 'Are non-slip footwear and mobility aids accessible?', departmentId: 'dept-1', department: 'Nursing',
    status: 'open', createdAt: '2026-05-06T10:20:00.000Z',
  },
  {
    id: 'issue-3', roundId: 'r-1e', residentId: 'res-4', residentName: 'Robert Finley',
    room: '102', bed: 'B', angelId: 'angel-2', angelName: 'James Thompson',
    questionText: 'Is the floor free of fall hazards?', departmentId: 'dept-7', department: 'Housekeeping',
    status: 'open', createdAt: '2026-05-01T08:25:00.000Z',
  },
  {
    id: 'issue-4', residentId: 'res-1', residentName: 'Eleanor Voss',
    room: '101', bed: 'A', angelId: 'angel-1', angelName: 'Maria Rodriguez',
    questionText: 'Has skin assessment been completed this shift?', departmentId: 'dept-1', department: 'Nursing',
    status: 'resolved', createdAt: '2026-05-04T07:44:00.000Z',
    resolvedAt: '2026-05-04T10:30:00.000Z',
    resolvedBy: 'Patricia Nguyen', resolutionNotes: 'Charge nurse notified immediately. Heel protectors applied per wound care protocol. Wound care team alerted and follow-up scheduled.',
  },
  {
    id: 'issue-5', residentId: 'res-8', residentName: 'George Stanton',
    room: '104', bed: 'B', angelId: 'angel-4', angelName: 'David Martinez',
    questionText: 'Are bed rails in proper position per care plan?', departmentId: 'dept-1', department: 'Nursing',
    status: 'resolved', createdAt: '2026-05-03T14:10:00.000Z',
    resolvedAt: '2026-05-03T15:45:00.000Z',
    resolvedBy: 'Christopher Mackay', resolutionNotes: 'Rails adjusted immediately. CNA re-educated on positioning protocol.',
  },
  {
    id: 'issue-6', residentId: 'res-11', residentName: 'Ruth Morrison',
    room: '106', bed: 'A', angelId: 'angel-1', angelName: 'Maria Rodriguez',
    questionText: 'Has the resident been offered activities today?', departmentId: 'dept-3', department: 'Activities',
    status: 'resolved', createdAt: '2026-05-02T10:30:00.000Z',
    resolvedAt: '2026-05-02T13:00:00.000Z',
    resolvedBy: 'Sandra Kim', resolutionNotes: 'Social worker conducted welfare visit same day. Volunteer visitor program enrollment initiated.',
  },
  {
    id: 'issue-7', residentId: 'res-9', residentName: 'Beatrice Holt',
    room: '105', bed: 'A', angelId: 'angel-5', angelName: 'Linda Patterson',
    questionText: 'Are repositioning intervals being followed?', departmentId: 'dept-1', department: 'Nursing',
    status: 'resolved', createdAt: '2026-05-01T15:55:00.000Z',
    resolvedAt: '2026-05-01T17:30:00.000Z',
    resolvedBy: 'Patricia Nguyen', resolutionNotes: 'Staff re-educated on repositioning protocol. Supervisor notified.',
  },
];

export const qaaNotes = {
  content: `QAA Committee Meeting — April 30, 2026

Attendees: Christopher Mackay (Administrator), Patricia Nguyen (DON), James Thompson (Dietary), Maria Rodriguez (Nursing), Sandra Kim (Activities)

QAPI Items Reviewed:
1. Fall Prevention Program — Completion rate improved to 88% from 76% in Q4 2025. Environmental checklist compliance strong. Angel rounding checklists updated successfully. Continue monitoring through Q2 2026.

2. Pressure Injury Prevention — Two Stage II injuries from Jan 2026 have both resolved. Night shift repositioning compliance improved to 94%. Wound care team to continue weekly skin rounds.

3. Hydration & Nutrition — Dietary documentation compliance at 79% — below target of 90%. James Thompson to implement additional staff training in May. IDT weight review scheduled for May 15.

Action Items:
- James Thompson: Dietary documentation training by May 15
- Patricia Nguyen: Schedule fall risk reassessment for Room 103 residents upon Sandra's return
- Maria Rodriguez: Update environmental safety checklist based on new CMS guidance (F-tag 689)
- Administrator: Submit Q1 2026 QAPI report to state survey agency by May 31

Next Meeting: May 28, 2026 — 2:00 PM`,
  updatedAt: '2026-04-30T14:00:00.000Z',
};
