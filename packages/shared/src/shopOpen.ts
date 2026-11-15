import type { SupabaseClient } from '@supabase/supabase-js';

import { shopStatus } from './shopDirectory.ts';
import type { Shop } from './types.ts';

/**
 * Open/closed switch for the owner dashboard. The switch is saved through the `set_shop_open`
 * SQL function, which refuses to open the shop outside its working hours. Messages are Spanish.
 */

type ShopClient = Pick<SupabaseClient, 'rpc'>;

export class ShopOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShopOpenError';
  }
}

function failure(error: { code?: string; message?: string }): ShopOpenError {
  if (error.code === '42501') return new ShopOpenError('No tienes permiso para cambiar si la tienda recibe pedidos.');
  if (error.code === '28000') return new ShopOpenError('Tu sesión expiró. Vuelve a iniciar sesión.');
  if (error.code === '22023') return new ShopOpenError('Solo puedes abrir la tienda dentro de su horario de atención.');
  return new ShopOpenError('No pudimos cambiar el estado de la tienda. Revisa tu conexión e inténtalo de nuevo.');
}

/** Turns ordering on or off. Throws `ShopOpenError` with a message that can be shown as-is. */
export async function setShopOpen(client: ShopClient, shopId: string, open: boolean): Promise<Shop> {
  const { data, error } = await client.rpc('set_shop_open', { p_shop_id: shopId, p_open: open });
  if (error) throw failure(error);
  return data as Shop;
}

/**
 * Whether the shop takes orders right now: the switch is on AND the working hours are in effect.
 * The switch turns itself off in the database once hours end; this keeps the screen right in between.
 */
export function isTakingOrders(shop: Pick<Shop, 'is_open' | 'suspended' | 'hours'>, now: Date): boolean {
  return shopStatus(shop, now).open;
}
