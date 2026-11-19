import { displayedOrderStatus, getOrder, type Order } from '@mibarra/shared';
import { useEffect, useRef } from 'react';

import { useAppState, type OrderStatus } from '../state/AppState';
import { toTrackingStatus } from './orderStatus';
import { supabase } from './supabase';

const REFRESH_MS = 15_000;
const ORDER: OrderStatus[] = ['received', 'preparing', 'ready'];
// Sample shops have no server: their order moves on a short demo timer.
const DEMO_ADVANCE_MS: Partial<Record<OrderStatus, number>> = { received: 6000, preparing: 8000 };

/**
 * Keeps the tracked order's status moving. For orders in a real shop it reads the status from
 * the server every few seconds and shows the later of that and a time-based estimate (shop prep
 * time, 5 minutes by default), so a status staff set early wins. A failed refresh keeps the last status.
 */
export function useOrderProgress(): void {
  const { order, setOrderStatus } = useAppState();
  const status = order?.status;
  const orderId = order?.orderId;
  const placedAt = order?.placedAt;
  const prepMinutes = order?.prepMinutes;
  const serverStatus = useRef<Order['status']>('pending');
  // A cancelled order must not be moved again by a late refresh.
  const cancelled = useRef(false);
  useEffect(() => {
    cancelled.current = status === 'cancelled';
  }, [status]);

  useEffect(() => {
    if (!orderId || !placedAt) return;
    serverStatus.current = 'pending';
    const update = () => {
      if (cancelled.current) return;
      const next = toTrackingStatus(displayedOrderStatus({ status: serverStatus.current, created_at: placedAt }, prepMinutes));
      setOrderStatus(next);
    };
    const refresh = () =>
      getOrder(supabase, orderId).then((found) => {
        if (found) serverStatus.current = found.status;
        update();
      }, update);
    void refresh();
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [orderId, placedAt, prepMinutes, setOrderStatus]);

  useEffect(() => {
    const delay = !orderId && status ? DEMO_ADVANCE_MS[status] : undefined;
    if (!status || delay === undefined) return;
    const timer = setTimeout(() => setOrderStatus(ORDER[ORDER.indexOf(status) + 1]!), delay);
    return () => clearTimeout(timer);
  }, [orderId, status, setOrderStatus]);
}
