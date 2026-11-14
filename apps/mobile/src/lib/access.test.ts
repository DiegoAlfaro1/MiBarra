import assert from 'node:assert/strict';
import { test } from 'node:test';

import { canCheckout, checkoutHref, greetingName } from './access.ts';

test('signed-out customers are sent to sign up before checkout', () => {
  assert.equal(checkoutHref(null), '/login');
  assert.equal(canCheckout(null), false);
});

test('signed-in customers go straight to checkout', () => {
  assert.equal(checkoutHref({ name: 'Ana' }), '/checkout');
  assert.equal(canCheckout({ name: 'Ana' }), true);
});

test('greeting name is null for browsing guests and blank names', () => {
  assert.equal(greetingName(null), null);
  assert.equal(greetingName({ name: '  ' }), null);
  assert.equal(greetingName({ name: ' Ana ' }), 'Ana');
});
