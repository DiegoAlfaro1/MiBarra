import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addStamp,
  toDashOrders,
  type ServerOrder,
  advanceOrder,
  cancelOrder,
  countSoldOut,
  countUnpaid,
  formatLempiras,
  markPaid,
  redeem,
  toggleSoldOut,
  type DashOrder,
} from './dashboard.ts';

const order = (id: string, status: DashOrder['status'], paid = false): DashOrder => ({
  id,
  name: id,
  pickup: '9:00 a. m.',
  status,
  paid,
  lines: [],
  note: '',
});

test('advanceOrder moves pending → preparing → ready and removes a collected order', () => {
  let orders = [order('a', 'pending'), order('b', 'ready')];
  orders = advanceOrder(orders, 'a');
  assert.equal(orders[0]?.status, 'preparing');
  orders = advanceOrder(orders, 'a');
  assert.equal(orders[0]?.status, 'ready');
  orders = advanceOrder(orders, 'a');
  assert.deepEqual(orders.map((o) => o.id), ['b']);
});

test('advanceOrder ignores unknown ids', () => {
  const orders = [order('a', 'pending')];
  assert.deepEqual(advanceOrder(orders, 'zzz'), orders);
});

test('cancelOrder removes pending/preparing orders but never a ready one', () => {
  const orders = [order('a', 'pending'), order('b', 'preparing'), order('c', 'ready')];
  assert.deepEqual(cancelOrder(orders, 'a').map((o) => o.id), ['b', 'c']);
  assert.deepEqual(cancelOrder(orders, 'b').map((o) => o.id), ['a', 'c']);
  assert.deepEqual(cancelOrder(orders, 'c').map((o) => o.id), ['a', 'b', 'c']);
});

test('markPaid is idempotent and countUnpaid follows it', () => {
  const orders = [order('a', 'pending'), order('b', 'pending', true)];
  assert.equal(countUnpaid(orders), 1);
  const once = markPaid(orders, 'a');
  assert.deepEqual(markPaid(once, 'a'), once);
  assert.equal(countUnpaid(once), 0);
});

test('stamps cap at 8 and only a full card can be redeemed', () => {
  assert.equal(addStamp(6), 7);
  assert.equal(addStamp(8), 8);
  assert.equal(redeem(6), 6);
  assert.equal(redeem(8), 0);
});

test('toggleSoldOut flips availability and countSoldOut counts it', () => {
  let sold: Record<string, boolean> = { moca: true };
  sold = toggleSoldOut(sold, 'latte');
  assert.equal(countSoldOut(sold), 2);
  sold = toggleSoldOut(sold, 'moca');
  assert.equal(countSoldOut(sold), 1);
});

test('formatLempiras groups thousands and rejects bad numbers', () => {
  assert.equal(formatLempiras(2840), 'L 2,840.00');
  assert.equal(formatLempiras(2840, 0), 'L 2,840');
  assert.equal(formatLempiras(60), 'L 60.00');
  assert.throws(() => formatLempiras(Number.NaN), RangeError);
});

{
  const row = (over: Partial<ServerOrder>): ServerOrder => ({
    id: '3f1c0000-0000-4000-8000-000000000000', status: 'pending', pickup_time: null, payment_status: 'pending', note: null,
    created_at: '2026-11-19T09:00:00Z',
    order_items: [{ quantity: 2, chosen_options: [{ name: 'Avena' }, { name: 'Vainilla' }], menu_items: { name: 'Latte' } }],
    ...over,
  });
  test('shows active orders with their lines and code', () => {
    const [o] = toDashOrders([row({})], () => '9:20 a. m.');
    assert.equal(o!.name, 'Pedido 3F1C');
    assert.equal(o!.pickup, 'lo antes posible');
    assert.deepEqual(o!.lines, [{ main: '2 × Latte', opts: 'Avena · Vainilla' }]);
    assert.equal(o!.paid, false);
  });
  test('drops completed and cancelled orders', () => {
    assert.equal(toDashOrders([row({ status: 'completed' }), row({ status: 'cancelled' })], () => '').length, 0);
  });
}
