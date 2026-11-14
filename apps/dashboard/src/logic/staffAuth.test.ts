import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MESSAGES, signInStaff, type StaffAuthClient } from './staffAuth.ts';

function fake(opts: { authError?: boolean; role?: string; rpcFails?: boolean }) {
  const calls = { signOut: 0 };
  const client: StaffAuthClient = {
    auth: {
      signInWithPassword: async () => ({ error: opts.authError ? { message: 'bad' } : null }),
      signOut: async () => { calls.signOut += 1; },
    },
    rpc: async () =>
      opts.rpcFails
        ? { data: null, error: { message: 'down' } }
        : { data: opts.role ? [{ shop_id: 's1', shop_name: 'Demo', role: opts.role }] : [], error: null },
  };
  return { client, calls };
}

test('staff sign in and keep their session', async () => {
  for (const role of ['barista', 'manager', 'owner']) {
    const { client, calls } = fake({ role });
    const r = await signInStaff(client, ' a@b.c ', 'pw');
    assert.equal(r.ok && r.access.role, role);
    assert.equal(calls.signOut, 0);
  }
});

test('a customer is signed out again and told why', async () => {
  const { client, calls } = fake({});
  assert.deepEqual(await signInStaff(client, 'c@b.c', 'pw'), { ok: false, message: MESSAGES.notStaff });
  assert.equal(calls.signOut, 1);
});

test('empty fields and wrong passwords give clear messages', async () => {
  assert.deepEqual(await signInStaff(fake({}).client, '', 'pw'), { ok: false, message: MESSAGES.missing });
  assert.deepEqual(await signInStaff(fake({ authError: true }).client, 'a@b.c', 'x'), { ok: false, message: MESSAGES.invalid });
});

test('a failing access check denies access instead of crashing', async () => {
  const { client, calls } = fake({ rpcFails: true });
  assert.deepEqual(await signInStaff(client, 'a@b.c', 'pw'), { ok: false, message: MESSAGES.network });
  assert.equal(calls.signOut, 1);
});
