import type { SupabaseClient } from '@supabase/supabase-js';

import type { Order, PlaceOrderInput } from './types.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export class PlaceOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlaceOrderError';
  }
}

/**
 * Calls the `place-order` edge function.
 *
 * `idempotencyKey` must be generated once per checkout attempt (e.g. with
 * `expo-crypto`'s `randomUUID()`) and reused on every retry of that attempt,
 * so a retried request returns the original order instead of creating a new one.
 */
export async function placeOrder(
  client: Pick<SupabaseClient, 'functions'>,
  input: PlaceOrderInput,
  idempotencyKey: string,
): Promise<Order> {
  if (!isUuid(idempotencyKey)) {
    throw new PlaceOrderError('Internal error: missing order reference. Please try again.');
  }

  const { data, error } = await client.functions.invoke<{ order: Order }>('place-order', {
    body: { ...input, idempotencyKey },
  });

  if (error) {
    const message = await readFunctionErrorMessage(error);
    throw new PlaceOrderError(message);
  }
  if (!data?.order) {
    throw new PlaceOrderError('We could not place your order. Please try again.');
  }
  return data.order;
}

async function readFunctionErrorMessage(error: unknown): Promise<string> {
  // FunctionsHttpError exposes the Response as `context`.
  const context = (error as { context?: unknown }).context;
  if (context && typeof (context as Response).json === 'function') {
    try {
      const body = (await (context as Response).json()) as { error?: unknown };
      if (typeof body.error === 'string' && body.error) return body.error;
    } catch {
      // fall through to the generic message
    }
  }
  return 'We could not place your order. Check your connection and try again.';
}
