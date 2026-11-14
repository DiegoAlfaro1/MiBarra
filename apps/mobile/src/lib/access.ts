/** Where "Continuar al pago" goes: checkout when signed in, otherwise the sign-up screen that returns to checkout. */
export type AccessSession = { name: string } | null;

export function checkoutHref(session: AccessSession): '/checkout' | '/login' {
  return session ? '/checkout' : '/login';
}

/** Browsing menus never needs an account; placing an order does. */
export function canCheckout(session: AccessSession): boolean {
  return session !== null;
}

/** Greeting name for the home screen: guests who are only browsing have no name yet. */
export function greetingName(session: AccessSession): string | null {
  const name = session?.name.trim();
  return name ? name : null;
}
