import {
  getFacilitySettings,
  getQaaNotes,
  listAngels,
  listDepartments,
  listIssues,
  listQaaMeetingNotes,
  listQapis,
  listQuestions,
  listResidentGroups,
  listResidents,
  listRoundTemplates,
  listRounds,
  listUsers,
} from './domain';

export async function loadAll() {
  const [
    departments,
    users,
    angels,
    residents,
    residentGroups,
    qapis,
    questions,
    templates,
    rounds,
    issues,
    qaaNotes,
    meetingNotes,
    facilitySettings,
  ] = await Promise.all([
    listDepartments(),
    listUsers(),
    listAngels(),
    listResidents(),
    listResidentGroups(),
    listQapis(),
    listQuestions(),
    listRoundTemplates(),
    listRounds(),
    listIssues(),
    getQaaNotes(),
    listQaaMeetingNotes(),
    getFacilitySettings(),
  ]);

  return {
    departments,
    users,
    angels,
    residents,
    residentGroups,
    qapis,
    questions,
    templates,
    rounds,
    issues,
    qaaNotes,
    meetingNotes,
    facilitySettings,
  };
}

export type BootstrapData = Awaited<ReturnType<typeof loadAll>>;
