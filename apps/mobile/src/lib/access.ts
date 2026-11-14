// Who may do what in the customer app: browsing is open to everyone, checkout needs an account.

export interface AppSession {
  name: string;
  /** True for the "continuar como invitado" session (no account). */
  guest?: boolean;
}

export const SIGNUP_FOR_CHECKOUT_ROUTE = '/login';
export const CHECKOUT_ROUTE = '/checkout';

/** Where "Continuar al pago" goes: checkout for customers, the sign-up screen for visitors. */
export function checkoutRoute(session: AppSession | null): typeof CHECKOUT_ROUTE | typeof SIGNUP_FOR_CHECKOUT_ROUTE {
  return session ? CHECKOUT_ROUTE : SIGNUP_FOR_CHECKOUT_ROUTE;
}

/** Name shown in greetings: the customer's name, or nothing for a visitor. */
export function greetingName(session: AppSession | null): string | null {
  return session?.name.trim() || null;
}

interface UserLike {
  email?: string | null;
  phone?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

/** Builds the app session from a Supabase user: display name, else the email prefix, else the phone. */
export function sessionFromUser(user: UserLike | null | undefined): AppSession | null {
  if (!user) return null;
  const meta = user.user_metadata?.display_name;
  const name = typeof meta === 'string' && meta.trim() ? meta.trim() : user.email?.split('@')[0] || user.phone || 'Cliente';
  return { name };
}
