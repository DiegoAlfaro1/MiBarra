import type { MockShop, PastOrder } from '../data/mock.ts';

export type StampCardTone = 'accent' | 'reward' | 'plain';

export interface StampCardView {
  shopId: string;
  name: string;
  count: string;
  /** Fill percentage, clamped to 0–100. */
  percent: number;
  note: string;
  tone: StampCardTone;
}

/** One stamp card per shop: the first (home) shop is highlighted, full cards show the reward. */
export function stampCards(shops: readonly MockShop[], homeShopId: string): StampCardView[] {
  return shops.map((s) => {
    const goal = Math.max(1, s.stampGoal);
    const stamps = Math.min(Math.max(0, s.stamps), goal);
    const left = goal - stamps;
    const complete = left === 0;
    return {
      shopId: s.id,
      name: s.name,
      count: `${stamps}/${goal}`,
      percent: Math.round((stamps / goal) * 100),
      note: complete
        ? '¡Recompensa lista! Muestra tu código en caja.'
        : `${left} ${left === 1 ? 'pedido más' : 'pedidos más'} para una bebida gratis`,
      tone: complete ? 'reward' : s.id === homeShopId ? 'accent' : 'plain',
    };
  });
}

export interface OrderRowView {
  id: string;
  date: string;
  shop: string;
  items: string;
  totalCents: number;
  status: string;
  tone: 'success' | 'danger' | 'warning';
  action: 'track' | 'reorder' | 'detail';
}

export function pastOrderRow(o: PastOrder): OrderRowView {
  const done = o.status === 'completed';
  return {
    id: o.id,
    date: o.date,
    shop: o.shop,
    items: o.items,
    totalCents: o.totalCents,
    status: done ? 'Recogido · +1 sello' : 'Cancelado',
    tone: done ? 'success' : 'danger',
    action: done ? 'reorder' : 'detail',
  };
}
