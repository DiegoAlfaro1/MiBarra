// Session policy for "stay signed in" (pure logic; storage and Supabase calls live in session.ts).

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
