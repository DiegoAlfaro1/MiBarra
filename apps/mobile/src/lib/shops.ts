import type { MockProduct, MockShop } from '../data/mock.ts';

export type ShopFilter = 'all' | 'open' | 'near';

export const SHOP_FILTERS: readonly { id: ShopFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'open', label: 'Abiertas ahora' },
  { id: 'near', label: 'Más cerca' },
];

const distance = (shop: MockShop) => {
  const km = Number.parseFloat(shop.distanceKm);
  return Number.isFinite(km) ? km : Number.POSITIVE_INFINITY;
};

/**
 * Search + filter for the shop list. Every open shop serves the same sample menu,
 * so a drink-name match lists the open shops.
 */
export function filterShops(
  shops: readonly MockShop[],
  products: readonly MockProduct[],
  filter: ShopFilter,
  query: string,
): MockShop[] {
  const q = query.trim().toLowerCase();
  let result = [...shops];
  if (q) {
    const drinkMatch = products.some((p) => p.name.toLowerCase().includes(q));
    result = result.filter(
      (s) => s.name.toLowerCase().includes(q) || s.area.toLowerCase().includes(q) || (drinkMatch && s.open),
    );
  }
  if (filter === 'open') result = result.filter((s) => s.open);
  if (filter === 'near') result.sort((a, b) => distance(a) - distance(b));
  return result;
}
