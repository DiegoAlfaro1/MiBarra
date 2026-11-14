import type { DashboardAccess } from '@mibarra/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from '../lib/supabase.ts';
import { loadDashboardAccess, MESSAGES, signInStaff, type StaffAuthClient } from '../logic/staffAuth.ts';

type AuthStatus = 'loading' | 'signedOut' | 'staff';

interface AuthState {
  status: AuthStatus;
  access: DashboardAccess | null;
  /** Shown on the sign-in form when a restored session is not allowed. */
  notice: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);
const client = supabase as unknown as StaffAuthClient;

/** Restores the Supabase session and only lets staff accounts through. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [access, setAccess] = useState<DashboardAccess | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return active && setStatus('signedOut');
        const found = await loadDashboardAccess(client);
        if (!active) return;
        if (found) {
          setAccess(found);
          setStatus('staff');
        } else {
          await supabase.auth.signOut();
          setNotice(MESSAGES.notStaff);
          setStatus('signedOut');
        }
      } catch {
        if (active) setStatus('signedOut');
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && active) {
        setAccess(null);
        setStatus('signedOut');
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await signInStaff(client, email, password);
    if (!result.ok) return result.message;
    setNotice(null);
    setAccess(result.access);
    setStatus('staff');
    return null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAccess(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo(() => ({ status, access, notice, signIn, signOut }), [status, access, notice, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(Ctx);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
