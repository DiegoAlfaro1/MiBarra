import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatMoney, sumLineItems } from './money.ts';

test('formats integer cents as currency', () => {
  assert.equal(formatMoney(4550, 'USD', 'en-US'), '$45.50');
  assert.equal(formatMoney(0, 'USD', 'en-US'), '$0.00');
});

test('rejects fractional or unsafe amounts', () => {
  assert.throws(() => formatMoney(10.5, 'USD'), RangeError);
  assert.throws(() => formatMoney(Number.NaN, 'USD'), RangeError);
});

test('sums line items', () => {
  assert.equal(sumLineItems([]), 0);
  assert.equal(
    sumLineItems([
      { quantity: 2, unit_price_cents: 350 },
      { quantity: 1, unit_price_cents: 499 },
    ]),
    1199,
  );
});
