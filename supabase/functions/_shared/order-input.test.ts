import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MAX_ITEMS, validateOrderInput } from './order-input.ts';

const SHOP = '00000000-0000-4000-8000-000000000001';
const PRODUCT = '00000000-0000-4000-8000-0000000000aa';
const KEY = '3f1c2a9e-8b7d-4c6e-9f10-112233445566';
const valid = { shopId: SHOP, idempotencyKey: KEY, items: [{ productId: PRODUCT, quantity: 2 }] };

function errorOf(body: unknown): string | undefined {
  const result = validateOrderInput(body);
  return result.ok ? undefined : result.error;
}

test('accepts a valid order and strips unknown fields', () => {
  const result = validateOrderInput({ ...valid, items: [{ productId: PRODUCT, quantity: 2, price: 1 }], extra: 1 });
  assert.deepEqual(result, { ok: true, value: { ...valid, note: null, pickupTime: null } });
});

test('rejects non-object bodies', () => {
  assert.equal(errorOf(null), 'Invalid request.');
  assert.equal(errorOf('x'), 'Invalid request.');
});

test('rejects bad shop and idempotency key', () => {
  assert.equal(errorOf({ ...valid, shopId: 'x' }), 'Please choose a shop.');
  assert.match(errorOf({ ...valid, idempotencyKey: undefined }) ?? '', /order reference/);
});

test('rejects empty or oversized orders', () => {
  assert.equal(errorOf({ ...valid, items: [] }), 'Your order is empty.');
  const many = Array.from({ length: MAX_ITEMS + 1 }, () => ({ productId: PRODUCT, quantity: 1 }));
  assert.equal(errorOf({ ...valid, items: many }), 'Too many items in one order.');
});

test('rejects invalid items', () => {
  assert.match(errorOf({ ...valid, items: [null] }) ?? '', /not a valid product/);
  assert.match(errorOf({ ...valid, items: [{ productId: PRODUCT, quantity: 0 }] }) ?? '', /between 1 and 99/);
  assert.match(errorOf({ ...valid, items: [{ productId: PRODUCT, quantity: 1.5 }] }) ?? '', /between 1 and 99/);
  assert.match(errorOf({ ...valid, items: [{ productId: PRODUCT, quantity: 100 }] }) ?? '', /between 1 and 99/);
});

test('passes valid option ids through and rejects malformed ones', () => {
  const OPTION = '00000000-0000-4000-8000-0000000000bb';
  const withOptions = { ...valid, items: [{ productId: PRODUCT, quantity: 1, optionIds: [OPTION] }] };
  assert.deepEqual(validateOrderInput(withOptions), { ok: true, value: { ...withOptions, note: null, pickupTime: null } });
  assert.match(errorOf({ ...valid, items: [{ productId: PRODUCT, quantity: 1, optionIds: ['x'] }] }) ?? '', /option/);
  assert.match(errorOf({ ...valid, items: [{ productId: PRODUCT, quantity: 1, optionIds: 'x' }] }) ?? '', /option/);
});

test('trims the note and rejects long or non-text notes', () => {
  const result = validateOrderInput({ ...valid, note: '  sin tapa  ' });
  assert.equal(result.ok && result.value.note, 'sin tapa');
  const blank = validateOrderInput({ ...valid, note: '   ' });
  assert.equal(blank.ok && blank.value.note, null);
  assert.match(errorOf({ ...valid, note: 'x'.repeat(281) }) ?? '', /at most 280/);
  assert.equal(errorOf({ ...valid, note: 5 }), 'Invalid note.');
});

test('pickup time is optional and must be a valid date', () => {
  const asap = validateOrderInput({ ...valid, pickupTime: null });
  assert.equal(asap.ok && asap.value.pickupTime, null);
  const slot = validateOrderInput({ ...valid, pickupTime: '2026-11-18T15:20:00Z' });
  assert.equal(slot.ok && slot.value.pickupTime, '2026-11-18T15:20:00.000Z');
  assert.equal(validateOrderInput({ ...valid, pickupTime: 'mañana' }).ok, false);
  assert.equal(validateOrderInput({ ...valid, pickupTime: 12 }).ok, false);
});
