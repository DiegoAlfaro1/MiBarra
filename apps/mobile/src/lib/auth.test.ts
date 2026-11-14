import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { signUpCustomer, toE164, type SignUpClient } from './auth.ts';

const base = { name: ' Diego ', phone: '9999 9999', email: ' Diego@Correo.com ', password: 'Cafe2026!' };

function fake(result: { identities?: unknown[]; error?: { message: string; code?: string }; throws?: boolean }) {
  const calls: unknown[] = [];
  const client: SignUpClient = {
    auth: {
      async signUp(c) {
        calls.push(c);
        if (result.throws) throw new Error('network');
        return { data: { user: { identities: result.identities ?? [{}] } }, error: result.error ?? null };
      },
    },
  };
  return { client, calls };
}

describe('toE164', () => {
  it('prefixes the country code and strips spaces', () => assert.equal(toE164('9999 9999'), '+50499999999'));
});

describe('signUpCustomer', () => {
  it('signs up by phone in E.164 with the display name', async () => {
    const { client, calls } = fake({});
    assert.deepEqual(await signUpCustomer(client, { ...base, method: 'phone' }), { ok: true });
    assert.deepEqual(calls[0], { phone: '+50499999999', password: 'Cafe2026!', options: { data: { display_name: 'Diego' } } });
  });
  it('signs up by email, trimmed and lower-cased', async () => {
    const { client, calls } = fake({});
    await signUpCustomer(client, { ...base, method: 'email' });
    assert.equal((calls[0] as { email: string }).email, 'diego@correo.com');
  });
  it('explains a duplicate account', async () => {
    const { client } = fake({ error: { message: 'x', code: 'user_already_exists' } });
    const r = await signUpCustomer(client, { ...base, method: 'email' });
    assert.ok(!r.ok && /Ya existe una cuenta/.test(r.message));
  });
  it('treats an empty identities list as a duplicate', async () => {
    const { client } = fake({ identities: [] });
    assert.equal((await signUpCustomer(client, { ...base, method: 'email' })).ok, false);
  });
  it('returns a friendly message instead of throwing on network failure', async () => {
    const { client } = fake({ throws: true });
    const r = await signUpCustomer(client, { ...base, method: 'phone' });
    assert.ok(!r.ok && /No pudimos crear tu cuenta/.test(r.message));
  });
});
