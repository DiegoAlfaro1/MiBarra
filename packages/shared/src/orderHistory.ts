import type { SupabaseClient } from '@supabase/supabase-js';

import { itemChoices, isItemSoldOut, optionChoiceError, unitPriceWithOptions } from './customerMenu.ts';
import type { MenuData } from './menuApi.ts';
import { OrderingError } from './ordering.ts';
import type { Order, OrderItem } from './types.ts';

/**
 * Order history for customers: past orders with item names, the personalization chosen for each
 * line (a snapshot taken when the order was placed) and prices, plus the plan for "order again".
 * Rows are limited to the owner by RLS (see docs/access-control.md); prices of a reorder are
 * always recomputed by `place_order` on the server.
 */

export interface HistoryItem extends OrderItem {
  menu_items: { name: string } | null;
}

export interface HistoryOrder extends Order {
  shops: { name: string } | null;
  order_items: HistoryItem[];
}

export const HISTORY_LOAD_ERROR = 'No pudimos cargar tus pedidos. Revisa tu conexión e inténtalo de nuevo.';

/** The signed-in customer's orders, newest first, with shop and item names. */
export async function listMyOrderHistory(client: Pick<SupabaseClient, 'from'>, limit = 50): Promise<HistoryOrder[]> {
  const { data, error } = await client
    .from('orders')
    .select('*, shops(name), order_items(*, menu_items(name))')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new OrderingError(HISTORY_LOAD_ERROR);
  return ((data ?? []) as HistoryOrder[]).map((o) => ({
    ...o,
    order_items: [...(o.order_items ?? [])].sort((a, b) => (a.menu_items?.name ?? '').localeCompare(b.menu_items?.name ?? '', 'es')),
  }));
}

export interface ReorderLine {
  productId: string;
  name: string;
  optionIds: string[];
  /** Names of the chosen options, e.g. `Grande · Sirope de vainilla`. */
  optionsLabel: string;
  quantity: number;
  /** Today's price of one unit (it may differ from what was paid). */
  unitCents: number;
}

export interface ReorderPlan {
  lines: ReorderLine[];
  /** Names of the products that cannot be ordered again (sold out, removed or an option is gone). */
  skipped: string[];
}

/**
 * What "order again" puts in the cart: every line of the past order whose item and chosen options
 * are still available in the current menu. The rest is reported in `skipped` so the customer can be told.
 */
export function planReorder(order: Pick<HistoryOrder, 'order_items'>, menu: Pick<MenuData, 'items' | 'options'>): ReorderPlan {
  const lines: ReorderLine[] = [];
  const skipped: string[] = [];
  for (const line of order.order_items) {
    const item = menu.items.find((i) => i.id === line.item_id);
    const name = item?.name ?? line.menu_items?.name ?? 'Producto';
    if (!item || isItemSoldOut(item, menu.options)) {
      skipped.push(name);
      continue;
    }
    const choices = itemChoices(menu.options, item.id);
    const optionIds = line.chosen_options.map((o) => o.id);
    if (optionChoiceError(choices, optionIds)) {
      skipped.push(name);
      continue;
    }
    const chosen = line.chosen_options.map((o) => o.name);
    lines.push({
      productId: item.id,
      name: item.name,
      optionIds,
      optionsLabel: chosen.length ? chosen.join(' · ') : (item.description ?? ''),
      quantity: line.quantity,
      unitCents: unitPriceWithOptions(item, choices, optionIds),
    });
  }
  return { lines, skipped };
}
