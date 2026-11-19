// Pure validation (no Deno APIs) so it can be unit-tested with `node --test`.

export type PaymentMethod = 'counter' | 'card';
export const PAYMENT_METHODS: readonly PaymentMethod[] = ['counter', 'card'];

export interface ValidOrderInput {
  shopId: string;
  items: { productId: string; quantity: number; optionIds?: string[] }[];
  idempotencyKey: string;
  /** Optional note for the shop, trimmed; null when empty. */
  note: string | null;
  /** ISO timestamp of the chosen pickup slot; null means prepare as soon as possible. */
  pickupTime: string | null;
  /** How the customer will pay; chosen once, when the order is placed. */
  paymentMethod: PaymentMethod;
}

export type ValidationResult = { ok: true; value: ValidOrderInput } | { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_ITEMS = 50;
export const MAX_QUANTITY = 99;
export const MAX_OPTIONS = 20;
export const MAX_NOTE = 280;

const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

export function validateOrderInput(body: unknown): ValidationResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Invalid request.' };
  }
  const { shopId, items, idempotencyKey, note, pickupTime, paymentMethod } = body as Record<string, unknown>;

  if (!isUuid(shopId)) return { ok: false, error: 'Please choose a shop.' };
  if (!isUuid(idempotencyKey)) return { ok: false, error: 'Missing order reference. Please try again.' };
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: 'Your order is empty.' };
  if (items.length > MAX_ITEMS) return { ok: false, error: 'Too many items in one order.' };

  const parsed: ValidOrderInput['items'] = [];
  for (const item of items) {
    const { productId, quantity, optionIds } = (item ?? {}) as Record<string, unknown>;
    if (!isUuid(productId)) return { ok: false, error: 'One of the items is not a valid product.' };
    if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > MAX_QUANTITY) {
      return { ok: false, error: `Quantity must be between 1 and ${MAX_QUANTITY}.` };
    }
    if (optionIds === undefined) {
      parsed.push({ productId, quantity: quantity as number });
      continue;
    }
    if (!Array.isArray(optionIds) || optionIds.length > MAX_OPTIONS || !optionIds.every(isUuid)) {
      return { ok: false, error: 'One of the selected options is not valid.' };
    }
    parsed.push({ productId, quantity: quantity as number, optionIds: optionIds as string[] });
  }

  if (note !== undefined && note !== null && typeof note !== 'string') return { ok: false, error: 'Invalid note.' };
  const trimmed = typeof note === 'string' ? note.trim() : '';
  if (trimmed.length > MAX_NOTE) return { ok: false, error: `The note can have at most ${MAX_NOTE} characters.` };

  let pickup: string | null = null;
  if (pickupTime !== undefined && pickupTime !== null) {
    if (typeof pickupTime !== 'string' || Number.isNaN(Date.parse(pickupTime))) {
      return { ok: false, error: 'Invalid pickup time.' };
    }
    pickup = new Date(pickupTime).toISOString();
  }

  // Missing means pay at the counter (older clients); anything else must be a known method.
  const method = paymentMethod ?? 'counter';
  if (!PAYMENT_METHODS.includes(method as PaymentMethod)) {
    return { ok: false, error: 'Choose how you want to pay.' };
  }

  return {
    ok: true,
    value: { shopId, items: parsed, idempotencyKey, note: trimmed || null, pickupTime: pickup, paymentMethod: method as PaymentMethod },
  };
}
