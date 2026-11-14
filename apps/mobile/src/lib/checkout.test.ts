import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isSlotFull, pickupLabelFor, validateCheckout, validateContact } from './checkout.ts';

const now = new Date(2026, 10, 13);
const asap = { id: 'asap', label: 'Lo antes posible', sub: '~10 min' };
const full = { id: '0940', label: '9:40 a. m.', sub: 'Lleno', full: true };
const base = {
  name: 'Diego',
  phone: '9999 9999',
  slot: asap,
  payment: 'counter' as const,
  card: { number: '', expiry: '', cvv: '' },
};

describe('pickup slots', () => {
  it('labels asap as an estimate and other slots by time', () => {
    assert.equal(pickupLabelFor(asap), 'en ~10 min');
    assert.equal(pickupLabelFor({ id: '0920', label: '9:20 a. m.', sub: '' }), '9:20 a. m.');
  });
  it('detects full slots', () => {
    assert.equal(isSlotFull(full), true);
    assert.equal(isSlotFull(asap), false);
  });
});

describe('validateContact', () => {
  it('accepts a name and 8-digit phone', () => assert.deepEqual(validateContact(base), {}));
  it('rejects blank name and short phone', () => {
    assert.deepEqual(Object.keys(validateContact({ name: ' ', phone: '123' })).sort(), ['name', 'phone']);
  });
});

describe('validateCheckout', () => {
  it('accepts counter payment without card data', () => assert.deepEqual(validateCheckout(base, now), {}));
  it('rejects a full or missing slot', () => {
    assert.ok(validateCheckout({ ...base, slot: full }, now).slot);
    assert.ok(validateCheckout({ ...base, slot: undefined }, now).slot);
  });
  it('validates the card only when paying by card', () => {
    const errors = validateCheckout({ ...base, payment: 'card' }, now);
    assert.deepEqual(Object.keys(errors).sort(), ['cvv', 'expiry', 'number']);
    const ok = { number: '4242 4242 4242 4242', expiry: '12/28', cvv: '123' };
    assert.deepEqual(validateCheckout({ ...base, payment: 'card', card: ok }, now), {});
  });
});
