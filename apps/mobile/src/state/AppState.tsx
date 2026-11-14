import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';

import { sessionFromUser, type AppSession } from '../lib/access.ts';
import { supabase } from '../lib/supabase';
import { cartReducer, emptyCart, type CartAction, type CartLine, type CartState } from '../lib/cart.ts';

export type OrderStatus = 'received' | 'preparing' | 'ready' | 'cancelled';

export interface PlacedOrder {
  code: string;
  shopId: string;
  shopName: string;
  lines: CartLine[];
  totalCents: number;
  pickupLabel: string;
  payment: 'counter' | 'card';
  status: OrderStatus;
}

export type Session = AppSession;

interface AppState {
  cart: CartState;
  dispatch: (action: CartAction) => void;
  session: Session | null;
  /** Starts the no-account guest session (a real account session comes from Supabase Auth). */
  startGuest: (name: string) => void;
  signOut: () => void;
  order: PlacedOrder | null;
  placeOrder: (order: PlacedOrder) => void;
  setOrderStatus: (status: OrderStatus) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, emptyCart);
  const [account, setAccount] = useState<Session | null>(null);
  const [guest, setGuest] = useState<Session | null>(null);

  // The account session lives in Supabase Auth (persisted); mirror it here.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => active && setAccount(sessionFromUser(data.session?.user)));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setAccount(sessionFromUser(next?.user)));
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  const [order, setOrder] = useState<PlacedOrder | null>(null);

  const placeOrder = useCallback((next: PlacedOrder) => {
    setOrder(next);
    dispatch({ type: 'clear' });
  }, []);
  const setOrderStatus = useCallback(
    (status: OrderStatus) => setOrder((o) => (o ? { ...o, status } : o)),
    [],
  );
  const startGuest = useCallback((name: string) => setGuest({ name, guest: true }), []);
  const signOut = useCallback(() => {
    setGuest(null);
    setAccount(null);
    void supabase.auth.signOut();
  }, []);
  const session = account ?? guest;

  const value = useMemo<AppState>(
    () => ({ cart, dispatch, session, startGuest, signOut, order, placeOrder, setOrderStatus }),
    [cart, session, order, startGuest, signOut, placeOrder, setOrderStatus],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppState must be used inside <AppStateProvider>.');
  return ctx;
}
