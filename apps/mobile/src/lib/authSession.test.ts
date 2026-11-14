import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  authErrorMessage,
  decideOnStart,
  displayName,
  isKeptSessionExpired,
  KEEP_SESSION_DAYS,
  parseSessionMeta,
  toE164,
} from './authSession.ts';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 14);

describe('decideOnStart', () => {
  it('restores a kept session inside the 30 days', () => {
    assert.equal(decideOnStart(true, { keep: true, startedAt: NOW - 29 * DAY }, NOW), 'restore');
  });
  it('asks for a new login once 30 days have passed', () => {
    assert.equal(KEEP_SESSION_DAYS, 30);
    assert.equal(decideOnStart(true, { keep: true, startedAt: NOW - 30 * DAY }, NOW), 'discard');
    assert.equal(decideOnStart(true, { keep: true, startedAt: NOW - 90 * DAY }, NOW), 'discard');
  });
  it('does not keep the session when the customer said no', () => {
    assert.equal(decideOnStart(true, { keep: false, startedAt: NOW - DAY }, NOW), 'discard');
  });
  it('discards a stored session with no record of how it started', () => {
    assert.equal(decideOnStart(true, null, NOW), 'discard');
  });
  it('treats a start time in the future as expired', () => {
    assert.equal(isKeptSessionExpired({ keep: true, startedAt: NOW + DAY }, NOW), true);
  });
});

describe('parseSessionMeta', () => {
  it('reads valid data and rejects anything else without throwing', () => {
    assert.deepEqual(parseSessionMeta('{"keep":true,"startedAt":5}'), { keep: true, startedAt: 5 });
    assert.equal(parseSessionMeta(null), null);
    assert.equal(parseSessionMeta('not json'), null);
    assert.equal(parseSessionMeta('{"keep":"yes","startedAt":5}'), null);
    assert.equal(parseSessionMeta('{"keep":true}'), null);
    assert.equal(parseSessionMeta('null'), null);
  });
});

describe('authErrorMessage', () => {
  it('gives clear messages for the common failures', () => {
    assert.match(authErrorMessage({ code: 'invalid_credentials', status: 400 }), /no son correctos/);
    assert.match(authErrorMessage({ code: 'user_already_exists', status: 422 }), /Ya existe una cuenta/);
    assert.match(authErrorMessage({ code: 'over_request_rate_limit', status: 429 }), /Demasiados intentos/);
  });
  it('reports a network failure and never leaks backend text', () => {
    assert.match(authErrorMessage({ name: 'AuthRetryableFetchError', status: 0, message: 'fetch failed' }), /conexión/);
    const generic = authErrorMessage({ code: 'unexpected_failure', status: 500, message: 'pg: relation x' });
    assert.doesNotMatch(generic, /pg:/);
  });
});

describe('helpers', () => {
  it('formats Honduran phone numbers as E.164', () => {
    assert.equal(toE164('9999 9999'), '+50499999999');
  });
  it('picks a display name', () => {
    assert.equal(displayName({ user_metadata: { display_name: ' Ana ' }, email: 'a@b.co' }), 'Ana');
    assert.equal(displayName({ email: 'maria@correo.com' }), 'maria');
    assert.equal(displayName({}), 'Cliente');
  });
});
