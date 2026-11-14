import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CUSTOMER_EMAIL_ERROR, planInvite, validateStaffInviteInput } from './staff-invite.ts';

const SHOP = '00000000-0000-4000-8000-000000000001';
const USER = '00000000-0000-4000-8000-0000000000a4';
const valid = { shopId: SHOP, role: 'barista', email: 'barista@example.com' };

function errorOf(body: unknown): string | undefined {
  const result = validateStaffInviteInput(body);
  return result.ok ? undefined : result.error;
}

test('accepts a valid invitation, normalizes the email and strips unknown fields', () => {
  const result = validateStaffInviteInput({ ...valid, email: '  Barista@Example.COM ', userId: USER });
  assert.deepEqual(result, { ok: true, value: valid });
});

test('rejects non-object bodies and a missing shop', () => {
  assert.equal(errorOf(null), 'Invalid request.');
  assert.equal(errorOf('x'), 'Invalid request.');
  assert.equal(errorOf({ ...valid, shopId: 'shop-a' }), 'Please choose a shop.');
});

test('only staff roles can be invited', () => {
  for (const role of ['owner', 'manager', 'barista']) {
    assert.equal(errorOf({ ...valid, role }), undefined, role);
  }
  for (const role of ['customer', 'admin', 'platform_admin', 'OWNER', undefined, 1]) {
    assert.match(errorOf({ ...valid, role }) ?? '', /Choose a role/, String(role));
  }
});

test('rejects missing and invalid emails with a clear message', () => {
  assert.match(errorOf({ ...valid, email: undefined }) ?? '', /Enter the email/);
  assert.match(errorOf({ ...valid, email: '   ' }) ?? '', /Enter the email/);
  assert.equal(errorOf({ ...valid, email: 'not-an-email' }), 'Enter a valid email address.');
  assert.equal(errorOf({ ...valid, email: 'a b@example.com' }), 'Enter a valid email address.');
  assert.equal(errorOf({ ...valid, email: `${'a'.repeat(250)}@example.com` }), 'Enter a valid email address.');
});

test('new emails get an invitation link', () => {
  assert.deepEqual(planInvite(null), { kind: 'invite' });
  assert.deepEqual(planInvite(undefined), { kind: 'invite' });
});

test('a customer account is never turned into a staff account', () => {
  assert.deepEqual(planInvite({ user_id: USER, account_type: 'customer', confirmed: true }), {
    kind: 'reject',
    error: CUSTOMER_EMAIL_ERROR,
  });
  assert.equal(planInvite({ user_id: USER, account_type: 'customer', confirmed: false }).kind, 'reject');
});

test('existing staff logins are added; unaccepted invitations are sent again', () => {
  assert.deepEqual(planInvite({ user_id: USER, account_type: 'staff', confirmed: true }), { kind: 'add', userId: USER });
  assert.deepEqual(planInvite({ user_id: USER, account_type: 'staff', confirmed: false }), {
    kind: 'reinvite',
    userId: USER,
  });
});
