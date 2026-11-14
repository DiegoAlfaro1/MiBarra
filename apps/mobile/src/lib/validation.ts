// User-facing validation for the sign-up/login and demo card forms. Copy is Spanish (NFR-09).

export type FieldErrors = Record<string, string>;

export interface AuthInput {
  signup: boolean;
  method: 'phone' | 'email';
  name: string;
  phone: string;
  email: string;
  password: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAuth(input: AuthInput): FieldErrors {
  const errors: FieldErrors = {};
  if (input.signup && input.name.trim().length < 2) {
    errors.name = 'Escribe tu nombre para entregarte el pedido.';
  }
  if (input.method === 'phone') {
    if (input.phone.replace(/\D/g, '').length !== 8) {
      errors.phone = 'Ingresa un celular de 8 dígitos, por ejemplo 9999 9999.';
    }
  } else if (!EMAIL.test(input.email.trim())) {
    errors.email = 'Ingresa un correo válido, por ejemplo tu@correo.com.';
  }
  if (input.password.length < 8) {
    errors.password = 'La contraseña debe tener al menos 8 caracteres.';
  }
  return errors;
}

/** Sign-up also needs the terms box ticked (design: Crear cuenta stays disabled until then). */
export function validateSignup(input: AuthInput & { acceptedTerms: boolean }): FieldErrors {
  const errors = validateAuth({ ...input, signup: true });
  if (!input.acceptedTerms) errors.terms = 'Acepta los Términos y la Política de privacidad para continuar.';
  return errors;
}

/** Guest checkout: a name is required, the phone is optional but must be 8 digits when given. */
export function validateGuest(input: { name: string; phone: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (input.name.trim().length < 2) errors.name = 'Escribe tu nombre para entregarte el pedido.';
  const digits = input.phone.replace(/\D/g, '');
  if (digits.length > 0 && digits.length !== 8) {
    errors.phone = 'Ingresa un celular de 8 dígitos, por ejemplo 9999 9999.';
  }
  return errors;
}

/** Password strength for the sign-up meter: 0 (empty) to 3. Minimum length is 8 (see validateAuth). */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 {
  if (password.length === 0) return 0;
  if (password.length < 8) return 1;
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  return password.length >= 12 && variety >= 3 ? 3 : 2;
}

export interface CardInput {
  number: string;
  expiry: string;
  cvv: string;
}

export function validateCard(input: CardInput, now: Date = new Date()): FieldErrors {
  const errors: FieldErrors = {};
  const digits = input.number.replace(/\s/g, '');
  if (!/^\d{16}$/.test(digits)) errors.number = 'El número de tarjeta debe tener 16 dígitos.';

  const match = /^(\d{2})\/(\d{2})$/.exec(input.expiry.trim());
  if (!match) {
    errors.expiry = 'Usa el formato MM/AA.';
  } else {
    const month = Number(match[1]);
    const year = 2000 + Number(match[2]);
    const expired = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
    if (month < 1 || month > 12) errors.expiry = 'El mes debe estar entre 01 y 12.';
    else if (expired) errors.expiry = 'La tarjeta está vencida.';
  }
  if (!/^\d{3,4}$/.test(input.cvv)) errors.cvv = 'El CVV tiene 3 o 4 dígitos.';
  return errors;
}
