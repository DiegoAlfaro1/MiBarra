// Account creation against Supabase Auth (issue #16). The Supabase client is injected so the
// logic is testable without a network. Copy is Spanish (NFR-09).

/** Honduras country code: the sign-up form shows a fixed +504 prefix before the 8-digit number. */
export const COUNTRY_CODE = '+504';

/** "9999 9999" -> "+50499999999" (E.164), the format Supabase Auth expects. */
export function toE164(localDigits: string, countryCode: string = COUNTRY_CODE): string {
  return `${countryCode}${localDigits.replace(/\D/g, '')}`;
}

export interface SignUpRequest {
  method: 'phone' | 'email';
  name: string;
  phone: string;
  email: string;
  password: string;
}

export type SignUpResult = { ok: true } | { ok: false; message: string };

interface AuthError {
  message: string;
  code?: string;
  status?: number;
}

/** The slice of `supabase.auth` that sign-up needs. */
export interface SignUpClient {
  auth: {
    signUp(
      credentials:
        | { email: string; password: string; options?: { data?: Record<string, unknown> } }
        | { phone: string; password: string; options?: { data?: Record<string, unknown> } },
    ): Promise<{ data: { user: { identities?: unknown[] | null } | null }; error: AuthError | null }>;
  };
}

/** Turns a Supabase Auth error into a clear user-facing message. */
export function signUpErrorMessage(error: AuthError, method: 'phone' | 'email'): string {
  const contact = method === 'phone' ? 'número' : 'correo';
  switch (error.code) {
    case 'user_already_exists':
    case 'email_exists':
    case 'phone_exists':
      return `Ya existe una cuenta con este ${contact}. Inicia sesión.`;
    case 'weak_password':
      return 'La contraseña no cumple los requisitos de seguridad. Usa 8 o más caracteres, una mayúscula y un carácter especial.';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
    case 'over_sms_send_rate_limit':
      return 'Demasiados intentos. Espera un momento e intenta de nuevo.';
    case 'email_address_invalid':
    case 'validation_failed':
      return `Revisa tu ${contact} e intenta de nuevo.`;
    case 'signup_disabled':
      return 'El registro no está disponible por ahora. Intenta más tarde.';
    default:
      return 'No pudimos crear tu cuenta. Revisa tu conexión e intenta de nuevo.';
  }
}

/** Creates the account. The caller validates the input first; this never throws. */
export async function signUpCustomer(client: SignUpClient, req: SignUpRequest): Promise<SignUpResult> {
  const credentials =
    req.method === 'phone'
      ? { phone: toE164(req.phone), password: req.password }
      : { email: req.email.trim().toLowerCase(), password: req.password };
  try {
    const { data, error } = await client.auth.signUp({
      ...credentials,
      options: { data: { display_name: req.name.trim() } },
    });
    if (error) return { ok: false, message: signUpErrorMessage(error, req.method) };
    // With email confirmations on, an existing address returns a user with no identities instead of an error.
    if (data.user?.identities && data.user.identities.length === 0) {
      return { ok: false, message: signUpErrorMessage({ message: '', code: 'user_already_exists' }, req.method) };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: signUpErrorMessage({ message: '' }, req.method) };
  }
}
