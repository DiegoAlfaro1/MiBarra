import { KEEP_UNTIL_KEY, authErrorMessage, keepUntil, shouldRestoreSession, toCredentials, type CredentialInput } from './sessionPolicy.ts';
import { keepStorage, supabase } from './supabase.ts';

export interface AuthSession {
  name: string;
}

interface SessionUser {
  user_metadata?: Record<string, unknown>;
}

function displayName(user: SessionUser, fallback?: string): string {
  const meta = user.user_metadata?.name;
  return (typeof meta === 'string' && meta.trim()) || fallback?.trim() || 'Cliente';
}

/**
 * Sign up or log in. `keep` = the user asked to stay logged in on this device (30 days).
 * Throws an Error whose message is safe to show the user.
 */
export async function authenticate(
  input: CredentialInput & { signup: boolean; name: string; keep: boolean },
  now: number = Date.now(),
): Promise<AuthSession> {
  const credentials = toCredentials(input);
  const result = input.signup
    ? await supabase.auth.signUp({ ...credentials, options: { data: { name: input.name.trim() } } })
    : await supabase.auth.signInWithPassword(credentials);
  if (result.error || !result.data.user || !result.data.session) {
    throw new Error(authErrorMessage(result.error?.message, input.signup));
  }
  // Each device/browser gets its own Supabase session, so logging in here never signs out other devices.
  if (input.keep) await keepStorage.setItem(KEEP_UNTIL_KEY, String(keepUntil(now)));
  else await keepStorage.removeItem(KEEP_UNTIL_KEY);
  return { name: displayName(result.data.user, input.name) };
}

/** Restore a kept session on app start. Sessions that were not kept, or are older than 30 days, are closed. */
export async function restoreSession(now: number = Date.now()): Promise<AuthSession | null> {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return null;
    if (!shouldRestoreSession(await keepStorage.getItem(KEEP_UNTIL_KEY), now)) {
      await closeSession();
      return null;
    }
    return { name: displayName(data.session.user) };
  } catch {
    return null;
  }
}

/** Log out this device: revokes its refresh token server-side so it stops working, then clears local state. */
export async function closeSession(): Promise<void> {
  await keepStorage.removeItem(KEEP_UNTIL_KEY);
  await supabase.auth.signOut({ scope: 'local' });
}
