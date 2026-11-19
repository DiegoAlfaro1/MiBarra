import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { HistoryOrder } from '@mibarra/shared';

import { cartReducer, emptyCart } from './cart.ts';
import { historyView, reorderCartLines, reorderNotice } from './orderHistory.ts';

const order = {
  id: 'o1', shop_id: 'shop1', status: 'completed', total_cents: 15000, note: ' sin hielo ', created_at: '2026-11-18T14:42:00Z',
  shops: { name: 'Café Lempa' },
  order_items: [
    { id: 'i1', order_id: 'o1', item_id: 'latte', quantity: 2, unit_price_cents: 7500, menu_items: { name: 'Latte' },
      chosen_options: [{ id: 'g', name: 'Grande', price_change_cents: 1000 }, { id: 'v', name: 'Vainilla', price_change_cents: 500 }] },
    { id: 'i2', order_id: 'o1', item_id: 'pan', quantity: 1, unit_price_cents: 0, menu_items: null, chosen_options: [] },
  ],
} as unknown as HistoryOrder;

describe('historyView', () => {
  const v = historyView(order);
  it('shows what was ordered, the personalization and the price paid', () => {
    assert.equal(v.shop, 'Café Lempa');
    assert.equal(v.lines[0]!.name, 'Latte');
    assert.equal(v.lines[0]!.personalization, 'Grande · Vainilla');
    assert.equal(v.lines[0]!.lineCents, 15000);
    assert.equal(v.lines[1]!.personalization, '');
    assert.equal(v.totalCents, 15000);
    assert.equal(v.note, 'sin hielo');
  });
  it('labels the status', () => {
    assert.equal(v.status, 'Recogido');
    assert.equal(historyView({ ...order, status: 'cancelled' }).tone, 'danger');
  });
});

describe('reorder', () => {
  const plan = { lines: [{ productId: 'latte', name: 'Latte', optionIds: ['g', 'v'], optionsLabel: 'Grande · Vainilla', quantity: 2, unitCents: 7500 }], skipped: [] };
  it('adding the same reorder twice does not duplicate lines', () => {
    const lines = reorderCartLines('o1', 'shop1', plan);
    let cart = emptyCart;
    for (const line of lines) cart = cartReducer(cart, { type: 'add', line });
    assert.equal(cart.lines.length, 1);
    assert.equal(cart.shopId, 'shop1');
    assert.deepEqual(cart.lines[0]!.optionIds, ['g', 'v']);
    assert.equal(cart.lines[0]!.quantity, 2);
  });
  it('explains what could not be added', () => {
    assert.equal(reorderNotice(plan), null);
    assert.match(reorderNotice({ lines: plan.lines, skipped: ['Moca'] })!, /no pudimos incluir: Moca/);
    assert.match(reorderNotice({ lines: [], skipped: ['Moca'] })!, /Ya no podemos repetir/);
  });
});
