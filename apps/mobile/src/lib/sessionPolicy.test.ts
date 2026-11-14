import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  KEEP_SESSION_DAYS,
  authErrorMessage,
  keepUntil,
  shouldRestoreSession,
  toCredentials,
} from './sessionPolicy.ts';

const DAY = 24 * 60 * 60 * 1000;

describe('keep-session policy', () => {
  it('keeps a session for 30 days', () => {
    assert.equal(KEEP_SESSION_DAYS, 30);
    assert.equal(keepUntil(1000), 1000 + 30 * DAY);
  });

  it('restores a kept session before the deadline', () => {
    const now = 5 * DAY;
    assert.equal(shouldRestoreSession(String(keepUntil(0)), now), true);
  });

  it('asks for login again after 30 days', () => {
    assert.equal(shouldRestoreSession(String(keepUntil(0)), 30 * DAY), false);
    assert.equal(shouldRestoreSession(String(keepUntil(0)), 31 * DAY), false);
  });

  it('does not restore when the user did not choose to stay logged in', () => {
    assert.equal(shouldRestoreSession(null, 1), false);
    assert.equal(shouldRestoreSession(undefined, 1), false);
    assert.equal(shouldRestoreSession('', 1), false);
  });

  it('rejects a corrupted deadline', () => {
    assert.equal(shouldRestoreSession('abc', 1), false);
  });
});

describe('toCredentials', () => {
  it('builds a +504 phone credential from the typed digits', () => {
    assert.deepEqual(toCredentials({ method: 'phone', phone: '9999 9999', email: '', password: 'secret123' }), {
      phone: '+50499999999',
      password: 'secret123',
    });
  });

  it('trims and lowercases the email', () => {
    assert.deepEqual(toCredentials({ method: 'email', phone: '', email: ' Tu@Correo.com ', password: 'secret123' }), {
      email: 'tu@correo.com',
      password: 'secret123',
    });
  });
});

describe('authErrorMessage', () => {
  it('explains wrong credentials in Spanish', () => {
    assert.match(authErrorMessage('Invalid login credentials', false), /no coinciden/);
  });

  it('explains duplicate accounts', () => {
    assert.match(authErrorMessage('User already registered', true), /Ya existe una cuenta/);
  });

  it('falls back to generic copy without leaking the backend message', () => {
    const text = authErrorMessage('boom: internal stack', false);
    assert.doesNotMatch(text, /boom/);
    assert.match(text, /iniciar sesión/);
  });
});
