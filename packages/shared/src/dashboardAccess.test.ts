import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveDashboardAccess } from './dashboardAccess.ts';

const shop = '00000000-0000-4000-8000-000000000001';

test('customers and signed-out users (no rows) cannot open the dashboard', () => {
  assert.equal(resolveDashboardAccess([]), null);
  assert.equal(resolveDashboardAccess(null), null);
  assert.equal(resolveDashboardAccess([{ shop_id: shop, shop_name: 'X', role: 'customer' }]), null);
});

test('baristas, managers, owners and platform admins can open it', () => {
  for (const role of ['barista', 'manager', 'owner'] as const) {
    assert.equal(resolveDashboardAccess([{ shop_id: shop, shop_name: 'Demo', role }])?.role, role);
  }
  const admin = resolveDashboardAccess([{ shop_id: null, shop_name: null, role: 'platform_admin' }]);
  assert.deepEqual(admin, { role: 'platform_admin', shopId: null, shopName: null });
});

test('with several memberships the highest role wins and a real shop is picked', () => {
  const access = resolveDashboardAccess([
    { shop_id: null, shop_name: null, role: 'platform_admin' },
    { shop_id: shop, shop_name: 'Demo', role: 'barista' },
  ]);
  assert.deepEqual(access, { role: 'platform_admin', shopId: shop, shopName: 'Demo' });
});
