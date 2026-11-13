import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { trackingView } from './tracking.ts';

const ctx = { shopName: 'Café Lempa', customerName: 'Diego', code: 'A-1042' };

describe('trackingView', () => {
  it('allows cancelling only while received', () => {
    assert.equal(trackingView('received', ctx)!.canCancel, true);
    assert.equal(trackingView('preparing', ctx)!.canCancel, false);
    assert.equal(trackingView('ready', ctx)!.canCancel, false);
  });
  it('tells the customer what to say at pickup when ready', () => {
    const v = trackingView('ready', ctx)!;
    assert.equal(v.ready, true);
    assert.equal(v.body, 'Di tu nombre en la barra: Diego, pedido A-1042.');
    assert.equal(v.times[2], '9:13 a. m.');
  });
  it('shows waiting times before a step is reached', () => {
    assert.deepEqual(trackingView('received', ctx)!.times, ['9:03 a. m.', 'En espera', 'Aprox. 9:15 a. m.']);
  });
  it('returns null for cancelled orders', () => {
    assert.equal(trackingView('cancelled', ctx), null);
  });
});
