/** Lempiras as shown in the designs, e.g. `L 135.00`. Amounts are integer cents. */
export function formatLempiras(cents: number): string {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`Amount must be a whole number of cents, got ${cents}.`);
  }
  return `L ${(cents / 100).toFixed(2)}`;
}

/** Short price delta for option chips, e.g. `+L 15`, `+L 12.50`, or `-L 5` for a cheaper option. */
export function formatExtra(cents: number): string {
  const value = Math.abs(cents) / 100;
  return `${cents < 0 ? '-' : '+'}L ${Number.isInteger(value) ? value : value.toFixed(2)}`;
}
