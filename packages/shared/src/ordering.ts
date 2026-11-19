import type { SupabaseClient } from '@supabase/supabase-js';

import type { Order, OrderItem, OrderStatus } from './types.ts';

/**
 * Ordering module foundation. Shared contract for the order stories (tracking, history,
 * cancel, live orders, mark paid, refund). `placeOrder` lives in `orders.ts`, pickup slots in
 * `pickupSlots.ts`. Every story adds its UI in its own app files and calls these functions
 * instead of talking to the `orders` table directly. Messages are Spanish and can be shown as-is.
 *
 * Who may do what is enforced by the database (RLS and the SQL functions), see docs/access-control.md.
 */

type OrderingClient = Pick<SupabaseClient, 'from' | 'rpc'>;

export class OrderingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderingError';
  }
}

/** An order with its lines, as shown on tracking and history screens. */
export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

/** The next status in the normal flow `pending → preparing → ready → completed`; null when there is none. */
export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  switch (status) {
    case 'pending':
      return 'preparing';
    case 'preparing':
      return 'ready';
    case 'ready':
      return 'completed';
    default:
      return null;
  }
}

/** Orders still in progress (not completed or cancelled). */
export function isActiveOrder(order: Pick<Order, 'status'>): boolean {
  return order.status === 'pending' || order.status === 'preparing' || order.status === 'ready';
}

/** Customers can cancel only before preparation starts; staff rules are checked by `cancel_order`. */
export function canCustomerCancel(order: Pick<Order, 'status'>): boolean {
  return order.status === 'pending';
}

function failure(error: { code?: string; message?: string }, fallback: string): OrderingError {
  if (error.code === '28000') return new OrderingError('Tu sesión expiró. Vuelve a iniciar sesión.');
  if (error.code === '42501' && /being prepared/i.test(error.message ?? '')) {
    return new OrderingError('La cafetería ya empezó a preparar tu pedido, así que ya no se puede cancelar.');
  }
  if (error.code === '42501') return new OrderingError('No tienes permiso para hacer esto con este pedido.');
  if (error.code === '22023') return new OrderingError('No encontramos el pedido o ya no se puede cambiar.');
  return new OrderingError(fallback);
}

const LOAD_ERROR = 'No pudimos cargar los pedidos. Revisa tu conexión e inténtalo de nuevo.';
const CHANGE_ERROR = 'No pudimos actualizar el pedido. Revisa tu conexión e inténtalo de nuevo.';

/** The signed-in customer's orders, newest first. Row access is limited to the owner by RLS. */
export async function listMyOrders(client: OrderingClient, limit = 50): Promise<OrderWithItems[]> {
  const { data, error } = await client
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw failure(error, LOAD_ERROR);
  return (data ?? []) as OrderWithItems[];
}

/** One order with its lines, or null when it does not exist or is not visible to the caller. */
export async function getOrder(client: OrderingClient, orderId: string): Promise<OrderWithItems | null> {
  const { data, error } = await client.from('orders').select('*, order_items(*)').eq('id', orderId).maybeSingle();
  if (error) throw failure(error, LOAD_ERROR);
  return (data as OrderWithItems | null) ?? null;
}

/** Orders of a shop for staff, oldest first so the queue reads in arrival order. */
export async function listShopOrders(
  client: OrderingClient,
  shopId: string,
  statuses: readonly OrderStatus[] = ['pending', 'preparing', 'ready'],
): Promise<OrderWithItems[]> {
  const { data, error } = await client
    .from('orders')
    .select('*, order_items(*)')
    .eq('shop_id', shopId)
    .in('status', [...statuses])
    .order('created_at', { ascending: true });
  if (error) throw failure(error, LOAD_ERROR);
  return (data ?? []) as OrderWithItems[];
}

/**
 * Staff move an order one step forward. Only moves from `fromStatus` to the next status, so a
 * double tap or retry cannot skip a step: if the order already moved, nothing changes and the
 * current order is returned.
 */
export async function advanceOrder(client: OrderingClient, orderId: string, fromStatus: OrderStatus): Promise<Order> {
  const next = nextOrderStatus(fromStatus);
  if (!next) throw new OrderingError('Este pedido ya no puede avanzar.');
  const { data, error } = await client
    .from('orders')
    .update({ status: next })
    .eq('id', orderId)
    .eq('status', fromStatus)
    .select()
    .maybeSingle();
  if (error) throw failure(error, CHANGE_ERROR);
  if (data) return data as Order;
  const current = await getOrder(client, orderId);
  if (!current) throw new OrderingError('No encontramos el pedido o ya no se puede cambiar.');
  return current;
}

async function callOrderFunction(
  client: OrderingClient,
  name: 'cancel_order' | 'refund_order' | 'mark_order_paid',
  args: Record<string, unknown>,
): Promise<Order> {
  const { data, error } = await client.rpc(name, args);
  if (error) throw failure(error, CHANGE_ERROR);
  return data as Order;
}

/** Cancels an order (`cancel_order`). Cancelling twice returns the order unchanged. */
export function cancelOrder(client: OrderingClient, orderId: string, reason?: string): Promise<Order> {
  return callOrderFunction(client, 'cancel_order', { p_order_id: orderId, p_reason: reason ?? null });
}

/** Staff mark an order as paid (`mark_order_paid`). Marking twice changes nothing. */
export function markOrderPaid(client: OrderingClient, orderId: string): Promise<Order> {
  return callOrderFunction(client, 'mark_order_paid', { p_order_id: orderId });
}

/** Managers and owners record a refund (`refund_order`). Refunding twice changes nothing. */
export function refundOrder(client: OrderingClient, orderId: string, reason?: string): Promise<Order> {
  return callOrderFunction(client, 'refund_order', { p_order_id: orderId, p_reason: reason ?? null });
}
