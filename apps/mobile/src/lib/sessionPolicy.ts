// Pure rules for "stay logged in" sessions (no Supabase / storage imports so they can be unit-tested).

/** How long a "keep me signed in" login stays active before the user has to log in again. */
export const KEEP_SESSION_DAYS = 30;
/** Storage key holding the epoch-ms deadline of a kept session. Absent = session must not outlive the app. */
export const KEEP_UNTIL_KEY = 'mibarra.keepSessionUntil';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Deadline (epoch ms) for a session kept from `now`. */
export function keepUntil(now: number): number {
  return now + KEEP_SESSION_DAYS * DAY_MS;
}

/**
 * Decide on app start whether a stored session may be restored.
 * Restore only when the user chose to stay logged in and the 30 days have not passed.
 */
export function shouldRestoreSession(storedKeepUntil: string | null | undefined, now: number): boolean {
  if (!storedKeepUntil) return false;
  const deadline = Number(storedKeepUntil);
  return Number.isFinite(deadline) && deadline > now;
}

export interface CredentialInput {
  method: 'phone' | 'email';
  phone: string;
  email: string;
  password: string;
}

export type Credentials = { email: string; password: string } | { phone: string; password: string };

/** Map the form fields to Supabase credentials. Phones are Honduran (+504), 8 digits (see validateAuth). */
export function toCredentials(input: CredentialInput): Credentials {
  if (input.method === 'phone') {
    return { phone: `+504${input.phone.replace(/\D/g, '')}`, password: input.password };
  }
  return { email: input.email.trim().toLowerCase(), password: input.password };
}

/** Turn a Supabase auth error into clear Spanish copy. Never leaks raw backend messages. */
export function authErrorMessage(message: string | undefined, signup: boolean): string {
  const m = (message ?? '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'El correo, celular o contraseña no coinciden. Revísalos e inténtalo de nuevo.';
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'Ya existe una cuenta con esos datos. Inicia sesión.';
  }
  if (m.includes('network') || m.includes('fetch')) return 'No pudimos conectarnos. Revisa tu internet e inténtalo de nuevo.';
  return signup ? 'No pudimos crear tu cuenta. Inténtalo de nuevo.' : 'No pudimos iniciar sesión. Inténtalo de nuevo.';
}
