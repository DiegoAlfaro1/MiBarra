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
