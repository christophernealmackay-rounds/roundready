/**
 * Hardcoded current user for the demo. Returns the seeded admin/DON
 * (Mary Smith) once the users store has hydrated. Phase 8 placeholder
 * until real auth lands post-MVP.
 */
import { useUsersStore } from '@/lib/store';
import type { User } from '@/lib/types';

export function useCurrentUser(): User | null {
  const users = useUsersStore((s) => s.users);
  return users.find((u) => u.role === 'admin') ?? null;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
