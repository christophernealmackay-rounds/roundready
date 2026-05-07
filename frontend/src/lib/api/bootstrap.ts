import {
  getQaaNotes,
  listAngels,
  listDepartments,
  listIssues,
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
  };
}

export type BootstrapData = Awaited<ReturnType<typeof loadAll>>;
