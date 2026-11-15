import type { SupabaseClient } from '@supabase/supabase-js';

import { WEEKDAY_LABELS, WEEKDAYS, type Weekday } from './shopApi.ts';
import type { Shop, ShopHours } from './types.ts';

/**
 * Customer-side view of shop profiles: the list of shops, one shop, and whether a shop is
 * open right now. Shops are public to read; suspended shops are hidden by the database.
 * Messages are in Spanish and can be shown as-is.
 */

type DirectoryClient = Pick<SupabaseClient, 'from'>;

export class ShopDirectoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShopDirectoryError';
  }
}

/** Lists every shop a customer can see, A to Z. */
export async function listShops(client: DirectoryClient): Promise<Shop[]> {
  const { data, error } = await client.from('shops').select('*').order('name', { ascending: true });
  if (error) {
    throw new ShopDirectoryError('No pudimos cargar las cafeterías. Revisa tu conexión e inténtalo de nuevo.');
  }
  return (data ?? []) as Shop[];
}

/** One shop, or null when it does not exist (or is hidden from customers). */
export async function findShop(client: DirectoryClient, shopId: string): Promise<Shop | null> {
  const { data, error } = await client.from('shops').select('*').eq('id', shopId).maybeSingle();
  if (error) {
    throw new ShopDirectoryError('No pudimos cargar la cafetería. Revisa tu conexión e inténtalo de nuevo.');
  }
  return (data as Shop | null) ?? null;
}

const SMALL_WORDS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y']);

/** "CL" for "Café Lempa": first letters of the first two words (skipping "de", "del"...). */
export function shopInitials(name: string): string {
  const all = name.trim().split(/\s+/).filter(Boolean);
  const words = all.filter((w) => !SMALL_WORDS.has(w.toLowerCase()));
  if (!words.length) words.push(...all);
  if (!words.length) return '?';
  const letters = words.length === 1 ? Array.from(words[0]!).slice(0, 2) : words.slice(0, 2).map((w) => Array.from(w)[0]!);
  return letters.join('').toLocaleUpperCase('es');
}

/** "19:00" becomes "7:00 p. m." */
export function formatClock(time: string): string {
  const [h, m] = time.split(':').map(Number);
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) return time;
  const suffix = h >= 12 ? 'p. m.' : 'a. m.';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${suffix}`;
}

const DAY_BY_INDEX: readonly Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export interface HoursRow {
  day: Weekday;
  label: string;
  text: string;
}

/** Seven rows, Monday first, for showing the week's opening hours. */
export function weeklyHours(hours: ShopHours | null | undefined): HoursRow[] {
  return WEEKDAYS.map((day) => {
    const value = hours?.[day];
    return {
      day,
      label: WEEKDAY_LABELS[day],
      text: value ? `${formatClock(value.open)} – ${formatClock(value.close)}` : 'Cerrado',
    };
  });
}

export interface ShopStatus {
  open: boolean;
  /** Short line for the list, e.g. "Abierto hasta 7:00 p. m.". */
  label: string;
}

/**
 * Open right now = the owner has the shop switched on AND now falls inside today's hours.
 * A shop with no hours saved yet follows the switch alone.
 */
export function shopStatus(shop: Pick<Shop, 'is_open' | 'suspended' | 'hours'>, now: Date): ShopStatus {
  if (shop.suspended) return { open: false, label: 'No disponible' };
  if (!shop.is_open) return { open: false, label: 'Cerrado ahora' };

  const hasSchedule = WEEKDAYS.some((day) => shop.hours?.[day]);
  if (!hasSchedule) return { open: true, label: 'Abierto' };

  const today = shop.hours?.[DAY_BY_INDEX[now.getDay()]!];
  if (!today) return { open: false, label: 'Cerrado hoy' };

  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes < toMinutes(today.open)) return { open: false, label: `Abre hoy a las ${formatClock(today.open)}` };
  if (minutes >= toMinutes(today.close)) return { open: false, label: 'Cerrado ahora' };
  return { open: true, label: `Abierto hasta ${formatClock(today.close)}` };
}
