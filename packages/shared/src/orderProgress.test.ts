import assert from 'node:assert/strict';
import { test } from 'node:test';

import { displayedOrderStatus, estimatedReadyAt } from './orderProgress.ts';

const created = '2026-11-19T09:00:00.000Z';
const at = (minutes: number) => new Date(new Date(created).getTime() + minutes * 60_000);

test('the estimate moves received, preparing, ready as the shop time passes', () => {
  const order = { status: 'pending' as const, created_at: created };
  assert.equal(displayedOrderStatus(order, 10, at(0)), 'pending');
  assert.equal(displayedOrderStatus(order, 10, at(2)), 'preparing');
  assert.equal(displayedOrderStatus(order, 10, at(10)), 'ready');
});

test('without a shop time it defaults to 5 minutes', () => {
  const order = { status: 'pending' as const, created_at: created };
  assert.equal(displayedOrderStatus(order, null, at(4)), 'preparing');
  assert.equal(displayedOrderStatus(order, undefined, at(5)), 'ready');
  assert.equal(estimatedReadyAt(created).toISOString(), '2026-11-19T09:05:00.000Z');
});

test('a status set early by staff is never shown as less than it is', () => {
  assert.equal(displayedOrderStatus({ status: 'ready', created_at: created }, 10, at(0)), 'ready');
  assert.equal(displayedOrderStatus({ status: 'preparing', created_at: created }, 10, at(0)), 'preparing');
});

test('completed and cancelled orders are shown as they are', () => {
  assert.equal(displayedOrderStatus({ status: 'cancelled', created_at: created }, 5, at(30)), 'cancelled');
  assert.equal(displayedOrderStatus({ status: 'completed', created_at: created }, 5, at(0)), 'completed');
});
