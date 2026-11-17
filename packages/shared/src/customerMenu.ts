import type { SupabaseClient } from '@supabase/supabase-js';

import { listMenu, type MenuData } from './menuApi.ts';
import { isUuid } from './orders.ts';
import type { ItemOption, MenuCategory, MenuItem } from './types.ts';

/**
 * The menu as customers see it: categories with their items, and the size and extra choices of an
 * item. Data comes from the same tables the owner edits (RLS hides suspended shops, see
 * docs/access-control.md); prices are always recomputed by `place_order` on the server.
 */

export interface MenuSection {
  category: MenuCategory;
  items: MenuItem[];
}

const byOrderThenName = (a: MenuCategory, b: MenuCategory) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'es');

/**
 * Categories in the owner's order, each with its in-stock items by name (see `isItemSoldOut`).
 * Empty categories are left out.
 */
export function menuSections(data: MenuData): MenuSection[] {
  return [...data.categories]
    .sort(byOrderThenName)
    .map((category) => ({
      category,
      items: data.items
        .filter((item) => item.category_id === category.id && !isItemSoldOut(item, data.options))
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    }))
    .filter((section) => section.items.length > 0);
}

export interface ItemChoices {
  /** Pick exactly one when the list is not empty. */
  sizes: ItemOption[];
  /** Pick any. */
  extras: ItemOption[];
}

const byPriceThenName = (a: ItemOption, b: ItemOption) =>
  a.price_change_cents - b.price_change_cents || a.name.localeCompare(b.name, 'es');

/**
 * The options a customer can choose for one item (sold-out options are left out unless
 * `includeSoldOut`, which the dashboard uses to list everything the owner created).
 */
export function itemChoices(options: readonly ItemOption[], itemId: string, { includeSoldOut = false } = {}): ItemChoices {
  const mine = options.filter((o) => o.item_id === itemId && (includeSoldOut || o.available));
  return {
    sizes: mine.filter((o) => o.kind === 'size').sort(byPriceThenName),
    extras: mine.filter((o) => o.kind === 'extra').sort(byPriceThenName),
  };
}

/**
 * True when customers cannot order the item: it is marked sold out, or it has sizes and every
 * one of them is sold out (a size is required, so there is nothing left to pick).
 * `place_order` enforces the same rule (see `check_order_item_size`).
 */
export function isItemSoldOut(item: Pick<MenuItem, 'id' | 'available'>, options: readonly ItemOption[]): boolean {
  if (!item.available) return true;
  const sizes = options.filter((o) => o.item_id === item.id && o.kind === 'size');
  return sizes.length > 0 && sizes.every((s) => !s.available);
}

/** Starts with the cheapest size and no extras. */
export function defaultOptionIds(choices: ItemChoices): string[] {
  return choices.sizes[0] ? [choices.sizes[0].id] : [];
}

/** Choosing a size replaces the previous size; an extra is switched on or off. Unknown ids are ignored. */
export function toggleOption(choices: ItemChoices, chosen: readonly string[], optionId: string): string[] {
  if (choices.sizes.some((s) => s.id === optionId)) {
    const sizeIds = new Set(choices.sizes.map((s) => s.id));
    return [optionId, ...chosen.filter((id) => !sizeIds.has(id))];
  }
  if (choices.extras.some((e) => e.id === optionId)) {
    return chosen.includes(optionId) ? chosen.filter((id) => id !== optionId) : [...chosen, optionId];
  }
  return [...chosen];
}

/** A user-facing problem with the chosen options, or null when they can be ordered. */
export function optionChoiceError(choices: ItemChoices, chosen: readonly string[]): string | null {
  const known = new Set([...choices.sizes, ...choices.extras].map((o) => o.id));
  if (chosen.some((id) => !known.has(id))) return 'Una de las opciones ya no está disponible. Elige otra.';
  if (new Set(chosen).size !== chosen.length) return 'Elegiste la misma opción dos veces.';
  const sizes = chosen.filter((id) => choices.sizes.some((s) => s.id === id));
  if (choices.sizes.length && sizes.length !== 1) return 'Elige un tamaño.';
  return null;
}

function chosenOptions(choices: ItemChoices, chosen: readonly string[]): ItemOption[] {
  const all = [...choices.sizes, ...choices.extras];
  return all.filter((o) => chosen.includes(o.id));
}

/** Price of one unit with the chosen options, in cents. */
export function unitPriceWithOptions(item: Pick<MenuItem, 'price_cents'>, choices: ItemChoices, chosen: readonly string[]): number {
  return chosenOptions(choices, chosen).reduce((sum, o) => sum + o.price_change_cents, item.price_cents);
}

/** e.g. `Grande 16 oz · Sirope de vainilla`; the item description when nothing is chosen. */
export function describeOptions(item: Pick<MenuItem, 'description'>, choices: ItemChoices, chosen: readonly string[]): string {
  const names = chosenOptions(choices, chosen).map((o) => o.name);
  return names.length ? names.join(' · ') : (item.description ?? '');
}

/** Cart lines whose item is no longer in stock (hidden, marked sold out or every size sold out) in the freshly loaded menu. */
export function soldOutLines<T extends { productId: string; name: string }>(lines: readonly T[], menu: Pick<MenuData, 'items' | 'options'>): T[] {
  const inStock = new Set(menu.items.filter((i) => !isItemSoldOut(i, menu.options)).map((i) => i.id));
  return lines.filter((l) => !inStock.has(l.productId));
}

export function soldOutMessage(names: readonly string[]): string {
  const list = [...new Set(names)].join(', ');
  return names.length > 1
    ? `Estos productos se agotaron y los quitamos de tu carrito: ${list}. Revisa tu pedido antes de continuar.`
    : `${list} se agotó y lo quitamos de tu carrito. Revisa tu pedido antes de continuar.`;
}

export class MenuReadError extends Error {
  constructor(message = 'No pudimos cargar el menú. Revisa tu conexión e inténtalo de nuevo.') {
    super(message);
    this.name = 'MenuReadError';
  }
}

export interface MenuItemDetail {
  item: MenuItem;
  options: ItemOption[];
}

/** One item and its options; null when it does not exist or its shop is hidden. */
export async function getMenuItem(client: Pick<SupabaseClient, 'from'>, itemId: string): Promise<MenuItemDetail | null> {
  if (!isUuid(itemId)) return null;
  const item = await client.from('menu_items').select('*').eq('id', itemId).maybeSingle();
  if (item.error) throw new MenuReadError();
  if (!item.data) return null;
  const options = await client.from('item_options').select('*').eq('item_id', itemId);
  if (options.error) throw new MenuReadError();
  return { item: item.data as MenuItem, options: (options.data ?? []) as ItemOption[] };
}

/** The whole menu of one shop for customers. Read errors get a message about loading, not saving. */
export async function loadShopMenu(client: Pick<SupabaseClient, 'from' | 'rpc'>, shopId: string): Promise<MenuData> {
  if (!isUuid(shopId)) return { categories: [], items: [], options: [] };
  try {
    return await listMenu(client, shopId);
  } catch {
    throw new MenuReadError();
  }
}
