// Pure checkout rules shared by the phone and web checkout screens. Copy is Spanish.
import type { PickupSlotOption } from '@mibarra/shared';
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
  /** ISO start of a real slot; absent for "as soon as possible" and sample slots. */
  start?: string;
}

export function isSlotFull(slot: PickupSlot): boolean {
  return slot.full === true;
}

export const ASAP_SLOT: PickupSlot = { id: 'asap', label: 'Lo antes posible', sub: '~10 min' };

/** Shown when a specific time is chosen: the order is held, not started, until that slot. */
export const SCHEDULED_NOTICE =
  'Si eliges una hora, la cafetería no empezará a preparar tu pedido hasta ese horario.';

/** "Lo antes posible" first, then the shop's slots (full ones stay visible but disabled). */
export function slotChoices(shopSlots: readonly PickupSlotOption[], label: (startIso: string) => string): PickupSlot[] {
  return [
    ASAP_SLOT,
    ...shopSlots.map((s) => ({ id: s.start, start: s.start, label: label(s.start), sub: s.full ? 'Lleno' : '', full: s.full })),
  ];
}

/** ISO time to send to `place-order`; undefined means prepare right away. */
export function pickupTimeFor(slot: PickupSlot | undefined): string | undefined {
  return slot?.start;
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

export interface OrderLine {
  productId: string;
  quantity: number;
  optionIds?: string[];
}

/** Cart lines as `place-order` items. Prices are not sent: the server prices every line itself. */
export function orderItemsFromCart(lines: readonly OrderLine[]): OrderLine[] {
  return lines.map((l) => (l.optionIds?.length ? { productId: l.productId, quantity: l.quantity, optionIds: [...l.optionIds] } : { productId: l.productId, quantity: l.quantity }));
}

// Messages written by `place_order` / `place-order` for users, shown in Spanish.
const ORDER_ERRORS: [RegExp, string][] = [
  [/pickup time is full/i, 'Ese horario se llenó. Elige otro o pide lo antes posible.'],
  [/closed at that pickup time/i, 'La cafetería estará cerrada a esa hora. Elige otro horario.'],
  [/pickup time must be/i, 'Ese horario ya pasó. Elige otro o pide lo antes posible.'],
  [/shop is closed/i, 'La cafetería está cerrada en este momento. Tu carrito sigue guardado.'],
  [/products are not available|products are sold out/i,'Uno de los productos ya no está disponible. Revisa tu carrito.'],
  [/options are not available|Invalid options/i, 'Una de las opciones ya no está disponible. Revisa tu carrito.'],
  [/only one size/i, 'Elige un solo tamaño para cada producto de tu carrito.'],
  [/size for each item/i, 'Elige un tamaño para cada producto de tu carrito.'],
  [/sign in/i, 'Inicia sesión para hacer tu pedido.'],
  [/note/i, 'La nota es demasiado larga.'],
];

export const ORDER_RETRY_MESSAGE = 'No pudimos enviar tu pedido. Revisa tu conexión e inténtalo de nuevo; no se hará un pedido doble.';

export function orderErrorMessage(message: string | undefined): string {
  const found = ORDER_ERRORS.find(([pattern]) => message && pattern.test(message));
  return found ? found[1] : ORDER_RETRY_MESSAGE;
}

/** Short code the customer says at the counter, e.g. `#3F1C`. */
export function orderCode(orderId: string): string {
  return `#${orderId.replace(/-/g, '').slice(0, 4).toUpperCase()}`;
}
