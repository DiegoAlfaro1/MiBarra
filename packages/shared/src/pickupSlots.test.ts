import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { listPickupSlots, slotClockLabel, slotsFromRows } from './pickupSlots.ts';

describe('pickup slots', () => {
  it('maps database rows and handles an empty list', () => {
    assert.deepEqual(slotsFromRows([{ slot_start: '2026-11-18T15:20:00Z' }]), [
      { start: '2026-11-18T15:20:00Z' },
    ]);
    assert.deepEqual(slotsFromRows(null), []);
  });

  it('formats clock labels in Spanish', () => {
    assert.equal(slotClockLabel(new Date(2026, 10, 18, 9, 20).toISOString()), '9:20 a. m.');
    assert.equal(slotClockLabel(new Date(2026, 10, 18, 12, 0).toISOString()), '12:00 p. m.');
    assert.equal(slotClockLabel(new Date(2026, 10, 18, 0, 5).toISOString()), '12:05 a. m.');
  });

  it('turns a failed request into a user-facing error', async () => {
    const client = { rpc: async () => ({ data: null, error: { message: 'boom' } }) } as never;
    await assert.rejects(listPickupSlots(client, 'x'), /No pudimos cargar los horarios/);
  });
});
