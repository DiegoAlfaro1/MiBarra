import type { Order } from '@mibarra/shared';
import { useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';

export type LiveOrdersState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; orders: Order[] };

/**
 * Loads a shop's recent orders and keeps them updated with Supabase Realtime.
 * RLS ensures only staff of that shop receive rows.
 */
export function useLiveOrders(shopId: string): LiveOrdersState {
  const [state, setState] = useState<LiveOrdersState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });

    // Changes that arrive before the initial load finishes are buffered, not dropped.
    let loaded = false;
    const buffered: Order[] = [];

    const merge = (orders: Order[], changes: Order[]) => {
      const byId = new Map(orders.map((o) => [o.id, o]));
      for (const change of changes) byId.set(change.id, change);
      return [...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
    };

    const upsert = (order: Order) => {
      if (!loaded) {
        buffered.push(order);
        return;
      }
      setState((prev) => (prev.status === 'ready' ? { status: 'ready', orders: merge(prev.orders, [order]) } : prev));
    };

    const channel = supabase
      .channel(`orders:${shopId}`)
      .on<Order>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `shop_id=eq.${shopId}` },
        (payload) => {
          if (payload.eventType !== 'DELETE') upsert(payload.new);
        },
      )
      .subscribe();

    supabase
      .from('orders')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setState({ status: 'error', message: 'Could not load orders. Check your connection and try again.' });
          return;
        }
        loaded = true;
        setState({ status: 'ready', orders: merge((data ?? []) as Order[], buffered) });
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [shopId]);

  return state;
}
