import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ASAP_SLOT, pickupTimeFor, slotChoices, ORDER_RETRY_MESSAGE, orderCode, orderErrorMessage, orderItemsFromCart, pickupLabelFor, validateCheckout, validateContact } from './checkout.ts';

const now = new Date(2026, 10, 13);
const asap = { id: 'asap', label: 'Lo antes posible', sub: '~10 min' };
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
});

describe('validateContact', () => {
  it('accepts a name and 8-digit phone', () => assert.deepEqual(validateContact(base), {}));
  it('rejects blank name and short phone', () => {
    assert.deepEqual(Object.keys(validateContact({ name: ' ', phone: '123' })).sort(), ['name', 'phone']);
  });
});

describe('validateCheckout', () => {
  it('accepts counter payment without card data', () => assert.deepEqual(validateCheckout(base, now), {}));
  it('rejects a missing slot', () => {
    assert.ok(validateCheckout({ ...base, slot: undefined }, now).slot);
  });
  it('validates the card only when paying by card', () => {
    const errors = validateCheckout({ ...base, payment: 'card' }, now);
    assert.deepEqual(Object.keys(errors).sort(), ['cvv', 'expiry', 'number']);
    const ok = { number: '4242 4242 4242 4242', expiry: '12/28', cvv: '123' };
    assert.deepEqual(validateCheckout({ ...base, payment: 'card', card: ok }, now), {});
  });
});

describe('placing a real order', () => {
  it('sends product ids, quantities and option ids only', () => {
    assert.deepEqual(
      orderItemsFromCart([
        { productId: 'p1', quantity: 2, optionIds: ['o1'] },
        { productId: 'p2', quantity: 1, optionIds: [] },
        { productId: 'p3', quantity: 1 },
      ]),
      [
        { productId: 'p1', quantity: 2, optionIds: ['o1'] },
        { productId: 'p2', quantity: 1 },
        { productId: 'p3', quantity: 1 },
      ],
    );
  });

  it('explains server errors in Spanish and falls back to a retry message', () => {
    assert.match(orderErrorMessage('This shop is closed right now.'), /cerrada/);
    assert.match(orderErrorMessage('One or more products are not available at this shop.'), /ya no está disponible/);
    assert.match(orderErrorMessage('One or more options are not available.'), /opciones/);
    assert.match(orderErrorMessage('Choose a size for each item.'), /tamaño/);
    assert.match(orderErrorMessage('Choose only one size for each item.'), /solo tamaño/);
    assert.match(orderErrorMessage('Some products are sold out.'), /ya no está disponible/);
    assert.equal(orderErrorMessage('We could not place your order. Please try again.'), ORDER_RETRY_MESSAGE);
    assert.equal(orderErrorMessage(undefined), ORDER_RETRY_MESSAGE);
  });

  it('builds a short pickup code from the order id', () => {
    assert.equal(orderCode('3f1c2a9e-8b7d-4c6e-9f10-112233445566'), '#3F1C');
  });
});

describe('scheduled pickup', () => {
  const shopSlots = [
    { start: '2026-11-18T15:20:00Z' },
    { start: '2026-11-18T15:30:00Z' },
  ];
  const choices = slotChoices(shopSlots, () => '9:20 a. m.');
  it('always offers "as soon as possible" first, and then the shop slots', () => {
    assert.equal(choices[0], ASAP_SLOT);
    assert.equal(choices.length, 3);
    assert.deepEqual(validateCheckout({ ...base, slot: choices[2] }, now), {});
  });
  it('sends a pickup time only for a chosen slot', () => {
    assert.equal(pickupTimeFor(ASAP_SLOT), undefined);
    assert.equal(pickupTimeFor(choices[1]), '2026-11-18T15:20:00Z');
  });
  it('explains closed pickup times', () => {
    assert.match(orderErrorMessage('The shop is closed at that pickup time.'), /cerrada a esa hora/);
  });
});
