import { resolveDashboardAccess, type DashboardAccess, type DashboardAccessRow } from '@mibarra/shared';

/** The few Supabase calls the sign-in needs (lets tests use a fake). */
export interface StaffAuthClient {
  auth: {
    signInWithPassword(c: { email: string; password: string }): Promise<{ error: { message: string } | null }>;
    signOut(): Promise<unknown>;
  };
  rpc(fn: 'dashboard_access'): PromiseLike<{ data: DashboardAccessRow[] | null; error: { message: string } | null }>;
}

export type StaffSignIn = { ok: true; access: DashboardAccess } | { ok: false; message: string };

export const MESSAGES = {
  missing: 'Escribe tu correo y tu contraseña.',
  invalid: 'Correo o contraseña incorrectos.',
  notStaff: 'Esta cuenta no tiene acceso al panel. Si eres cliente, usa la app MiBarra.',
  network: 'No pudimos iniciar sesión. Revisa tu conexión e inténtalo de nuevo.',
} as const;

/** Looks up what the current session may open; null if it is not staff. */
export async function loadDashboardAccess(client: StaffAuthClient): Promise<DashboardAccess | null> {
  const { data, error } = await client.rpc('dashboard_access');
  if (error) throw new Error(error.message);
  return resolveDashboardAccess(data);
}

/** Signs in and only keeps the session when the account is staff; customers are signed out again. */
export async function signInStaff(client: StaffAuthClient, email: string, password: string): Promise<StaffSignIn> {
  const cleanEmail = email.trim();
  if (!cleanEmail || !password) return { ok: false, message: MESSAGES.missing };
  try {
    const { error } = await client.auth.signInWithPassword({ email: cleanEmail, password });
    if (error) return { ok: false, message: MESSAGES.invalid };
    const access = await loadDashboardAccess(client);
    if (!access) {
      await client.auth.signOut();
      return { ok: false, message: MESSAGES.notStaff };
    }
    return { ok: true, access };
  } catch {
    await client.auth.signOut().catch(() => undefined);
    return { ok: false, message: MESSAGES.network };
  }
}
