// Pure validation (no Deno APIs) so it can be unit-tested with `node --test`.

export interface ValidOrderInput {
  shopId: string;
  items: { productId: string; quantity: number }[];
  idempotencyKey: string;
}

export type ValidationResult = { ok: true; value: ValidOrderInput } | { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_ITEMS = 50;
export const MAX_QUANTITY = 99;

const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

export function validateOrderInput(body: unknown): ValidationResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Invalid request.' };
  }
  const { shopId, items, idempotencyKey } = body as Record<string, unknown>;

  if (!isUuid(shopId)) return { ok: false, error: 'Please choose a shop.' };
  if (!isUuid(idempotencyKey)) return { ok: false, error: 'Missing order reference. Please try again.' };
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: 'Your order is empty.' };
  if (items.length > MAX_ITEMS) return { ok: false, error: 'Too many items in one order.' };

  const parsed: ValidOrderInput['items'] = [];
  for (const item of items) {
    const { productId, quantity } = (item ?? {}) as Record<string, unknown>;
    if (!isUuid(productId)) return { ok: false, error: 'One of the items is not a valid product.' };
    if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > MAX_QUANTITY) {
      return { ok: false, error: `Quantity must be between 1 and ${MAX_QUANTITY}.` };
    }
    parsed.push({ productId, quantity: quantity as number });
  }

  return { ok: true, value: { shopId, items: parsed, idempotencyKey } };
}
