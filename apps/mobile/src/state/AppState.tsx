import { createContext, useCallback, useContext, useMemo, useReducer, useState, type ReactNode } from 'react';

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
  const [order, setOrder] = useState<PlacedOrder | null>(null);

  const placeOrder = useCallback((next: PlacedOrder) => {
    setOrder(next);
    dispatch({ type: 'clear' });
  }, []);
  const setOrderStatus = useCallback(
    (status: OrderStatus) => setOrder((o) => (o ? { ...o, status } : o)),
    [],
  );
  const signOut = useCallback(() => setSession(null), []);

  const value = useMemo<AppState>(
    () => ({ cart, dispatch, session, signIn: setSession, signOut, order, placeOrder, setOrderStatus }),
    [cart, session, order, signOut, placeOrder, setOrderStatus],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppState must be used inside <AppStateProvider>.');
  return ctx;
}
