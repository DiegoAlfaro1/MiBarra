import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { checkoutRoute, greetingName, sessionFromUser } from './access.ts';
import { authErrorMessage, signIn, signUp, toE164, type AuthClient } from './auth.ts';

const creds = { method: 'email' as const, phone: '', email: ' Ana@Correo.com ', password: 'secreto123' };

function fake(overrides: Partial<AuthClient['auth']> = {}): { client: AuthClient; calls: Record<string, unknown>[] } {
  const calls: Record<string, unknown>[] = [];
  const user = { email: 'ana@correo.com', user_metadata: { display_name: 'Ana' } };
  const client: AuthClient = {
    auth: {
      signUp: async (c) => (calls.push(c), { data: { user, session: {} }, error: null }),
      signInWithPassword: async (c) => (calls.push(c), { data: { user }, error: null }),
      ...overrides,
    },
  };
  return { client, calls };
}

describe('browsing vs checkout access', () => {
  it('sends visitors to sign up and customers to checkout', () => {
    assert.equal(checkoutRoute(null), '/login');
    assert.equal(checkoutRoute({ name: 'Ana' }), '/checkout');
  });
  it('greets only people with a name', () => {
    assert.equal(greetingName(null), null);
    assert.equal(greetingName({ name: ' Ana ' }), 'Ana');
  });
  it('derives the session name from the user', () => {
    assert.equal(sessionFromUser(null), null);
    assert.deepEqual(sessionFromUser({ user_metadata: { display_name: 'Ana' } }), { name: 'Ana' });
    assert.deepEqual(sessionFromUser({ email: 'luis@x.com' }), { name: 'luis' });
  });
});

describe('sign up and sign in', () => {
  it('signs up with a normalised email and the display name', async () => {
    const { client, calls } = fake();
    const out = await signUp(client, ' Ana ', creds);
    assert.deepEqual(out, { ok: true, session: { name: 'Ana' } });
    assert.deepEqual(calls[0], { email: 'ana@correo.com', password: 'secreto123', options: { data: { display_name: 'Ana' } } });
  });
  it('uses an E.164 number for phone accounts', async () => {
    const { client, calls } = fake();
    await signIn(client, { ...creds, method: 'phone', phone: '9999 9999' });
    assert.equal(calls[0]!.phone, '+50499999999');
    assert.equal(toE164('9999-9999'), '+50499999999');
  });
  it('explains when the account already exists', async () => {
    const { client } = fake({ signUp: async () => ({ data: { user: null, session: null }, error: { message: 'User already registered' } }) });
    const out = await signUp(client, 'Ana', creds);
    assert.deepEqual(out, { ok: false, message: 'Ya existe una cuenta con esos datos. Inicia sesión.' });
  });
  it('reports bad credentials and network failures without throwing', async () => {
    const bad = fake({ signInWithPassword: async () => ({ data: { user: null }, error: { message: 'Invalid login credentials' } }) });
    assert.equal((await signIn(bad.client, creds)).ok, false);
    const down = fake({ signInWithPassword: async () => { throw new Error('Failed to fetch'); } });
    assert.deepEqual(await signIn(down.client, creds), { ok: false, message: authErrorMessage({ message: 'fetch' }) });
  });
  it('does not start a session when confirmation is required', async () => {
    const { client } = fake({ signUp: async () => ({ data: { user: {}, session: null }, error: null }) });
    assert.equal((await signUp(client, 'Ana', creds)).ok, false);
  });
});
