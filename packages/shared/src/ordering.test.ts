import assert from 'node:assert/strict';
import { test } from 'node:test';

import { advanceOrder, canCustomerCancel, cancelOrder, isActiveOrder, nextOrderStatus, OrderingError } from './ordering.ts';

test('status flow moves one step at a time and stops at the end', () => {
  assert.equal(nextOrderStatus('pending'), 'preparing');
  assert.equal(nextOrderStatus('preparing'), 'ready');
  assert.equal(nextOrderStatus('ready'), 'completed');
  assert.equal(nextOrderStatus('completed'), null);
  assert.equal(nextOrderStatus('cancelled'), null);
});

test('active and cancellable orders', () => {
  assert.equal(isActiveOrder({ status: 'ready' }), true);
  assert.equal(isActiveOrder({ status: 'cancelled' }), false);
  assert.equal(canCustomerCancel({ status: 'pending' }), true);
  assert.equal(canCustomerCancel({ status: 'preparing' }), false);
});

test('advanceOrder rejects orders that cannot advance', async () => {
  await assert.rejects(advanceOrder({} as never, 'id', 'completed'), OrderingError);
});

test('cancelOrder turns permission errors into a readable message', async () => {
  const client = { rpc: async () => ({ data: null, error: { code: '42501' } }) };
  await assert.rejects(cancelOrder(client as never, 'id'), /permiso/);
});
