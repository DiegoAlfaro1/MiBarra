import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { findShop, listShops, shopInitials, shopStatus, ShopDirectoryError, weeklyHours } from './shopDirectory.ts';
import type { Shop } from './types.ts';

const HOURS: Shop['hours'] = { mon: { open: '07:00', close: '19:00' }, tue: null };
const shop = (over: Partial<Shop> = {}) => ({ is_open: true, suspended: false, hours: HOURS, ...over });
// 2026-11-16 is a Monday, 2026-11-17 a Tuesday (local time).
const monday = (h: number, m = 0) => new Date(2026, 10, 16, h, m);

describe('shopStatus', () => {
  it('is open inside today\'s hours and says when it closes', () => {
    assert.deepEqual(shopStatus(shop(), monday(10)), { open: true, label: 'Abierto hasta 7:00 p. m.' });
  });
  it('is closed before opening and after closing', () => {
    assert.deepEqual(shopStatus(shop(), monday(6, 59)), { open: false, label: 'Abre hoy a las 7:00 a. m.' });
    assert.equal(shopStatus(shop(), monday(19)).open, false);
  });
  it('is closed on a day without hours', () => {
    assert.deepEqual(shopStatus(shop(), new Date(2026, 10, 17, 10)), { open: false, label: 'Cerrado hoy' });
  });
  it('is closed when the owner switched it off or an admin suspended it', () => {
    assert.equal(shopStatus(shop({ is_open: false }), monday(10)).open, false);
    assert.equal(shopStatus(shop({ suspended: true }), monday(10)).open, false);
  });
  it('follows the switch alone when no hours were saved', () => {
    assert.deepEqual(shopStatus(shop({ hours: {} }), monday(3)), { open: true, label: 'Abierto' });
  });
});

describe('shop display helpers', () => {
  it('builds initials', () => {
    assert.equal(shopInitials('Café Lempa'), 'CL');
    assert.equal(shopInitials('Tostadores del Valle'), 'TV');
    assert.equal(shopInitials('molienda'), 'MO');
    assert.equal(shopInitials('  '), '?');
  });
  it('lists the week Monday first, with closed days', () => {
    const rows = weeklyHours(HOURS);
    assert.equal(rows.length, 7);
    assert.deepEqual(rows[0], { day: 'mon', label: 'Lunes', text: '7:00 a. m. – 7:00 p. m.' });
    assert.equal(rows[1]!.text, 'Cerrado');
    assert.equal(rows[6]!.text, 'Cerrado');
  });
});

describe('shop directory requests', () => {
  const clientReturning = (result: { data: unknown; error: unknown }) => {
    const calls: string[] = [];
    const query: Record<string, unknown> = {
      select: () => query,
      order: () => Promise.resolve(result),
      eq: () => query,
      maybeSingle: () => Promise.resolve(result),
    };
    return { calls, client: { from: (t: string) => (calls.push(t), query) } as never };
  };

  it('returns the shops, or an empty list', async () => {
    assert.deepEqual(await listShops(clientReturning({ data: [{ id: 'a' }], error: null }).client), [{ id: 'a' }]);
    assert.deepEqual(await listShops(clientReturning({ data: null, error: null }).client), []);
  });
  it('turns database errors into a clear Spanish message', async () => {
    const { client } = clientReturning({ data: null, error: { message: 'boom' } });
    await assert.rejects(listShops(client), (e: Error) => e instanceof ShopDirectoryError && /cafeterías/.test(e.message));
    await assert.rejects(findShop(client, 'x'), ShopDirectoryError);
  });
  it('returns null for an unknown shop', async () => {
    assert.equal(await findShop(clientReturning({ data: null, error: null }).client, 'x'), null);
  });
});
