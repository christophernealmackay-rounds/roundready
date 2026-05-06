import { create } from 'zustand';
import type { User, Department } from '../types';
import { users as seedUsers, departments as seedDepts } from '../seed';

interface UsersState {
  users: User[];
  departments: Department[];
  addUser: (u: Omit<User, 'id'>) => void;
  updateUser: (u: User) => void;
  deactivateUser: (id: string) => void;
  addDepartment: (name: string) => void;
  removeDepartment: (id: string) => void;
}

export const useUsersStore = create<UsersState>((set) => ({
  users: seedUsers,
  departments: seedDepts,

  addUser: (u) => set((s) => ({
    users: [...s.users, { ...u, id: `user-${Date.now()}` }],
  })),

  updateUser: (u) => set((s) => ({
    users: s.users.map((x) => (x.id === u.id ? u : x)),
  })),

  deactivateUser: (id) => set((s) => ({
    users: s.users.map((u) => (u.id === id ? { ...u, active: false } : u)),
  })),

  addDepartment: (name) => set((s) => ({
    departments: [...s.departments, { id: `dept-${Date.now()}`, name, custom: true }],
  })),

  removeDepartment: (id) => set((s) => ({
    departments: s.departments.filter((d) => d.id !== id),
  })),
}));
