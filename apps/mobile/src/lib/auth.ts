import { sessionFromUser, type AppSession } from './access.ts';

// Sign-up and sign-in against Supabase Auth. The client is passed in so the logic can be tested without a network.

export interface AuthClient {
  auth: {
    signUp(credentials: Record<string, unknown>): Promise<{ data: { user: unknown; session: unknown }; error: { message: string; code?: string } | null }>;
    signInWithPassword(credentials: Record<string, unknown>): Promise<{ data: { user: unknown }; error: { message: string; code?: string } | null }>;
  };
}

export interface Credentials {
  method: 'phone' | 'email';
  phone: string;
  email: string;
  password: string;
}

/** Honduran mobile number (8 digits as typed) to E.164, e.g. "9999 9999" -> "+50499999999". */
export function toE164(phone: string): string {
  return `+504${phone.replace(/\D/g, '')}`;
}

function identity(c: Credentials): { email: string } | { phone: string } {
  return c.method === 'email' ? { email: c.email.trim().toLowerCase() } : { phone: toE164(c.phone) };
}

/** Maps Supabase auth errors to clear Spanish copy. */
export function authErrorMessage(error: { message: string; code?: string }): string {
  const text = `${error.code ?? ''} ${error.message}`.toLowerCase();
  if (text.includes('already') || text.includes('exists')) return 'Ya existe una cuenta con esos datos. Inicia sesión.';
  if (text.includes('invalid login') || text.includes('invalid_credentials')) return 'Revisa tus datos e intenta de nuevo.';
  if (text.includes('rate') || text.includes('too many')) return 'Demasiados intentos. Espera un momento e intenta de nuevo.';
  if (text.includes('fetch') || text.includes('network')) return 'No pudimos conectarnos. Revisa tu internet e intenta de nuevo.';
  return 'No pudimos completar la solicitud. Intenta de nuevo.';
}

export type AuthOutcome = { ok: true; session: AppSession } | { ok: false; message: string };

async function guard(run: () => Promise<AuthOutcome>): Promise<AuthOutcome> {
  try {
    return await run();
  } catch (e) {
    return { ok: false, message: authErrorMessage({ message: e instanceof Error ? e.message : String(e) }) };
  }
}

export function signUp(client: AuthClient, name: string, c: Credentials): Promise<AuthOutcome> {
  return guard(async () => {
    const { data, error } = await client.auth.signUp({
      ...identity(c),
      password: c.password,
      options: { data: { display_name: name.trim() } },
    });
    if (error) return { ok: false, message: authErrorMessage(error) };
    // No session means the project requires confirming the account first.
    if (!data.session) return { ok: false, message: 'Te enviamos un código para confirmar tu cuenta. Confírmala e inicia sesión.' };
    return { ok: true, session: sessionFromUser(data.user as Parameters<typeof sessionFromUser>[0]) ?? { name: name.trim() } };
  });
}

export function signIn(client: AuthClient, c: Credentials): Promise<AuthOutcome> {
  return guard(async () => {
    const { data, error } = await client.auth.signInWithPassword({ ...identity(c), password: c.password });
    if (error) return { ok: false, message: authErrorMessage(error) };
    return { ok: true, session: sessionFromUser(data.user as Parameters<typeof sessionFromUser>[0]) ?? { name: 'Cliente' } };
  });
}
