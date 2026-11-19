import { cancelOrder } from '@mibarra/shared';
import { router } from 'expo-router';
import { useRef, useState } from 'react';

import { useAppState } from '../state/AppState';
import { supabase } from './supabase';

// Cancel action shared by the phone and web tracking screens.
// Orders of real shops are cancelled in the database (`cancel_order`, which refuses once the shop
// started preparing). Sample-shop orders only exist on this device, so they are cancelled locally.
export function useCancelOrder() {
  const { order, setOrderStatus } = useAppState();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guards against double taps; cancelling twice is also safe on the server.
  const busy = useRef(false);

  const cancel = async () => {
    if (busy.current || !order) return;
    busy.current = true;
    setCancelling(true);
    setError(null);
    try {
      if (order.orderId) await cancelOrder(supabase, order.orderId);
      // TODO(return action): once the order is cancelled, start the return/refund action for card
      // payments (see refund_order and docs/access-control.md). Nothing is charged yet, so nothing to return.
      setOrderStatus('cancelled');
      router.replace({ pathname: '/cancelled', params: { by: 'cliente' } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos cancelar el pedido. Inténtalo de nuevo.');
    } finally {
      busy.current = false;
      setCancelling(false);
    }
  };

  return { cancel: () => void cancel(), cancelling, error };
}
