import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatPhone,
  hoursForForm,
  normalizePhone,
  ShopProfileError,
  updateShopProfile,
  validateShopProfile,
  type ShopProfileInput,
} from './shopApi.ts';

const VALID: ShopProfileInput = {
  name: ' Café Lempa ',
  logo_url: '',
  address: 'Col. Palmira, Tegucigalpa',
  phone: '2222-3333',
  hours: { ...hoursForForm({}), mon: { open: '7:00', close: '19:00' } },
};

describe('shop profile validation', () => {
  it('cleans a valid profile into what the database expects', () => {
    const result = validateShopProfile(VALID);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.name, 'Café Lempa');
    assert.equal(result.value.phone, '+50422223333');
    assert.equal(result.value.logo_url, null);
    assert.deepEqual(result.value.hours.mon, { open: '07:00', close: '19:00' });
    assert.equal(result.value.hours.sun, null);
  });

  it('gives a message per field and per day', () => {
    const result = validateShopProfile({
      ...VALID,
      name: '  ',
      phone: '123',
      logo_url: 'logo.png',
      hours: { ...VALID.hours, tue: { open: '19:00', close: '07:00' }, wed: { open: '25:00', close: '26:00' } },
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(result.errors.name && result.errors.phone && result.errors.logo_url);
    assert.match(result.errors.hours?.tue ?? '', /antes de la de cierre/);
    assert.match(result.errors.hours?.wed ?? '', /24 horas/);
    assert.equal(result.errors.hours?.mon, undefined);
  });

  it('normalizes Honduran and international phones', () => {
    assert.equal(normalizePhone('9999 9999'), '+50499999999');
    assert.equal(normalizePhone('+504 2222-3333'), '+50422223333');
    assert.equal(normalizePhone(''), '');
    assert.equal(normalizePhone('22-33'), null);
    assert.equal(normalizePhone('call me'), null);
    assert.equal(formatPhone('+50422223333'), '+504 2222-3333');
  });
});

describe('saving the shop profile', () => {
  function fakeClient(result: { data?: unknown; error?: { code?: string; message?: string } | null }) {
    const calls: { name: string; args: unknown }[] = [];
    const client = {
      from: () => {
        throw new Error('not used');
      },
      rpc: async (name: string, args: unknown) => {
        calls.push({ name, args });
        return { data: null, error: null, ...result };
      },
    };
    return { client: client as unknown as Parameters<typeof updateShopProfile>[0], calls };
  }

  it('does not call the database when the form is invalid', async () => {
    const { client, calls } = fakeClient({});
    await assert.rejects(updateShopProfile(client, 's1', { ...VALID, name: '' }), (e: ShopProfileError) => Boolean(e.fieldErrors?.name));
    assert.equal(calls.length, 0);
  });

  it('sends the cleaned values to update_shop_profile', async () => {
    const { client, calls } = fakeClient({ data: { id: 's1' } });
    await updateShopProfile(client, 's1', VALID);
    assert.equal(calls[0]?.name, 'update_shop_profile');
    const args = calls[0]?.args as Record<string, unknown>;
    assert.equal(args.p_shop_id, 's1');
    assert.equal(args.p_phone, '+50422223333');
    assert.equal(args.p_name, 'Café Lempa');
  });

  it('explains that only the owner can edit', async () => {
    const { client } = fakeClient({ error: { code: '42501', message: 'permission denied' } });
    await assert.rejects(updateShopProfile(client, 's1', VALID), /Solo la persona dueña/);
  });
});
