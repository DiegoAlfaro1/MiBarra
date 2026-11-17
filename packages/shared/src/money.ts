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

/** Short price change for size and extra options, e.g. `+L 15`, `+L 12.50`, `-L 5` or `Sin costo`. */
export function formatPriceChange(cents: number): string {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`Amount must be a whole number of cents, got ${cents}.`);
  }
  if (cents === 0) return 'Sin costo';
  const value = Math.abs(cents) / 100;
  return `${cents < 0 ? '-' : '+'}L ${Number.isInteger(value) ? value : value.toFixed(2)}`;
}
