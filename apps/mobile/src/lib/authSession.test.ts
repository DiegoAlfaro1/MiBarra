import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { decideOnStart, isKeptSessionExpired, KEEP_SESSION_DAYS, parseSessionMeta } from './authSession.ts';

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
