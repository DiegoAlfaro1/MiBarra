/**
 * All amounts are stored as integer cents to avoid floating point rounding.
 */
export function formatMoney(cents: number, currency: string, locale?: string): string {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`Amount must be a whole number of cents, got ${cents}.`);
  }
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}

export function sumLineItems(items: readonly { quantity: number; unit_price_cents: number }[]): number {
  return items.reduce((total, item) => total + item.quantity * item.unit_price_cents, 0);
}
