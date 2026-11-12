/** Small colour helpers used to derive per-shop accent colours and check contrast. */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_RE.test(value.trim());
}

/** Parses `#RGB` or `#RRGGBB`. Throws a `RangeError` for anything else. */
export function parseHex(hex: string): Rgb {
  const match = typeof hex === 'string' ? HEX_RE.exec(hex.trim()) : null;
  if (!match?.[1]) {
    throw new RangeError(`Invalid colour "${String(hex)}". Use a hex colour such as #B4441B.`);
  }
  let digits = match[1];
  if (digits.length === 3) {
    digits = digits
      .split('')
      .map((d) => d + d)
      .join('');
  }
  const n = Number.parseInt(digits, 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

/** Normalises a hex colour to upper-case `#RRGGBB`. */
export function normalizeHex(hex: string): string {
  return toHex(parseHex(hex));
}

/** Linear mix: `amount` 0 returns `a`, 1 returns `b`. */
export function mix(a: string, b: string, amount: number): string {
  const t = Math.min(1, Math.max(0, amount));
  const x = parseHex(a);
  const y = parseHex(b);
  return toHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t });
}

/** `rgba()` string for a hex colour at the given opacity. */
export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${r},${g},${b},${a})`;
}

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.x relative luminance. */
export function luminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.x contrast ratio between two colours (1–21). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Picks whichever of `light` / `dark` has more contrast on `background`. */
export function readableOn(background: string, light = '#FFFFFF', dark = '#1C1917'): string {
  return contrastRatio(background, light) >= contrastRatio(background, dark) ? light : dark;
}

/** WCAG AA: 4.5 for normal text, 3 for large text (≥ 18.66px bold / 24px) and UI parts. */
export function meetsContrast(fg: string, bg: string, level: 'AA' | 'AA-large' = 'AA'): boolean {
  return contrastRatio(fg, bg) >= (level === 'AA' ? 4.5 : 3);
}
