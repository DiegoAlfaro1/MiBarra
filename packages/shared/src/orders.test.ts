import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isUuid, placeOrder, PlaceOrderError } from './orders.ts';

const KEY = '3f1c2a9e-8b7d-4c6e-9f10-112233445566';
const input = { shopId: '00000000-0000-4000-8000-000000000001', items: [{ productId: 'p', quantity: 1 }] };

function fakeClient(result: { data: unknown; error: unknown }) {
  const calls: { name: string; body: unknown }[] = [];
  const client = {
    functions: {
      invoke: async (name: string, opts: { body: unknown }) => {
        calls.push({ name, body: opts.body });
        return result;
      },
    },
  };
  // The fake only implements what placeOrder uses.
  return { client: client as unknown as Parameters<typeof placeOrder>[0], calls };
}

test('isUuid', () => {
  assert.equal(isUuid(KEY), true);
  assert.equal(isUuid('nope'), false);
  assert.equal(isUuid(undefined), false);
});

test('sends the idempotency key with the order and returns the order', async () => {
  const order = { id: 'o1' };
  const { client, calls } = fakeClient({ data: { order }, error: null });
  assert.deepEqual(await placeOrder(client, input, KEY), order);
  assert.deepEqual(calls, [{ name: 'place-order', body: { ...input, idempotencyKey: KEY } }]);
});

test('retries reuse the same key', async () => {
  const { client, calls } = fakeClient({ data: { order: { id: 'o1' } }, error: null });
  await placeOrder(client, input, KEY);
  await placeOrder(client, input, KEY);
  assert.equal((calls[0]?.body as { idempotencyKey: string }).idempotencyKey, KEY);
  assert.equal((calls[1]?.body as { idempotencyKey: string }).idempotencyKey, KEY);
});

test('rejects an invalid idempotency key without calling the server', async () => {
  const { client, calls } = fakeClient({ data: null, error: null });
  await assert.rejects(placeOrder(client, input, 'bad'), PlaceOrderError);
  assert.equal(calls.length, 0);
});

test('surfaces the server error message', async () => {
  const context = new Response(JSON.stringify({ error: 'That product is no longer available.' }), { status: 400 });
  const { client } = fakeClient({ data: null, error: { context } });
  await assert.rejects(placeOrder(client, input, KEY), { message: 'That product is no longer available.' });
});

test('falls back to a generic message', async () => {
  const { client } = fakeClient({ data: null, error: new Error('network') });
  await assert.rejects(placeOrder(client, input, KEY), { message: /Check your connection/ });
});
