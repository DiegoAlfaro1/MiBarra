import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PAST_ORDERS, SHOPS } from '../data/mock.ts';
import { pastOrderRow, stampCards } from './account.ts';

describe('stampCards', () => {
  const cards = stampCards(SHOPS, 'lempa');
  it('highlights the home shop and counts missing stamps', () => {
    assert.equal(cards[0]!.tone, 'accent');
    assert.equal(cards[0]!.count, '6/8');
    assert.equal(cards[0]!.percent, 75);
    assert.equal(cards[0]!.note, '2 pedidos más para una bebida gratis');
  });
  it('shows the reward on complete cards', () => {
    assert.equal(cards[2]!.tone, 'reward');
    assert.equal(cards[2]!.percent, 100);
    assert.match(cards[2]!.note, /Recompensa lista/);
  });
  it('uses singular copy for one stamp left and clamps bad data', () => {
    const [c] = stampCards([{ ...SHOPS[0]!, stamps: 7, stampGoal: 8 }], 'x');
    assert.equal(c!.note, '1 pedido más para una bebida gratis');
    const [over] = stampCards([{ ...SHOPS[0]!, stamps: 99, stampGoal: 8 }], 'x');
    assert.equal(over!.count, '8/8');
    const [zero] = stampCards([{ ...SHOPS[0]!, stamps: -3, stampGoal: 0 }], 'x');
    assert.equal(zero!.percent, 0);
  });
});

describe('pastOrderRow', () => {
  it('lets completed orders be reordered and earns a stamp', () => {
    const r = pastOrderRow(PAST_ORDERS[0]!);
    assert.equal(r.action, 'reorder');
    assert.equal(r.status, 'Recogido · +1 sello');
  });
  it('shows detail only for cancelled orders', () => {
    const r = pastOrderRow(PAST_ORDERS[2]!);
    assert.equal(r.action, 'detail');
    assert.equal(r.tone, 'danger');
  });
});
