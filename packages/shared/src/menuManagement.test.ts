import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MenuManagementError, createItem, deleteCategory, deleteItem, setItemAvailable } from './menuApi.ts';
import { lempirasInput, parseLempiras, validateCategoryInput, validateItemInput, validateOptionInput } from './menuManagement.ts';

const CATEGORY = '00000000-0000-4000-8000-0000000000c1';

describe('validation', () => {
  it('trims names and rejects empty ones with a message', () => {
    const ok = validateCategoryInput({ name: '  Café ' });
    assert.deepEqual(ok, { ok: true, value: { name: 'Café' } });
    const bad = validateCategoryInput({ name: '   ' });
    assert.equal(bad.ok, false);
    if (!bad.ok) assert.match(bad.errors.name ?? '', /Escribe un nombre para la categoría/);
  });

  it('rejects fractional, negative and huge prices for items', () => {
    for (const price_cents of [12.5, -1, 1e12, Number.NaN]) {
      const result = validateItemInput({ category_id: CATEGORY, name: 'Latte', price_cents });
      assert.equal(result.ok, false);
    }
    assert.equal(validateItemInput({ category_id: CATEGORY, name: 'Latte', price_cents: 6000 }).ok, true);
  });

  it('requires a category', () => {
    const result = validateItemInput({ category_id: '', name: 'Latte', price_cents: 100 });
    assert.equal(result.ok, false);
  });

  it('allows free and negative option price changes but not an unknown kind', () => {
    assert.equal(validateOptionInput({ kind: 'size', name: 'Mediano', price_change_cents: 0 }).ok, true);
    assert.equal(validateOptionInput({ kind: 'extra', name: 'Sin azúcar', price_change_cents: -500 }).ok, true);
    assert.equal(validateOptionInput({ kind: 'bogus' as 'size', name: 'x', price_change_cents: 0 }).ok, false);
  });
});

describe('menu api', () => {
  function fakeClient(result: { data?: unknown; error?: { code?: string; message?: string } | null }) {
    const calls: unknown[] = [];
    const builder = {
      delete: () => builder,
      eq: async () => ({ data: null, error: null, ...result }),
    };
    const client = {
      rpc: async (name: string, args: unknown) => {
        calls.push({ name, args });
        return { data: null, error: null, ...result };
      },
      from: () => {
        calls.push('from');
        return builder;
      },
    };
    return { client: client as unknown as Parameters<typeof setItemAvailable>[0], calls };
  }

  it('does not call the database when input is invalid', async () => {
    const { client, calls } = fakeClient({});
    await assert.rejects(
      createItem(client, 's', { category_id: CATEGORY, name: '', price_cents: 100 }),
      (error: MenuManagementError) => error.name === 'MenuManagementError' && Boolean(error.fieldErrors?.name),
    );
    assert.equal(calls.length, 0);
  });

  it('toggles sold out through the set_item_available function', async () => {
    const { client, calls } = fakeClient({ data: { id: 'i1', available: false } });
    const item = await setItemAvailable(client, 'i1', false);
    assert.equal(item.available, false);
    assert.deepEqual(calls, [{ name: 'set_item_available', args: { p_item_id: 'i1', p_available: false } }]);
  });

  it('explains that items with past orders cannot be deleted', async () => {
    const { client } = fakeClient({ error: { code: '23503', message: 'fk' } });
    await assert.rejects(deleteItem(client, 'i1'), /agotado en lugar de borrarlo/);
  });

  it('hides raw database errors behind a friendly message', async () => {
    const { client } = fakeClient({ error: { code: 'XX000', message: 'internal error at table x' } });
    await assert.rejects(setItemAvailable(client, 'i1', true), /No pudimos guardar/);
  });

  it('explains permission errors and non-empty categories', async () => {
    const denied = fakeClient({ error: { code: '42501', message: 'new row violates row-level security policy' } });
    await assert.rejects(deleteItem(denied.client, 'i1'), /No tienes permiso/);
    const used = fakeClient({ error: { code: '23503', message: 'fk' } });
    await assert.rejects(deleteCategory(used.client, 'c1'), /todavía tiene productos/);
  });
});

describe('prices in lempiras', () => {
  it('turns typed prices into cents', () => {
    assert.equal(parseLempiras('55'), 5500);
    assert.equal(parseLempiras(' 55.5 '), 5550);
    assert.equal(parseLempiras('L 1,250.05'), 125005);
    assert.equal(parseLempiras('0'), 0);
    assert.equal(lempirasInput(5550), '55.50');
  });

  it('rejects text, negatives, three decimals and prices over the limit', () => {
    for (const raw of ['', 'abc', '-5', '5.555', '12,5', '100000', '1e3']) {
      assert.equal(parseLempiras(raw), null, raw);
    }
  });

  it('rejects photo links that are not web links', () => {
    const bad = validateItemInput({ category_id: CATEGORY, name: 'Latte', price_cents: 100, photo_url: 'file:///foto.jpg' });
    assert.equal(bad.ok, false);
  });
});
