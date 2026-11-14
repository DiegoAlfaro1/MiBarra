import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ACCESS_ROLES,
  PERMISSIONS,
  accessFor,
  can,
  canManageRole,
  invitableRoles,
  isStaffAccount,
  type AccessRole,
  type Permission,
} from './permissions.ts';

/** Roles allowed (any scope) for each permission, straight from the matrix in issue #22. */
const ALLOWED: Record<Permission, AccessRole[]> = {
  browseMenus: ['customer', 'barista', 'manager', 'owner', 'platform_admin'],
  manageOwnOrders: ['customer'],
  viewShopOrders: ['barista', 'manager', 'owner', 'platform_admin'],
  changeOrderStatus: ['barista', 'manager', 'owner'],
  cancelLateOrRefund: ['manager', 'owner'],
  markSoldOut: ['barista', 'manager', 'owner'],
  openCloseShop: ['manager', 'owner'],
  scanLoyaltyQr: ['barista', 'manager', 'owner'],
  editMenu: ['manager', 'owner', 'platform_admin'],
  createOffers: ['manager', 'owner'],
  changeLoyaltyRules: ['owner'],
  viewSalesReports: ['barista', 'manager', 'owner', 'platform_admin'],
  seeCustomerContact: ['customer', 'barista', 'manager', 'owner', 'platform_admin'],
  manageStaff: ['manager', 'owner', 'platform_admin'],
  editShopSettings: ['owner', 'platform_admin'],
  createOrSuspendShops: ['platform_admin'],
};

test('every permission has an entry for every role', () => {
  assert.deepEqual(Object.keys(PERMISSIONS).sort(), Object.keys(ALLOWED).sort());
  for (const permission of Object.keys(PERMISSIONS) as Permission[]) {
    assert.deepEqual(Object.keys(PERMISSIONS[permission]).sort(), [...ACCESS_ROLES].sort(), permission);
  }
});

test('the matrix matches the issue', () => {
  for (const [permission, allowed] of Object.entries(ALLOWED) as [Permission, AccessRole[]][]) {
    const actual = ACCESS_ROLES.filter((role) => can(role, permission));
    assert.deepEqual(actual.sort(), [...allowed].sort(), permission);
  }
});

test('staff permissions are scoped to their own shop; customers to their own rows', () => {
  assert.equal(accessFor('barista', 'viewShopOrders'), 'own_shop');
  assert.equal(accessFor('platform_admin', 'viewShopOrders'), 'yes');
  assert.equal(accessFor('customer', 'manageOwnOrders'), 'own');
  assert.equal(accessFor('barista', 'viewSalesReports'), 'limited');
  assert.equal(accessFor('barista', 'seeCustomerContact'), 'limited');
  assert.equal(accessFor('manager', 'manageStaff'), 'limited');
});

test('signed-out visitors can only browse', () => {
  for (const permission of Object.keys(PERMISSIONS) as Permission[]) {
    assert.equal(can(null, permission), permission === 'browseMenus', permission);
    assert.equal(can(undefined, permission), permission === 'browseMenus', permission);
  }
});

test('owners and platform admins manage all staff, managers only baristas', () => {
  assert.deepEqual(invitableRoles('owner'), ['owner', 'manager', 'barista']);
  assert.deepEqual(invitableRoles('platform_admin'), ['owner', 'manager', 'barista']);
  assert.deepEqual(invitableRoles('manager'), ['barista']);
  assert.deepEqual(invitableRoles('barista'), []);
  assert.deepEqual(invitableRoles(null), []);
  assert.equal(canManageRole('manager', 'owner'), false);
  assert.equal(canManageRole('manager', 'manager'), false);
});

test('only server-set app metadata marks a staff account', () => {
  assert.equal(isStaffAccount({ app_metadata: { account_type: 'staff' } }), true);
  assert.equal(isStaffAccount({ app_metadata: { provider: 'email' } }), false);
  assert.equal(isStaffAccount({ app_metadata: null }), false);
  // user_metadata is chosen by the user at sign-up, so it doesn't count.
  assert.equal(isStaffAccount({ user_metadata: { account_type: 'staff' } } as never), false);
  assert.equal(isStaffAccount(null), false);
});
