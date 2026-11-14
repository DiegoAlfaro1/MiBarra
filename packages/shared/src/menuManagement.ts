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

function cleanName(raw: unknown, label: string): { value?: string; error?: string } {
  const name = typeof raw === 'string' ? raw.trim() : '';
  if (!name) return { error: `Enter a ${label} name.` };
  if (name.length > MENU_LIMITS.nameMax) {
    return { error: `Keep the ${label} name under ${MENU_LIMITS.nameMax} characters.` };
  }
  return { value: name };
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
    errors.sort_order = 'Order must be a whole number.';
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
  if (!isUuid(input.category_id)) errors.category_id = 'Choose a category.';
  if (!validCents(input.price_cents, false)) {
    errors.price_cents = 'Enter a price of 0 or more, with at most two decimals.';
  }
  const description = input.description?.trim() || null;
  if (description && description.length > MENU_LIMITS.descriptionMax) {
    errors.description = `Keep the description under ${MENU_LIMITS.descriptionMax} characters.`;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const value: ItemInput = {
    category_id: input.category_id,
    name: name.value as string,
    description,
    price_cents: input.price_cents,
    photo_url: input.photo_url?.trim() || null,
  };
  if (input.available !== undefined) value.available = input.available;
  return { ok: true, value };
}

export function validateOptionInput(input: OptionInput): Validation<OptionInput> {
  const errors: FieldErrors<OptionInput> = {};
  const name = cleanName(input.name, 'option');
  if (name.error) errors.name = name.error;
  if (!OPTION_KINDS.includes(input.kind)) errors.kind = 'Choose size or extra.';
  if (!validCents(input.price_change_cents, true)) {
    errors.price_change_cents = 'Enter a valid price change, with at most two decimals.';
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
