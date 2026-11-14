import AsyncStorage from '@react-native-async-storage/async-storage';
import { isStaffAccount } from '@mibarra/shared';
import type { User } from '@supabase/supabase-js';

import {
  authErrorMessage,
  decideOnStart,
  displayName,
  parseSessionMeta,
  SESSION_META_KEY,
  toE164,
  type SessionMeta,
} from './authSession';
import { supabase } from './supabase';

export interface AuthSession {
  name: string;
}

export type AuthOutcome = { ok: true; session: AuthSession } | { ok: false; message: string };

export interface Credentials {
  method: 'phone' | 'email';
  email: string;
  phone: string;
  password: string;
  /** Stay signed in on this device for 30 days. */
  keep: boolean;
}

const STAFF_MESSAGE = 'Esta cuenta es del personal. Usa el panel de la cafetería para entrar.';

function toSession(user: User): AuthSession {
  return { name: displayName(user) };
}

async function rememberLogin(keep: boolean): Promise<void> {
  const meta: SessionMeta = { keep, startedAt: Date.now() };
  await AsyncStorage.setItem(SESSION_META_KEY, JSON.stringify(meta));
}

async function finish(user: User | null | undefined, keep: boolean): Promise<AuthOutcome> {
  if (!user) return { ok: false, message: authErrorMessage(undefined) };
  if (isStaffAccount(user)) {
    await closeSession();
    return { ok: false, message: STAFF_MESSAGE };
  }
  await rememberLogin(keep);
  return { ok: true, session: toSession(user) };
}

const identity = (c: Credentials) =>
  c.method === 'phone' ? { phone: toE164(c.phone) } : { email: c.email.trim().toLowerCase() };

/** Logs in. Each device gets its own Supabase session, so other devices are not affected. */
export async function logIn(c: Credentials): Promise<AuthOutcome> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ ...identity(c), password: c.password });
    if (error) return { ok: false, message: authErrorMessage(error) };
    return await finish(data.user, c.keep);
  } catch (error) {
    return { ok: false, message: authErrorMessage(error as Error) };
  }
}

/** Creates the account (the database trigger adds the customer row) and logs in. */
export async function signUp(c: Credentials & { name: string }): Promise<AuthOutcome> {
  try {
    const { data, error } = await supabase.auth.signUp({
      ...identity(c),
      password: c.password,
      options: { data: { display_name: c.name.trim() } },
    });
    if (error) return { ok: false, message: authErrorMessage(error) };
    // No session means the project requires confirmation first.
    if (!data.session) return { ok: false, message: authErrorMessage({ code: 'email_not_confirmed' }) };
    return await finish(data.user, c.keep);
  } catch (error) {
    return { ok: false, message: authErrorMessage(error as Error) };
  }
}

/** On app start: bring back a kept session, or discard one that was not kept or is older than 30 days. */
export async function restoreSession(): Promise<AuthSession | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const meta = parseSessionMeta(await AsyncStorage.getItem(SESSION_META_KEY));
    if (decideOnStart(!!data.session, meta, Date.now()) === 'restore' && data.session) {
      // Confirms with the server that the session was not revoked (e.g. logged out elsewhere).
      const { data: checked, error } = await supabase.auth.getUser();
      if (!error && checked.user && !isStaffAccount(checked.user)) return toSession(checked.user);
    }
    if (data.session) await closeSession();
    return null;
  } catch {
    // Offline at start: keep the stored session for next time but show the signed-out state.
    return null;
  }
}

/** Revokes this device's session on the server and clears local data. Always clears locally, even offline. */
export async function closeSession(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Network failure: local state is still cleared below.
  }
  await AsyncStorage.removeItem(SESSION_META_KEY).catch(() => undefined);
}
