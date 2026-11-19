import { advanceOrder as advanceServerOrder, cancelOrder as cancelServerOrder, getShop, isTakingOrders, markOrderPaid, setShopOpen, ShopOpenError, slotClockLabel, type OrderStatus, type Shop } from '@mibarra/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { advanceOrder, cancelOrder, markPaid, toDashOrders, toggleSoldOut, type DashOrder, type ServerOrder } from '../logic/dashboard.ts';
import { supabase } from '../lib/supabase.ts';
import { INITIAL_ORDERS, INITIAL_SOLD_OUT } from '../mock/data.ts';
import { useAuth } from './AuthState.tsx';

interface DashboardState {
  /** True when the shop takes orders now: switch on and inside working hours. */
  open: boolean;
  /** False until the shop has been loaded; the switch is disabled meanwhile. */
  shopReady: boolean;
  /** Turns ordering on or off. Resolves with an error message to show, or null on success. */
  setOpen: (open: boolean) => Promise<string | null>;
  alertVisible: boolean;
  dismissAlert: () => void;
  orders: DashOrder[];
  /** Set when real orders could not be loaded or a change could not be saved; shown above the board. */
  ordersError: string | null;
  advance: (id: string) => void;
  pay: (id: string) => void;
  cancel: (id: string) => void;
  soldOut: Record<string, boolean>;
  toggleProduct: (id: string) => void;
}

const Ctx = createContext<DashboardState | null>(null);

/** Holds the mock dashboard state so it survives switching between screens. */
export function DashboardProvider({ children }: { children: ReactNode }) {
  const { access } = useAuth();
  const shopId = access?.shopId ?? null;
  const [shop, setShop] = useState<Shop | null>(null);
  // Re-evaluated every 30s so the switch drops by itself when working hours end.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!shopId) return;
    let active = true;
    getShop(supabase, shopId).then((found) => active && setShop(found), () => undefined);
    return () => {
      active = false;
    };
  }, [shopId]);
  const open = shop ? isTakingOrders(shop, now) : false;
  const setOpen = useCallback(
    async (next: boolean) => {
      if (!shopId) return 'No pudimos cambiar el estado de la tienda. Inténtalo de nuevo.';
      try {
        setShop(await setShopOpen(supabase, shopId, next));
        return null;
      } catch (error) {
        return error instanceof ShopOpenError ? error.message : 'No pudimos cambiar el estado de la tienda. Inténtalo de nuevo.';
      }
    },
    [shopId],
  );
  const [alertVisible, setAlert] = useState(true);
  // A signed-in shop sees its real orders; without a shop (local demo) the sample orders stay.
  const [orders, setOrders] = useState<DashOrder[]>(shopId ? [] : INITIAL_ORDERS);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const loadOrders = useCallback(async () => {
    if (!shopId) return;
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, pickup_time, payment_status, note, created_at, order_items(quantity, chosen_options, menu_items(name))')
      .eq('shop_id', shopId)
      .in('status', ['pending', 'preparing', 'ready'])
      .order('created_at', { ascending: true });
    if (error) {
      setOrdersError('No pudimos cargar los pedidos. Revisa tu conexión; lo intentaremos de nuevo.');
      return;
    }
    setOrdersError(null);
    setOrders(toDashOrders((data ?? []) as unknown as ServerOrder[], slotClockLabel));
  }, [shopId]);
  useEffect(() => {
    if (!shopId) return;
    const first = setTimeout(() => void loadOrders(), 0);
    const timer = setInterval(() => void loadOrders(), 10_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [shopId, loadOrders]);
  // Runs a change on the server, then reloads so the board always shows what was saved.
  const save = useCallback(
    (change: () => Promise<unknown>) => {
      change().then(
        () => setOrdersError(null),
        () => setOrdersError('No pudimos guardar el cambio. Inténtalo de nuevo.'),
      ).then(() => loadOrders());
    },
    [loadOrders],
  );
  const [soldOut, setSoldOut] = useState(INITIAL_SOLD_OUT);

  const value = useMemo<DashboardState>(
    () => ({
      open, shopReady: shop !== null, setOpen, alertVisible, dismissAlert: () => setAlert(false), orders,
      ordersError,
      advance: (id) => {
        if (!shopId) return setOrders((o) => advanceOrder(o, id));
        const current = orders.find((o) => o.id === id);
        if (current) save(() => advanceServerOrder(supabase, id, current.status as OrderStatus));
      },
      pay: (id) => (shopId ? save(() => markOrderPaid(supabase, id)) : setOrders((o) => markPaid(o, id))),
      cancel: (id) => (shopId ? save(() => cancelServerOrder(supabase, id)) : setOrders((o) => cancelOrder(o, id))),
      soldOut, toggleProduct: (id) => setSoldOut((s) => toggleSoldOut(s, id)),
    }),
    [open, shop, setOpen, alertVisible, orders, ordersError, shopId, save, soldOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboard(): DashboardState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDashboard must be used inside <DashboardProvider>.');
  return v;
}
