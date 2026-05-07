import { create } from 'zustand';
import type { User, Department } from '../types';
import {
  createDepartment,
  createUser,
  deleteDepartment,
  listDepartments,
  listUsers,
  updateUser as apiUpdateUser,
} from '../api';

interface UsersState {
  users: User[];
  departments: Department[];
  hydrate: (data: { users: User[]; departments: Department[] }) => void;
  refresh: () => Promise<void>;
  addUser: (u: Omit<User, 'id'>) => Promise<User>;
  updateUser: (u: User) => Promise<User>;
  deactivateUser: (id: string) => Promise<User>;
  addDepartment: (name: string) => Promise<Department>;
  removeDepartment: (id: string) => Promise<void>;
}

export const useUsersStore = create<UsersState>((set) => ({
  users: [],
  departments: [],

  hydrate: ({ users, departments }) => set({ users, departments }),

  refresh: async () => {
    const [users, departments] = await Promise.all([
      listUsers(),
      listDepartments(),
    ]);
    set({ users, departments });
  },

  addUser: async (u) => {
    const created = await createUser({
      name: u.name,
      email: u.email,
      role: u.role,
      departmentId: u.departmentId,
    });
    set((s) => ({ users: [...s.users, created] }));
    return created;
  },

  updateUser: async (u) => {
    const updated = await apiUpdateUser(u.id, {
      name: u.name,
      email: u.email,
      role: u.role,
      departmentId: u.departmentId,
      active: u.active,
    });
    set((s) => ({ users: s.users.map((x) => (x.id === u.id ? updated : x)) }));
    return updated;
  },

  deactivateUser: async (id) => {
    const updated = await apiUpdateUser(id, { active: false });
    set((s) => ({ users: s.users.map((x) => (x.id === id ? updated : x)) }));
    return updated;
  },

  addDepartment: async (name) => {
    const created = await createDepartment(name);
    set((s) => ({ departments: [...s.departments, created] }));
    return created;
  },

  removeDepartment: async (id) => {
    await deleteDepartment(id);
    set((s) => ({ departments: s.departments.filter((d) => d.id !== id) }));
  },
}));
