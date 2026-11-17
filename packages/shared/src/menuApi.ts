import type { SupabaseClient } from '@supabase/supabase-js';

import { validateCategoryInput, validateItemInput, validateOptionInput } from './menuManagement.ts';
import type { CategoryInput, FieldErrors, ItemInput, OptionInput, Validation } from './menuManagement.ts';
import type { ItemOption, MenuCategory, MenuItem } from './types.ts';

/**
 * Data access for the menu management module. Every function talks to Supabase through the
 * client passed in, so the dashboard and tests share the same code. Permissions are enforced by
 * RLS (see docs/access-control.md): managers and owners edit, baristas only toggle sold out.
 */

type MenuClient = Pick<SupabaseClient, 'from' | 'rpc'>;

export interface MenuData {
  categories: MenuCategory[];
  items: MenuItem[];
  options: ItemOption[];
}

export class MenuManagementError extends Error {
  readonly fieldErrors?: FieldErrors<Record<string, unknown>>;
  constructor(message: string, fieldErrors?: FieldErrors<Record<string, unknown>>) {
    super(message);
    this.name = 'MenuManagementError';
    this.fieldErrors = fieldErrors;
  }
}

const GENERIC_ERROR = 'No pudimos guardar los cambios. Revisa tu conexión e inténtalo de nuevo.';
const IN_PAST_ORDERS = 'Este producto aparece en pedidos anteriores. Márcalo como agotado en lugar de borrarlo.';
const DUPLICATE_CATEGORY = 'Ya tienes una categoría con ese nombre.';
const CATEGORY_NOT_EMPTY = 'Esta categoría todavía tiene productos. Muévelos a otra categoría o bórralos primero.';
const DUPLICATE_OPTION = 'Este producto ya tiene una opción con ese nombre.';

function unwrap<T>(result: Validation<T, T>): T {
  if (result.ok) return result.value;
  throw new MenuManagementError('Revisa los campos marcados.', result.errors as FieldErrors<Record<string, unknown>>);
}

function failure(error: { code?: string; message?: string }, stillUsed = IN_PAST_ORDERS, duplicate = DUPLICATE_CATEGORY): MenuManagementError {
  // 23505 = unique violation: category names (per shop) and option names (per item and kind).
  if (error.code === '23505') return new MenuManagementError(duplicate, { name: duplicate });
  // 23503 = foreign key violation: the row is still referenced (an item with past orders, a category with items).
  if (error.code === '23503') return new MenuManagementError(stillUsed);
  // 42501 = RLS or a role check refused the change.
  if (error.code === '42501') {
    return new MenuManagementError('No tienes permiso para cambiar el menú de esta tienda.');
  }
  // 22023 = a message we wrote in SQL for users.
  if (error.code === '22023' && error.message) return new MenuManagementError(error.message);
  return new MenuManagementError(GENERIC_ERROR);
}

export async function listMenu(client: MenuClient, shopId: string): Promise<MenuData> {
  const categories = await client.from('menu_categories').select('*').eq('shop_id', shopId).order('sort_order');
  const items = await client.from('menu_items').select('*').eq('shop_id', shopId).order('name');
  if (categories.error || items.error) throw failure(categories.error ?? items.error ?? {});
  const itemIds = (items.data ?? []).map((item: MenuItem) => item.id);
  const options = itemIds.length
    ? await client.from('item_options').select('*').in('item_id', itemIds).order('name')
    : { data: [], error: null };
  if (options.error) throw failure(options.error);
  return {
    categories: (categories.data ?? []) as MenuCategory[],
    items: (items.data ?? []) as MenuItem[],
    options: (options.data ?? []) as ItemOption[],
  };
}

export async function createCategory(client: MenuClient, shopId: string, input: CategoryInput): Promise<MenuCategory> {
  const value = unwrap(validateCategoryInput(input));
  const { data, error } = await client.from('menu_categories').insert({ ...value, shop_id: shopId }).select().single();
  if (error) throw failure(error);
  return data as MenuCategory;
}

export async function updateCategory(client: MenuClient, categoryId: string, input: CategoryInput): Promise<MenuCategory> {
  const value = unwrap(validateCategoryInput(input));
  const { data, error } = await client.from('menu_categories').update(value).eq('id', categoryId).select().single();
  if (error) throw failure(error);
  return data as MenuCategory;
}

export async function deleteCategory(client: MenuClient, categoryId: string): Promise<void> {
  const { error } = await client.from('menu_categories').delete().eq('id', categoryId);
  if (error) throw failure(error, CATEGORY_NOT_EMPTY);
}

export async function createItem(client: MenuClient, shopId: string, input: ItemInput): Promise<MenuItem> {
  const value = unwrap(validateItemInput(input));
  const { data, error } = await client.from('menu_items').insert({ ...value, shop_id: shopId }).select().single();
  if (error) throw failure(error);
  return data as MenuItem;
}

export async function updateItem(client: MenuClient, itemId: string, input: ItemInput): Promise<MenuItem> {
  const value = unwrap(validateItemInput(input));
  const { data, error } = await client.from('menu_items').update(value).eq('id', itemId).select().single();
  if (error) throw failure(error);
  return data as MenuItem;
}

/** Fails with a "mark it as sold out instead" message when the item has past orders. */
export async function deleteItem(client: MenuClient, itemId: string): Promise<void> {
  const { error } = await client.from('menu_items').delete().eq('id', itemId);
  if (error) throw failure(error);
}

export async function createOption(client: MenuClient, itemId: string, input: OptionInput): Promise<ItemOption> {
  const value = unwrap(validateOptionInput(input));
  const { data, error } = await client.from('item_options').insert({ ...value, item_id: itemId }).select().single();
  if (error) throw failure(error, IN_PAST_ORDERS, DUPLICATE_OPTION);
  return data as ItemOption;
}

export async function updateOption(client: MenuClient, optionId: string, input: OptionInput): Promise<ItemOption> {
  const value = unwrap(validateOptionInput(input));
  const { data, error } = await client.from('item_options').update(value).eq('id', optionId).select().single();
  if (error) throw failure(error, IN_PAST_ORDERS, DUPLICATE_OPTION);
  return data as ItemOption;
}

export async function deleteOption(client: MenuClient, optionId: string): Promise<void> {
  const { error } = await client.from('item_options').delete().eq('id', optionId);
  if (error) throw failure(error);
}

/** One-tap sold-out switch. Baristas may use this too (set_item_available checks the shop role). */
export async function setItemAvailable(client: MenuClient, itemId: string, available: boolean): Promise<MenuItem> {
  const { data, error } = await client.rpc('set_item_available', { p_item_id: itemId, p_available: available });
  if (error) throw failure(error);
  return data as MenuItem;
}

export async function setOptionAvailable(client: MenuClient, optionId: string, available: boolean): Promise<ItemOption> {
  const { data, error } = await client.rpc('set_option_available', { p_option_id: optionId, p_available: available });
  if (error) throw failure(error);
  return data as ItemOption;
}
