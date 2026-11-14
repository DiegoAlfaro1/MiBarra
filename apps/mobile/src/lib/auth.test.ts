import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { signIn, signUp, STAFF_MESSAGE, type AuthClient } from './auth.ts';

// Sign-up cases from issue #16; the happy path and sign-in are covered in access.test.ts.
const creds = { method: 'phone' as const, phone: '9999 9999', email: '', password: 'Cafe2026!' };

function fake(result: Awaited<ReturnType<AuthClient['auth']['signUp']>>): { client: AuthClient; calls: Record<string, unknown>[] } {
  const calls: Record<string, unknown>[] = [];
  const client: AuthClient = {
    auth: {
      signUp: async (c) => (calls.push(c), result),
      signInWithPassword: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
  };
  return { client, calls };
}

describe('sign-up (issue #16)', () => {
  it('signs up by phone in E.164 with the display name', async () => {
    const { client, calls } = fake({ data: { user: { phone: '50499999999' }, session: {} }, error: null });
    assert.equal((await signUp(client, ' Diego ', creds)).ok, true);
    assert.deepEqual(calls[0], { phone: '+50499999999', password: 'Cafe2026!', options: { data: { display_name: 'Diego' } } });
  });
  it('explains a duplicate account reported by error code', async () => {
    const { client } = fake({ data: { user: null, session: null }, error: { message: 'x', code: 'phone_exists' } });
    const out = await signUp(client, 'Diego', creds);
    assert.ok(!out.ok && /Ya existe una cuenta/.test(out.message));
  });
  it('treats a user with no identities as a duplicate', async () => {
    const { client } = fake({ data: { user: { identities: [] }, session: null }, error: null });
    const out = await signUp(client, 'Diego', creds);
    assert.ok(!out.ok && /Ya existe una cuenta/.test(out.message));
  });
  it('explains a password the server rejects as weak', async () => {
    const { client } = fake({ data: { user: null, session: null }, error: { message: 'Password should be at least 8 characters', code: 'weak_password' } });
    const out = await signUp(client, 'Diego', creds);
    assert.ok(!out.ok && /requisitos de seguridad/.test(out.message));
  });
});

describe('sign-in (issue #20)', () => {
  it('rejects a staff account and ends its session on this device', async () => {
    const scopes: unknown[] = [];
    const client: AuthClient = {
      auth: {
        signUp: async () => ({ data: { user: null, session: null }, error: null }),
        signInWithPassword: async () => ({ data: { user: { app_metadata: { account_type: 'staff' } } }, error: null }),
        signOut: async (options) => (scopes.push(options?.scope), { error: null }),
      },
    };
    assert.deepEqual(await signIn(client, creds), { ok: false, message: STAFF_MESSAGE });
    assert.deepEqual(scopes, ['local']);
  });
});
