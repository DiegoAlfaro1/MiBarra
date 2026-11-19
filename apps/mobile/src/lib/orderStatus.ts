import type { OrderStatus as DbStatus } from '@mibarra/shared';

import type { OrderStatus } from '../state/AppState.ts';

/** The customer app calls the first step "received"; the database calls it "pending". */
export function toTrackingStatus(status: DbStatus): OrderStatus {
  if (status === 'pending') return 'received';
  if (status === 'completed') return 'ready';
  return status;
}
