/** Lempiras as shown in the designs, e.g. `L 135.00`. Amounts are integer cents. */
export function formatLempiras(cents: number): string {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`Amount must be a whole number of cents, got ${cents}.`);
  }
  return `L ${(cents / 100).toFixed(2)}`;
}

/** Short price delta for option chips, e.g. `+L 15` (or `+L 12.50`). */
export function formatExtra(cents: number): string {
  const value = cents / 100;
  return `+L ${Number.isInteger(value) ? value : value.toFixed(2)}`;
}
