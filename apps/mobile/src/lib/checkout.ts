// Pure checkout rules shared by the phone and web checkout screens. Copy is Spanish.
import { validateCard, type CardInput, type FieldErrors } from './validation.ts';

export type PaymentMethod = 'counter' | 'card';

export const PAYMENTS = [
  { id: 'counter', label: 'Pagar en caja', sub: 'Pagas al recoger, en efectivo o tarjeta', demo: false },
  { id: 'card', label: 'Tarjeta en línea', sub: 'Se cobra a la cuenta de la cafetería', demo: true },
] as const;

export interface PickupSlot {
  id: string;
  label: string;
  sub: string;
  full?: boolean;
}

export function isSlotFull(slot: PickupSlot): boolean {
  return slot.full === true;
}

export function pickupLabelFor(slot: PickupSlot): string {
  return slot.id === 'asap' ? 'en ~10 min' : slot.label;
}

export interface ContactInput {
  name: string;
  phone: string;
}

export function validateContact(input: ContactInput): FieldErrors {
  const errors: FieldErrors = {};
  if (input.name.trim().length < 2) errors.name = 'Escribe un nombre para entregarte el pedido.';
  if (input.phone.replace(/\D/g, '').length !== 8) {
    errors.phone = 'Ingresa un celular de 8 dígitos, por ejemplo 9999 9999.';
  }
  return errors;
}

export interface CheckoutInput extends ContactInput {
  slot: PickupSlot | undefined;
  payment: PaymentMethod;
  card: CardInput;
}

/** Returns every problem that blocks the order; an empty object means it can be placed. */
export function validateCheckout(input: CheckoutInput, now?: Date): FieldErrors {
  const errors: FieldErrors = { ...validateContact(input) };
  if (!input.slot || isSlotFull(input.slot)) errors.slot = 'Elige un horario disponible para recoger.';
  if (input.payment === 'card') Object.assign(errors, validateCard(input.card, now));
  return errors;
}
