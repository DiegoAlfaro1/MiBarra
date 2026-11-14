import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveFontFamily } from '../theme/fontNames.ts';
import { passwordStrength, validateAuth, validateCard, validateGuest, validateSignup } from './validation.ts';

const ok = { signup: true, method: 'phone' as const, name: 'Diego', phone: '9999 9999', email: '', password: '12345678' };

describe('validateAuth', () => {
  it('accepts valid sign-up data', () => {
    assert.deepEqual(validateAuth(ok), {});
  });
  it('reports every invalid field with a message', () => {
    const errors = validateAuth({ ...ok, name: ' ', phone: '123', password: 'short' });
    assert.deepEqual(Object.keys(errors).sort(), ['name', 'password', 'phone']);
  });
  it('only needs a name when signing up', () => {
    assert.deepEqual(validateAuth({ ...ok, signup: false, name: '' }), {});
  });
  it('validates email when that method is chosen', () => {
    assert.ok(validateAuth({ ...ok, method: 'email', email: 'nope' }).email);
    assert.deepEqual(validateAuth({ ...ok, method: 'email', email: 'a@b.co', phone: '' }), {});
  });
});

describe('validateCard', () => {
  const now = new Date(2026, 10, 13);
  const card = { number: '4242 4242 4242 4242', expiry: '12/28', cvv: '123' };
  it('accepts the demo card', () => assert.deepEqual(validateCard(card, now), {}));
  it('rejects bad number, expiry and cvv', () => {
    const errors = validateCard({ number: '4242', expiry: '13/28', cvv: '1' }, now);
    assert.deepEqual(Object.keys(errors).sort(), ['cvv', 'expiry', 'number']);
  });
  it('rejects expired cards', () => {
    assert.match(validateCard({ ...card, expiry: '10/26' }, now).expiry ?? '', /vencida/);
  });
});

describe('validateSignup', () => {
  it('requires accepting the terms', () => {
    assert.deepEqual(validateSignup({ ...ok, acceptedTerms: true }), {});
    assert.deepEqual(Object.keys(validateSignup({ ...ok, acceptedTerms: false })), ['terms']);
  });
});

describe('validateGuest', () => {
  it('needs only a name; phone is optional', () => {
    assert.deepEqual(validateGuest({ name: 'Diego', phone: '' }), {});
    assert.deepEqual(validateGuest({ name: 'Diego', phone: '9999 9999' }), {});
  });
  it('rejects a missing name and a partial phone', () => {
    assert.deepEqual(Object.keys(validateGuest({ name: ' ', phone: '123' })).sort(), ['name', 'phone']);
  });
});

describe('passwordStrength', () => {
  it('grades empty, short, ok and strong passwords', () => {
    assert.equal(passwordStrength(''), 0);
    assert.equal(passwordStrength('abc'), 1);
    assert.equal(passwordStrength('cafe2026'), 2);
    assert.equal(passwordStrength('Cafe2026Latte!'), 3);
  });
});

describe('resolveFontFamily', () => {
  it('maps theme fonts to loaded font names', () => {
    assert.equal(resolveFontFamily('Bricolage Grotesque', '700'), 'BricolageGrotesque_700Bold');
    assert.equal(resolveFontFamily('Inter', '500'), 'Inter_500Medium');
    assert.equal(resolveFontFamily('ui-monospace', '700'), 'monospace');
  });
});
