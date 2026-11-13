import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  cartCount,
  cartReducer,
  cartTotalCents,
  clampQty,
  defaultSelection,
  describeSelection,
  emptyCart,
  unitPriceCents,
  type CartLine,
} from './cart.ts';
import { formatExtra, formatLempiras } from './format.ts';

const line = (over: Partial<CartLine> = {}): CartLine => ({
  id: 'a',
  shopId: 'lempa',
  productId: 'capuchino',
  name: 'Capuchino',
  optionsLabel: '',
  selection: defaultSelection(),
  unitCents: 8000,
  quantity: 1,
  ...over,
});

describe('unitPriceCents', () => {
  it('adds size, milk and extras to the base price', () => {
    assert.equal(unitPriceCents(7000, { sizeId: 'medium', milkId: 'whole', extraIds: ['vanilla'] }), 9000);
    assert.equal(unitPriceCents(7000, { sizeId: 'large', milkId: 'oat', extraIds: ['shot', 'caramel'] }), 13000);
  });
  it('returns the base price for items without options', () => {
    assert.equal(unitPriceCents(3500, null), 3500);
  });
  it('rejects unknown options', () => {
    assert.throws(() => unitPriceCents(7000, { sizeId: 'xl', milkId: 'whole', extraIds: [] }), RangeError);
  });
});

describe('describeSelection', () => {
  it('matches the design copy', () => {
    assert.equal(
      describeSelection({ sizeId: 'medium', milkId: 'whole', extraIds: ['vanilla'] }),
      'Mediano 16 oz · Leche entera · Sirope de vainilla',
    );
  });
});

describe('cartReducer', () => {
  it('merges identical lines and caps the quantity at 9', () => {
    let state = cartReducer(emptyCart, { type: 'add', line: line({ quantity: 5 }) });
    state = cartReducer(state, { type: 'add', line: line({ id: 'b', quantity: 8 }) });
    assert.equal(state.lines.length, 1);
    assert.equal(state.lines[0]!.quantity, 9);
  });
  it('keeps lines with different options separate', () => {
    let state = cartReducer(emptyCart, { type: 'add', line: line() });
    state = cartReducer(state, {
      type: 'add',
      line: line({ id: 'b', selection: { ...defaultSelection(), milkId: 'oat' } }),
    });
    assert.equal(state.lines.length, 2);
  });
  it('starts a new cart when ordering from another shop', () => {
    let state = cartReducer(emptyCart, { type: 'add', line: line() });
    state = cartReducer(state, { type: 'add', line: line({ id: 'z', shopId: 'molienda' }) });
    assert.equal(state.shopId, 'molienda');
    assert.equal(state.lines.length, 1);
  });
  it('clamps quantities and computes totals', () => {
    let state = cartReducer(emptyCart, { type: 'add', line: line({ unitCents: 9000 }) });
    state = cartReducer(state, { type: 'add', line: line({ id: 'c', productId: 'croissant', selection: null, unitCents: 4500 }) });
    assert.equal(cartTotalCents(state.lines), 13500);
    state = cartReducer(state, { type: 'setQty', id: 'a', quantity: 0 });
    assert.equal(state.lines[0]!.quantity, 1);
    state = cartReducer(state, { type: 'setQty', id: 'a', quantity: 50 });
    assert.equal(cartCount(state.lines), 10);
  });
  it('empties the cart when the last line is removed', () => {
    const state = cartReducer(cartReducer(emptyCart, { type: 'add', line: line() }), { type: 'remove', id: 'a' });
    assert.deepEqual(state, emptyCart);
  });
  it('replaces a line when editing, keeping its id', () => {
    let state = cartReducer(emptyCart, { type: 'add', line: line() });
    state = cartReducer(state, { type: 'replace', id: 'a', line: line({ id: 'x', unitCents: 9500, quantity: 2 }) });
    assert.equal(state.lines[0]!.id, 'a');
    assert.equal(state.lines[0]!.unitCents, 9500);
  });
});

describe('clampQty / formatting', () => {
  it('handles odd input', () => {
    assert.equal(clampQty(Number.NaN), 1);
    assert.equal(clampQty(2.9), 2);
  });
  it('formats lempiras like the designs', () => {
    assert.equal(formatLempiras(13500), 'L 135.00');
    assert.equal(formatExtra(1500), '+L 15');
    assert.throws(() => formatLempiras(1.5), RangeError);
  });
});
