import type { OrderStatus } from './types.ts';

/** Minutes a shop takes to prepare an order when it has not set its own time. */
export const DEFAULT_PREP_MINUTES = 5;

/** An order is "received" for this long before the estimate moves it to "preparing". */
export const RECEIVED_MINUTES = 1;

const RANK: Record<OrderStatus, number> = { pending: 0, preparing: 1, ready: 2, completed: 3, cancelled: 4 };

function prepMinutesOrDefault(prepMinutes: number | null | undefined): number {
  return prepMinutes && prepMinutes > 0 ? prepMinutes : DEFAULT_PREP_MINUTES;
}

/** When the order is expected to be ready: `created_at` plus the shop's preparation time. */
export function estimatedReadyAt(createdAt: string, prepMinutes?: number | null): Date {
  return new Date(new Date(createdAt).getTime() + prepMinutesOrDefault(prepMinutes) * 60_000);
}

/**
 * The status to show the customer. It is an estimate from the time passed since the order was
 * placed (received, then preparing, then ready after the shop's preparation time), but it never
 * shows less than the real status: when staff move an order early, that wins. Completed and
 * cancelled orders are always shown as they are.
 */
export function displayedOrderStatus(
  order: { status: OrderStatus; created_at: string },
  prepMinutes: number | null | undefined,
  now: Date = new Date(),
): OrderStatus {
  if (order.status === 'completed' || order.status === 'cancelled') return order.status;
  const prep = prepMinutesOrDefault(prepMinutes);
  const elapsed = (now.getTime() - new Date(order.created_at).getTime()) / 60_000;
  const estimated: OrderStatus = elapsed >= prep ? 'ready' : elapsed >= Math.min(RECEIVED_MINUTES, prep / 2) ? 'preparing' : 'pending';
  return RANK[estimated] > RANK[order.status] ? estimated : order.status;
}
