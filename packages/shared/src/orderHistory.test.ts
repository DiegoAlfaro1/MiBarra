import assert from 'node:assert/strict';
import { test } from 'node:test';

import { listMyOrderHistory, planReorder, type HistoryOrder } from './orderHistory.ts';
import { OrderingError } from './ordering.ts';
import type { ItemOption, MenuItem } from './types.ts';

const item = (id: string, name: string, price: number, available = true): MenuItem =>
  ({ id, shop_id: 's', category_id: 'c', name, description: null, price_cents: price, photo_url: null, available, created_at: '' });
const option = (id: string, item_id: string, kind: 'size' | 'extra', name: string, delta: number, available = true): ItemOption =>
  ({ id, item_id, kind, name, price_change_cents: delta, available, created_at: '' });

const menu = {
  items: [item('latte', 'Latte', 6000), item('moca', 'Moca', 6500, false), item('pan', 'Pan', 3000)],
  options: [
    option('g', 'latte', 'size', 'Grande', 1000),
    option('m', 'latte', 'size', 'Mediano', 0),
    option('van', 'latte', 'extra', 'Vainilla', 500),
  ],
};

const line = (item_id: string, quantity: number, chosen: { id: string; name: string; price_change_cents: number }[], name: string) =>
  ({ id: item_id + quantity, order_id: 'o', item_id, quantity, chosen_options: chosen, unit_price_cents: 0, menu_items: { name } });

test('planReorder rebuilds every line with today\'s price and the same personalization', () => {
  const plan = planReorder(
    {
      order_items: [
        line('latte', 2, [{ id: 'g', name: 'Grande', price_change_cents: 1000 }, { id: 'van', name: 'Vainilla', price_change_cents: 500 }], 'Latte'),
        line('pan', 1, [], 'Pan'),
      ],
    },
    menu,
  );
  assert.deepEqual(plan.skipped, []);
  assert.equal(plan.lines.length, 2);
  assert.deepEqual(plan.lines[0], {
    productId: 'latte', name: 'Latte', optionIds: ['g', 'van'], optionsLabel: 'Grande · Vainilla', quantity: 2, unitCents: 7500,
  });
  assert.equal(plan.lines[1]!.unitCents, 3000);
});

test('planReorder skips sold-out, removed and changed items and names them', () => {
  const plan = planReorder(
    {
      order_items: [
        line('moca', 1, [], 'Moca'),
        line('gone', 1, [], 'Té'),
        line('latte', 1, [{ id: 'old', name: 'Jumbo', price_change_cents: 2000 }], 'Latte'),
        line('pan', 3, [], 'Pan'),
      ],
    },
    menu,
  );
  assert.deepEqual(plan.skipped, ['Moca', 'Té', 'Latte']);
  assert.deepEqual(plan.lines.map((l) => l.productId), ['pan']);
});

test('listMyOrderHistory returns orders with their lines sorted by name', async () => {
  const rows = [{ id: 'o1', order_items: [line('pan', 1, [], 'Pan'), line('latte', 1, [], 'Latte')] }];
  const client = { from: () => ({ select: () => ({ order: () => ({ limit: async () => ({ data: rows, error: null }) }) }) }) };
  const orders = (await listMyOrderHistory(client as never)) as HistoryOrder[];
  assert.deepEqual(orders[0]!.order_items.map((i) => i.menu_items?.name), ['Latte', 'Pan']);
});

test('listMyOrderHistory turns a failed read into a readable error', async () => {
  const client = { from: () => ({ select: () => ({ order: () => ({ limit: async () => ({ data: null, error: { code: 'x' } }) }) }) }) };
  await assert.rejects(listMyOrderHistory(client as never), (e) => e instanceof OrderingError && /cargar tus pedidos/.test(e.message));
});
