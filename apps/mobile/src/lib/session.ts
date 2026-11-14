import AsyncStorage from '@react-native-async-storage/async-storage';
import { isStaffAccount } from '@mibarra/shared';

import { sessionFromUser, type AppSession } from './access';
import { decideOnStart, parseSessionMeta, SESSION_META_KEY, type SessionMeta } from './authSession';
import { supabase } from './supabase';

// "Stay signed in" (#20): stores the customer's choice next to the Supabase session and applies it on app start.

/** Call after a successful sign-in with the customer's "stay signed in" choice. Never throws. */
export async function rememberLogin(keep: boolean): Promise<void> {
  const meta: SessionMeta = { keep, startedAt: Date.now() };
  await AsyncStorage.setItem(SESSION_META_KEY, JSON.stringify(meta)).catch(() => undefined);
}

/** On app start: bring back a kept session, or discard one that was not kept or is older than 30 days. */
export async function restoreSession(): Promise<AppSession | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const meta = parseSessionMeta(await AsyncStorage.getItem(SESSION_META_KEY));
    if (decideOnStart(!!data.session, meta, Date.now()) === 'restore' && data.session) {
      // Confirms with the server that the session was not revoked (e.g. logged out elsewhere).
      const { data: checked, error } = await supabase.auth.getUser();
      if (!error && checked.user && !isStaffAccount(checked.user)) return sessionFromUser(checked.user);
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
