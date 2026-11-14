import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveDashboardAccess, validateSignIn } from './access.ts';

const staff = { app_metadata: { account_type: 'staff' } };
const customer = { app_metadata: {} };

test('owner, manager and barista with an active membership get in, best role wins', () => {
  for (const role of ['owner', 'manager', 'barista']) {
    assert.deepEqual(resolveDashboardAccess({ user: staff, memberships: [{ role, active: true }], isPlatformAdmin: false }), { allowed: true, role });
  }
  const both = resolveDashboardAccess({ user: staff, memberships: [{ role: 'barista', active: true }, { role: 'manager', active: true }], isPlatformAdmin: false });
  assert.deepEqual(both, { allowed: true, role: 'manager' });
});

test('platform admin gets in without a shop membership', () => {
  assert.deepEqual(resolveDashboardAccess({ user: customer, memberships: [], isPlatformAdmin: true }), { allowed: true, role: 'platform_admin' });
});

test('customers cannot open the dashboard, even with a membership row', () => {
  assert.equal(resolveDashboardAccess({ user: customer, memberships: [{ role: 'barista', active: true }], isPlatformAdmin: false }).allowed, false);
});

test('signed-out, inactive and unknown roles are rejected', () => {
  assert.equal(resolveDashboardAccess({ user: null, memberships: [], isPlatformAdmin: false }).allowed, false);
  assert.equal(resolveDashboardAccess({ user: staff, memberships: [{ role: 'owner', active: false }], isPlatformAdmin: false }).allowed, false);
  assert.equal(resolveDashboardAccess({ user: staff, memberships: [{ role: 'customer', active: true }], isPlatformAdmin: false }).allowed, false);
  assert.equal(resolveDashboardAccess({ user: staff, memberships: [], isPlatformAdmin: false }).allowed, false);
});

test('validateSignIn asks for a valid email and a password', () => {
  assert.match(validateSignIn('', 'x') ?? '', /correo/);
  assert.match(validateSignIn('nope', 'x') ?? '', /válido/);
  assert.match(validateSignIn('a@b.co', '') ?? '', /contraseña/);
  assert.equal(validateSignIn(' a@b.co ', 'x'), null);
});
