// Pure state transitions for the dashboard UI. No React, so they are easy to test.
// The UI currently runs on mock data (see src/mock); these rules mirror the design handoff.

export const STAMPS_PER_CARD = 8;

export type LiveStatus = 'pending' | 'preparing' | 'ready';

export interface OrderLine {
  main: string;
  opts: string;
}

export interface DashOrder {
  id: string;
  name: string;
  pickup: string;
  status: LiveStatus;
  paid: boolean;
  lines: OrderLine[];
  note: string;
}

/** An order row from the database with its lines (item names come from `menu_items`). */
export interface ServerOrder {
  id: string;
  status: string;
  pickup_time: string | null;
  payment_status: string;
  note: string | null;
  created_at: string;
  order_items: { quantity: number; chosen_options: { name: string }[] | null; menu_items: { name: string } | null }[];
}

/** Short code shown to staff and said by the customer, e.g. `3F1C` (same as the customer app without the `#`). */
export function shortOrderCode(orderId: string): string {
  return orderId.replace(/-/g, '').slice(0, 4).toUpperCase();
}

/** Turns database orders into dashboard cards. Completed and cancelled orders leave the board. */
export function toDashOrders(rows: readonly ServerOrder[], pickupLabel: (iso: string) => string): DashOrder[] {
  return rows.flatMap((r) => {
    if (r.status !== 'pending' && r.status !== 'preparing' && r.status !== 'ready') return [];
    return [{
      id: r.id,
      name: `Pedido ${shortOrderCode(r.id)}`,
      pickup: r.pickup_time ? pickupLabel(r.pickup_time) : 'lo antes posible',
      status: r.status,
      paid: r.payment_status === 'paid',
      lines: r.order_items.map((i) => ({
        main: `${i.quantity} × ${i.menu_items?.name ?? 'Producto'}`,
        opts: (i.chosen_options ?? []).map((o) => o.name).join(' · '),
      })),
      note: r.note ?? '',
    }];
  });
}

export const CANCEL_REASONS = [
  'Se agotó un producto',
  'Estamos muy llenos',
  'Vamos a cerrar pronto',
  'Otro motivo',
] as const;

const NEXT: Record<LiveStatus, LiveStatus | 'completed'> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'completed',
};

/** Moves an order one step forward. A `ready` order is collected and leaves the board. */
export function advanceOrder(orders: readonly DashOrder[], id: string): DashOrder[] {
  return orders.flatMap((o) => {
    if (o.id !== id) return [o];
    const next = NEXT[o.status];
    return next === 'completed' ? [] : [{ ...o, status: next }];
  });
}

export function markPaid(orders: readonly DashOrder[], id: string): DashOrder[] {
  return orders.map((o) => (o.id === id ? { ...o, paid: true } : o));
}

/** Cancelling is only allowed before the order is ready (no stamp, no charge). */
export function canCancel(order: Pick<DashOrder, 'status'>): boolean {
  return order.status !== 'ready';
}

export function cancelOrder(orders: readonly DashOrder[], id: string): DashOrder[] {
  return orders.filter((o) => o.id !== id || !canCancel(o));
}

export function countUnpaid(orders: readonly DashOrder[]): number {
  return orders.filter((o) => !o.paid).length;
}

export function ordersWithStatus(orders: readonly DashOrder[], status: LiveStatus): DashOrder[] {
  return orders.filter((o) => o.status === status);
}

/** Adds one stamp for an in-store purchase. A full card stays full until redeemed. */
export function addStamp(count: number): number {
  return Math.min(STAMPS_PER_CARD, Math.max(0, count) + 1);
}

export function isCardFull(count: number): boolean {
  return count >= STAMPS_PER_CARD;
}

/** Redeeming resets a full card to 0; a card that is not full is left unchanged. */
export function redeem(count: number): number {
  return isCardFull(count) ? 0 : count;
}

export function toggleSoldOut(sold: Readonly<Record<string, boolean>>, productId: string): Record<string, boolean> {
  return { ...sold, [productId]: !sold[productId] };
}

export function countSoldOut(sold: Readonly<Record<string, boolean>>): number {
  return Object.values(sold).filter(Boolean).length;
}

/** Formats whole lempiras for the UI, e.g. `L 2,840.00`. */
export function formatLempiras(amount: number, decimals = 2): string {
  if (!Number.isFinite(amount)) throw new RangeError(`Amount must be a finite number, got ${amount}.`);
  const parts = amount.toFixed(decimals).split('.');
  const whole = (parts[0] ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `L ${whole}${parts[1] ? `.${parts[1]}` : ''}`;
}
