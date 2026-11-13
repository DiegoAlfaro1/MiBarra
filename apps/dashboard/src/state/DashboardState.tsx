import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { advanceOrder, cancelOrder, markPaid, toggleSoldOut, type DashOrder } from '../logic/dashboard.ts';
import { INITIAL_ORDERS, INITIAL_SOLD_OUT } from '../mock/data.ts';

interface DashboardState {
  open: boolean;
  setOpen: (open: boolean) => void;
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
  const [open, setOpen] = useState(true);
  const [alertVisible, setAlert] = useState(true);
  const [orders, setOrders] = useState<DashOrder[]>(INITIAL_ORDERS);
  const [soldOut, setSoldOut] = useState(INITIAL_SOLD_OUT);

  const value = useMemo<DashboardState>(
    () => ({
      open, setOpen, alertVisible, dismissAlert: () => setAlert(false), orders,
      advance: (id) => setOrders((o) => advanceOrder(o, id)),
      pay: (id) => setOrders((o) => markPaid(o, id)),
      cancel: (id) => setOrders((o) => cancelOrder(o, id)),
      soldOut, toggleProduct: (id) => setSoldOut((s) => toggleSoldOut(s, id)),
    }),
    [open, alertVisible, orders, soldOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboard(): DashboardState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDashboard must be used inside <DashboardProvider>.');
  return v;
}
