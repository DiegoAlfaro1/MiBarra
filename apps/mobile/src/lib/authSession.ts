// Session policy for "stay signed in" (pure logic; storage and Supabase calls live in AppState).
// Copy is Spanish, consistent with the rest of the app.

/** How long a kept session lasts before the customer has to log in again. */
export const KEEP_SESSION_DAYS = 30;
export const SESSION_META_KEY = 'mibarra.session-meta';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Remembered next to the Supabase session: whether to keep it, and when the login happened. */
export interface SessionMeta {
  keep: boolean;
  /** Epoch milliseconds of the login. */
  startedAt: number;
}

export function parseSessionMeta(raw: string | null): SessionMeta | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const { keep, startedAt } = value as Record<string, unknown>;
    if (typeof keep !== 'boolean' || typeof startedAt !== 'number' || !Number.isFinite(startedAt)) return null;
    return { keep, startedAt };
  } catch {
    return null;
  }
}

export function isKeptSessionExpired(meta: SessionMeta, now: number): boolean {
  const age = now - meta.startedAt;
  // A start time in the future means a wrong clock or tampering: treat it as expired.
  return age < 0 || age >= KEEP_SESSION_DAYS * DAY_MS;
}

/**
 * What to do with a stored Supabase session when the app starts.
 * - no stored session: nothing to do
 * - customer did not ask to stay signed in, or we know nothing about the login: discard it
 * - kept for 30 days or more: discard it
 */
export function decideOnStart(hasSession: boolean, meta: SessionMeta | null, now: number): 'restore' | 'discard' {
  if (!hasSession) return 'discard';
  if (!meta || !meta.keep) return 'discard';
  return isKeptSessionExpired(meta, now) ? 'discard' : 'restore';
}

interface AuthErrorLike {
  code?: string;
  status?: number;
  name?: string;
  message?: string;
}

/** Turns a Supabase auth error into a message for the customer. Never shows raw backend text. */
export function authErrorMessage(error: AuthErrorLike | null | undefined): string {
  const code = error?.code;
  if (code === 'invalid_credentials') return 'El correo, celular o contraseña no son correctos. Intenta de nuevo.';
  if (code === 'email_not_confirmed' || code === 'phone_not_confirmed') {
    return 'Tu cuenta aún no está confirmada. Revisa tu mensaje de confirmación.';
  }
  if (code === 'user_already_exists' || code === 'email_exists' || code === 'phone_exists') {
    return 'Ya existe una cuenta con esos datos. Inicia sesión.';
  }
  if (code === 'weak_password') return 'La contraseña es muy débil. Usa al menos 8 caracteres.';
  if (code === 'over_request_rate_limit' || error?.status === 429) {
    return 'Demasiados intentos. Espera un momento e intenta de nuevo.';
  }
  if (error?.name === 'AuthRetryableFetchError' || error?.status === 0 || error?.status === undefined) {
    return 'No pudimos conectarnos. Revisa tu conexión e intenta de nuevo.';
  }
  return 'No pudimos completar la solicitud. Intenta de nuevo.';
}

/** Honduras numbers are entered as 8 digits; Supabase wants E.164. */
export function toE164(phone: string): string {
  return `+504${phone.replace(/\D/g, '')}`;
}

export interface UserLike {
  email?: string | null;
  phone?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

/** Name shown in the app: the saved name, otherwise the email before the "@", otherwise a neutral fallback. */
export function displayName(user: UserLike): string {
  const saved = user.user_metadata?.display_name;
  if (typeof saved === 'string' && saved.trim()) return saved.trim();
  const local = user.email?.split('@')[0]?.trim();
  return local || 'Cliente';
}
