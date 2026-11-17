import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isTakingOrders, setShopOpen, ShopOpenError } from './shopOpen.ts';
import type { Shop } from './types.ts';

const HOURS: Shop['hours'] = { mon: { open: '07:00', close: '19:00' } };
const shop = (over: Partial<Shop> = {}) => ({ is_open: true, suspended: false, hours: HOURS, ...over });
// 2026-11-16 is a Monday (local time).
const monday = (h: number) => new Date(2026, 10, 16, h);

describe('isTakingOrders', () => {
  it('takes orders when the switch is on and hours are in effect', () => {
    assert.equal(isTakingOrders(shop(), monday(10)), true);
  });
  it('stops taking orders once the hours end, even if the switch is still on', () => {
    assert.equal(isTakingOrders(shop(), monday(19)), false);
  });
  it('does not take orders when the switch is off or the shop is suspended', () => {
    assert.equal(isTakingOrders(shop({ is_open: false }), monday(10)), false);
    assert.equal(isTakingOrders(shop({ suspended: true }), monday(10)), false);
  });
});

describe('setShopOpen', () => {
  const client = (result: { data: unknown; error: { code?: string; message?: string } | null }) => {
    const calls: unknown[] = [];
    return { calls, rpc: async (...args: unknown[]) => (calls.push(args), result) } as never;
  };

  it('calls set_shop_open and returns the saved shop', async () => {
    const c = client({ data: { id: 's1', is_open: true }, error: null });
    const saved = await setShopOpen(c, 's1', true);
    assert.equal(saved.is_open, true);
    assert.deepEqual((c as unknown as { calls: unknown[] }).calls, [['set_shop_open', { p_shop_id: 's1', p_open: true }]]);
  });
  it('explains that the shop cannot open outside its hours', async () => {
    await assert.rejects(
      setShopOpen(client({ data: null, error: { code: '22023', message: 'x' } }), 's1', true),
      (e: Error) => e instanceof ShopOpenError && /horario/.test(e.message),
    );
  });
  it('shows a generic retry message on other errors', async () => {
    await assert.rejects(
      setShopOpen(client({ data: null, error: { message: 'boom' } }), 's1', false),
      (e: Error) => e instanceof ShopOpenError && /conexión/.test(e.message),
    );
  });
});
