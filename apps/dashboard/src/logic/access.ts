// Who may open the dashboard (issue #21). The database still enforces every read and write;
// this only decides which screen to show after sign-in.

import { isStaffAccount, STAFF_ROLES, type StaffRole } from '@mibarra/shared';

export type DashboardRole = StaffRole | 'platform_admin';

export interface Membership {
  role: string;
  active: boolean;
}

export type DashboardAccess = { allowed: true; role: DashboardRole } | { allowed: false };

export const NO_ACCESS_MESSAGE = 'Esta cuenta no tiene acceso al panel. Usa una cuenta de la cafetería.';

const isStaffRole = (role: string): role is StaffRole => (STAFF_ROLES as readonly string[]).includes(role);

/**
 * Platform admins get in. Everyone else needs a staff login (customers never have one)
 * and an active owner, manager or barista membership.
 */
export function resolveDashboardAccess(input: {
  user: { app_metadata?: Record<string, unknown> | null } | null | undefined;
  memberships: Membership[];
  isPlatformAdmin: boolean;
}): DashboardAccess {
  if (!input.user) return { allowed: false };
  if (input.isPlatformAdmin) return { allowed: true, role: 'platform_admin' };
  if (!isStaffAccount(input.user)) return { allowed: false };
  const roles = input.memberships.filter((m) => m.active).map((m) => m.role).filter(isStaffRole);
  const best = STAFF_ROLES.find((role) => roles.includes(role));
  return best ? { allowed: true, role: best } : { allowed: false };
}

/** Returns a message for the first problem with the sign-in form, or null when it is fine. */
export function validateSignIn(email: string, password: string): string | null {
  if (!email.trim()) return 'Escribe tu correo.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Escribe un correo válido.';
  if (!password) return 'Escribe tu contraseña.';
  return null;
}
