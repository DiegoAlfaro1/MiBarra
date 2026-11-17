import { isUuid } from './orders.ts';
import { OPTION_KINDS } from './types.ts';
import type { OptionKind } from './types.ts';

/**
 * Pure input rules for the menu management module (no network).
 * Every validator returns either the cleaned value or a message per field that the UI can show as-is.
 */

export const MENU_LIMITS = {
  nameMax: 60,
  descriptionMax: 280,
  /** Largest price we accept: 99,999.99 in the shop currency. */
  maxPriceCents: 9_999_999,
} as const;

export type FieldErrors<T> = Partial<Record<keyof T, string>>;
export type Validation<T, Raw = T> = { ok: true; value: T } | { ok: false; errors: FieldErrors<Raw> };

export interface CategoryInput {
  name: string;
  sort_order?: number;
}

export interface ItemInput {
  category_id: string;
  name: string;
  description?: string | null;
  price_cents: number;
  photo_url?: string | null;
  available?: boolean;
}

export interface OptionInput {
  kind: OptionKind;
  name: string;
  /** Can be negative (discount) or zero (free choice such as a size). */
  price_change_cents: number;
  available?: boolean;
}

/** Spanish wording per kind of row, so messages read naturally ("el nombre del producto"). */
const LABELS = {
  category: { a: 'la categoría', of: 'de la categoría' },
  item: { a: 'el producto', of: 'del producto' },
  option: { a: 'la opción', of: 'de la opción' },
} as const;

function cleanName(raw: unknown, kind: keyof typeof LABELS): { value?: string; error?: string } {
  const name = typeof raw === 'string' ? raw.trim() : '';
  if (!name) return { error: `Escribe un nombre para ${LABELS[kind].a}.` };
  if (name.length > MENU_LIMITS.nameMax) {
    return { error: `El nombre ${LABELS[kind].of} debe tener máximo ${MENU_LIMITS.nameMax} caracteres.` };
  }
  return { value: name };
}

const WEB_LINK = /^https?:\/\/\S+$/i;

/** True for an http(s) link; used for item photos and the shop logo. */
export function isWebLink(value: string): boolean {
  return WEB_LINK.test(value);
}

/**
 * Turns what the owner typed as a price in lempiras ("55", "55.5", "L 1,250.00") into integer cents.
 * Returns null when it is not a price of 0 or more with at most two decimals.
 */
export function parseLempiras(raw: string): number | null {
  let text = raw.trim().replace(/^L\.?\s*/i, '');
  // Commas only as thousands separators ("1,250"), so "12,5" is refused instead of read as 125.
  if (text.includes(',')) {
    if (!/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) return null;
    text = text.replace(/,/g, '');
  }
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return cents <= MENU_LIMITS.maxPriceCents ? cents : null;
}

/**
 * Turns a typed option price change into cents: "10" or "+10" adds L 10, "-5" takes off L 5 and an
 * empty field means no change. Returns null when it is not a price with at most two decimals.
 */
export function parsePriceChange(raw: string): number | null {
  const text = raw.trim().replace(/^L\.?\s*/i, '');
  if (!text) return 0;
  const sign = text.startsWith('-') ? -1 : 1;
  const cents = parseLempiras(text.replace(/^[+-]\s*/, ''));
  return cents === null ? null : sign * cents || 0;
}

/** Cents as an editable price field value: 5550 -> "55.50". */
export function lempirasInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

function validCents(value: unknown, allowNegative: boolean): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    Math.abs(value) <= MENU_LIMITS.maxPriceCents &&
    (allowNegative || value >= 0)
  );
}

export function validateCategoryInput(input: CategoryInput): Validation<CategoryInput> {
  const errors: FieldErrors<CategoryInput> = {};
  const name = cleanName(input.name, 'category');
  if (name.error) errors.name = name.error;
  if (input.sort_order !== undefined && !Number.isSafeInteger(input.sort_order)) {
    errors.sort_order = 'El orden debe ser un número entero.';
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const value: CategoryInput = { name: name.value as string };
  if (input.sort_order !== undefined) value.sort_order = input.sort_order;
  return { ok: true, value };
}

export function validateItemInput(input: ItemInput): Validation<ItemInput> {
  const errors: FieldErrors<ItemInput> = {};
  const name = cleanName(input.name, 'item');
  if (name.error) errors.name = name.error;
  if (!isUuid(input.category_id)) errors.category_id = 'Elige una categoría.';
  if (!validCents(input.price_cents, false)) {
    errors.price_cents = 'Escribe un precio de 0 o más, con máximo dos decimales (por ejemplo 55.00).';
  }
  const description = input.description?.trim() || null;
  if (description && description.length > MENU_LIMITS.descriptionMax) {
    errors.description = `La descripción debe tener máximo ${MENU_LIMITS.descriptionMax} caracteres.`;
  }
  const photo_url = input.photo_url?.trim() || null;
  if (photo_url && !isWebLink(photo_url)) errors.photo_url = 'El enlace de la foto debe empezar con https://.';
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const value: ItemInput = {
    category_id: input.category_id,
    name: name.value as string,
    description,
    price_cents: input.price_cents,
    photo_url,
  };
  if (input.available !== undefined) value.available = input.available;
  return { ok: true, value };
}

export function validateOptionInput(input: OptionInput): Validation<OptionInput> {
  const errors: FieldErrors<OptionInput> = {};
  const name = cleanName(input.name, 'option');
  if (name.error) errors.name = name.error;
  if (!OPTION_KINDS.includes(input.kind)) errors.kind = 'Elige tamaño o extra.';
  if (!validCents(input.price_change_cents, true)) {
    errors.price_change_cents = 'Escribe un cambio de precio válido, con máximo dos decimales.';
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const value: OptionInput = {
    kind: input.kind,
    name: name.value as string,
    price_change_cents: input.price_change_cents,
  };
  if (input.available !== undefined) value.available = input.available;
  return { ok: true, value };
}
