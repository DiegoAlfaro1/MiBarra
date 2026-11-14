import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';

import { closeSession, restoreSession } from '../lib/auth.ts';
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

export interface Session {
  name: string;
}

interface AppState {
  cart: CartState;
  dispatch: (action: CartAction) => void;
  session: Session | null;
  /** False until a stored session has been checked on app start. */
  sessionReady: boolean;
  signIn: (session: Session) => void;
  signOut: () => void;
  order: PlacedOrder | null;
  placeOrder: (order: PlacedOrder) => void;
  setOrderStatus: (status: OrderStatus) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, emptyCart);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [order, setOrder] = useState<PlacedOrder | null>(null);

  const placeOrder = useCallback((next: PlacedOrder) => {
    setOrder(next);
    dispatch({ type: 'clear' });
  }, []);
  const setOrderStatus = useCallback(
    (status: OrderStatus) => setOrder((o) => (o ? { ...o, status } : o)),
    [],
  );
  const signOut = useCallback(() => {
    setSession(null);
    void closeSession().catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    void restoreSession().then((restored) => {
      if (!active) return;
      if (restored) setSession(restored);
      setSessionReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AppState>(
    () => ({ cart, dispatch, session, sessionReady, signIn: setSession, signOut, order, placeOrder, setOrderStatus }),
    [cart, session, sessionReady, order, signOut, placeOrder, setOrderStatus],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppState must be used inside <AppStateProvider>.');
  return ctx;
}
