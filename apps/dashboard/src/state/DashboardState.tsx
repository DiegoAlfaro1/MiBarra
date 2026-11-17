import { getShop, isTakingOrders, setShopOpen, ShopOpenError, type Shop } from '@mibarra/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { advanceOrder, cancelOrder, markPaid, toggleSoldOut, type DashOrder } from '../logic/dashboard.ts';
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
  const [orders, setOrders] = useState<DashOrder[]>(INITIAL_ORDERS);
  const [soldOut, setSoldOut] = useState(INITIAL_SOLD_OUT);

  const value = useMemo<DashboardState>(
    () => ({
      open, shopReady: shop !== null, setOpen, alertVisible, dismissAlert: () => setAlert(false), orders,
      advance: (id) => setOrders((o) => advanceOrder(o, id)),
      pay: (id) => setOrders((o) => markPaid(o, id)),
      cancel: (id) => setOrders((o) => cancelOrder(o, id)),
      soldOut, toggleProduct: (id) => setSoldOut((s) => toggleSoldOut(s, id)),
    }),
    [open, shop, setOpen, alertVisible, orders, soldOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboard(): DashboardState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDashboard must be used inside <DashboardProvider>.');
  return v;
}
