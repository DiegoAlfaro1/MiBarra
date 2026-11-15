import type { SupabaseClient } from '@supabase/supabase-js';

import { isWebLink } from './menuManagement.ts';
import type { Shop, ShopHours } from './types.ts';

/**
 * Shop profile (name, logo, address, phone, opening hours) for the shop management module.
 * Saving goes through the `update_shop_profile` SQL function, which only lets the owner
 * (or a platform admin) change it. Messages are in Spanish and can be shown as-is.
 */

type ShopClient = Pick<SupabaseClient, 'from' | 'rpc'>;

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sábado',
  sun: 'Domingo',
};

export const SHOP_LIMITS = { nameMax: 120, addressMax: 240 } as const;

export interface DayHours {
  open: string;
  close: string;
}

/** What the form edits. `hours[day] = null` means closed that day. */
export interface ShopProfileInput {
  name: string;
  logo_url: string;
  address: string;
  phone: string;
  hours: Record<Weekday, DayHours | null>;
}

export interface ShopProfileErrors {
  name?: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  hours?: Partial<Record<Weekday, string>>;
}

export type ShopProfileValidation =
  | { ok: true; value: { name: string; logo_url: string | null; address: string | null; phone: string | null; hours: ShopHours } }
  | { ok: false; errors: ShopProfileErrors };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Accepts "7:00", "07:00" or "0700" and returns "07:00"; null if it is not a 24-hour time. */
export function normalizeTime(raw: string): string | null {
  const text = raw.trim();
  const match = /^(\d{1,2}):?(\d{2})$/.exec(text);
  if (!match) return null;
  const [, hh = '', mm = ''] = match;
  const time = `${hh.padStart(2, '0')}:${mm}`;
  return TIME.test(time) ? time : null;
}

/**
 * Honduran numbers are 8 digits; the +504 prefix is optional. Other countries need the "+" prefix.
 * Returns E.164 ("+50422223333"), '' for an empty field, or null when it is not a phone number.
 */
export function normalizePhone(raw: string): string | null {
  const text = raw.trim();
  if (!text) return '';
  if (!/^\+?[\d\s().-]+$/.test(text)) return null;
  const digits = text.replace(/\D/g, '');
  if (!text.startsWith('+') && digits.length === 8) return `+504${digits}`;
  if (text.startsWith('+') && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

/** "+50422223333" -> "+504 2222-3333"; other numbers are shown as stored. */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const hn = /^\+504(\d{4})(\d{4})$/.exec(phone);
  return hn ? `+504 ${hn[1]}-${hn[2]}` : phone;
}

/** Fills every weekday so the form always shows seven rows (missing days are closed). */
export function hoursForForm(hours: ShopHours | null | undefined): Record<Weekday, DayHours | null> {
  const out = {} as Record<Weekday, DayHours | null>;
  for (const day of WEEKDAYS) {
    const value = hours?.[day];
    out[day] = value ? { open: value.open, close: value.close } : null;
  }
  return out;
}

/** Profile values ready for the form. */
export function shopProfileForm(shop: Pick<Shop, 'name' | 'logo_url' | 'address' | 'phone' | 'hours'>): ShopProfileInput {
  return {
    name: shop.name,
    logo_url: shop.logo_url ?? '',
    address: shop.address ?? '',
    phone: formatPhone(shop.phone),
    hours: hoursForForm(shop.hours),
  };
}

export function validateShopProfile(input: ShopProfileInput): ShopProfileValidation {
  const errors: ShopProfileErrors = {};
  const name = input.name.trim();
  if (!name) errors.name = 'Escribe el nombre de la tienda.';
  else if (name.length > SHOP_LIMITS.nameMax) errors.name = `El nombre debe tener máximo ${SHOP_LIMITS.nameMax} caracteres.`;

  const address = input.address.trim();
  if (address.length > SHOP_LIMITS.addressMax) {
    errors.address = `La dirección debe tener máximo ${SHOP_LIMITS.addressMax} caracteres.`;
  }

  const phone = normalizePhone(input.phone);
  if (phone === null) errors.phone = 'Ingresa un teléfono de 8 dígitos, por ejemplo 2222-3333.';

  const logo = input.logo_url.trim();
  if (logo && !isWebLink(logo)) errors.logo_url = 'El enlace del logo debe empezar con https://.';

  const hours: ShopHours = {};
  const dayErrors: Partial<Record<Weekday, string>> = {};
  for (const day of WEEKDAYS) {
    const value = input.hours[day];
    if (!value) {
      hours[day] = null;
      continue;
    }
    const open = normalizeTime(value.open);
    const close = normalizeTime(value.close);
    if (!open || !close) dayErrors[day] = 'Usa el formato de 24 horas, por ejemplo 07:00 y 19:00.';
    else if (open >= close) dayErrors[day] = 'La hora de apertura debe ser antes de la de cierre.';
    else hours[day] = { open, close };
  }
  if (Object.keys(dayErrors).length > 0) errors.hours = dayErrors;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, logo_url: logo || null, address: address || null, phone: phone || null, hours } };
}

export class ShopProfileError extends Error {
  readonly fieldErrors?: ShopProfileErrors;
  constructor(message: string, fieldErrors?: ShopProfileErrors) {
    super(message);
    this.name = 'ShopProfileError';
    this.fieldErrors = fieldErrors;
  }
}

function failure(error: { code?: string; message?: string }): ShopProfileError {
  if (error.code === '42501') return new ShopProfileError('Solo la persona dueña de la tienda puede cambiar estos datos.');
  if (error.code === '28000') return new ShopProfileError('Tu sesión expiró. Vuelve a iniciar sesión.');
  // 22023 = a message we wrote in SQL for users.
  if (error.code === '22023' && error.message) return new ShopProfileError(error.message);
  return new ShopProfileError('No pudimos guardar los cambios. Revisa tu conexión e inténtalo de nuevo.');
}

export async function getShop(client: ShopClient, shopId: string): Promise<Shop> {
  const { data, error } = await client.from('shops').select('*').eq('id', shopId).single();
  if (error) {
    throw new ShopProfileError('No pudimos cargar los datos de la tienda. Revisa tu conexión e inténtalo de nuevo.');
  }
  return data as Shop;
}

/** Validates first (no request on invalid input), then saves through update_shop_profile. */
export async function updateShopProfile(client: ShopClient, shopId: string, input: ShopProfileInput): Promise<Shop> {
  const result = validateShopProfile(input);
  if (!result.ok) throw new ShopProfileError('Revisa los campos marcados.', result.errors);
  const v = result.value;
  const { data, error } = await client.rpc('update_shop_profile', {
    p_shop_id: shopId,
    p_name: v.name,
    p_address: v.address,
    p_logo_url: v.logo_url,
    p_hours: v.hours,
    p_phone: v.phone,
  });
  if (error) throw failure(error);
  return data as Shop;
}
