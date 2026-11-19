import { isUuid } from '@mibarra/shared';

import { SHOPS } from '../data/mock';
import { useShop } from './useShops';

export interface CartShop {
  id: string;
  name: string;
  /** True for shops read from Supabase: their orders go to `place-order`. */
  live: boolean;
  /** Usual minutes the shop takes to prepare an order (live shops only). */
  prepMinutes?: number;
}

/** The shop the cart belongs to: a sample shop, or a real one read from Supabase. */
export function useCartShop(shopId: string | null): { shop: CartShop | null; loading: boolean } {
  const live = shopId && isUuid(shopId) ? shopId : undefined;
  const [loaded] = useShop(live);
  if (!shopId) return { shop: null, loading: false };
  if (!live) {
    const sample = SHOPS.find((s) => s.id === shopId);
    return { shop: sample ? { id: sample.id, name: sample.name, live: false } : null, loading: false };
  }
  if (loaded.status === 'loading') return { shop: null, loading: true };
  // If the shop cannot be read right now, keep the cart usable; place-order checks the shop again.
  if (loaded.status === 'error') return { shop: { id: live, name: '', live: true }, loading: false };
  return { shop: loaded.data ? { id: loaded.data.id, name: loaded.data.name, live: true, prepMinutes: loaded.data.prep_minutes } : null, loading: false };
}
