import type { OrderStatus } from '../types.ts';
import { contrastRatio, mix, normalizeHex, readableOn } from './color.ts';
import {
  borderWidths,
  breakpoints,
  controlHeights,
  DEFAULT_ACCENT,
  durations,
  fontFamilies,
  fontSizes,
  fontWeights,
  icons,
  layout,
  letterSpacings,
  lineHeights,
  overlays,
  palette,
  radii,
  shadows,
  spacing,
  touchTargets,
} from './tokens.ts';

/** Which product surface the theme is for. Affects background and touch targets. */
export type ThemeSurface = 'customer' | 'dashboard';

export interface ThemeOptions {
  /** Per-shop brand colour (hex). Defaults to the MiBarra rust accent. */
  accent?: string;
  /** `customer` (mobile + web app) or `dashboard` (shop staff). Defaults to `customer`. */
  surface?: ThemeSurface;
}

/** A coloured role: solid fill, soft tint, text on tint, and border. */
export interface Tone {
  /** Strong colour: dots, solid buttons, icons, progress bars. */
  solid: string;
  /** Text/icon colour to use on `solid`. */
  onSolid: string;
  /** Soft background for badges, banners and hints. */
  tint: string;
  /** Text colour on `tint` (meets WCAG AA). */
  onTint: string;
  /** Border for tinted banners/cards. */
  border: string;
}

export type ToneName = 'neutral' | 'accent' | 'success' | 'danger' | 'warning' | 'demo';

/** Payment states shown in the UI (PAY-04). */
export type PaymentTone = 'unpaid' | 'paid' | 'failed' | 'refunded';

export interface TextStyleToken {
  fontFamily: string;
  fontSize: number;
  fontWeight: '400' | '500' | '600' | '700';
  /** Absolute line height in px (React Native needs px, not a multiplier). */
  lineHeight: number;
  /** Absolute letter spacing in px. */
  letterSpacing: number;
  textTransform?: 'uppercase';
}

const MIN_TEXT_CONTRAST = 4.5;

/** Darkens `color` toward ink until it reaches `ratio` against `bg`. */
function ensureContrast(color: string, bg: string, ratio = MIN_TEXT_CONTRAST): string {
  let out = color;
  for (let step = 1; step <= 20 && contrastRatio(out, bg) < ratio; step += 1) {
    out = mix(color, palette.stone900, step / 20);
  }
  return out;
}

function text(
  family: keyof typeof fontFamilies,
  size: number,
  weight: TextStyleToken['fontWeight'],
  lineHeight: number,
  letterSpacingEm = 0,
  uppercase = false,
): TextStyleToken {
  return {
    fontFamily: fontFamilies[family],
    fontSize: size,
    fontWeight: weight,
    lineHeight: Math.round(size * lineHeight),
    letterSpacing: Math.round(size * letterSpacingEm * 100) / 100,
    ...(uppercase ? { textTransform: 'uppercase' as const } : {}),
  };
}

/** Typography presets. Use these instead of ad-hoc font sizes. */
export const typography = {
  /** Big numbers (dashboard stats, totals, reward codes). */
  displayLg: text('display', fontSizes['12xl'], fontWeights.bold, lineHeights.tight, letterSpacings.tight),
  /** Hero headings (tracking, web hero). */
  display: text('display', fontSizes['10xl'], fontWeights.bold, lineHeights.snug, letterSpacings.tight),
  /** Screen title. */
  h1: text('display', fontSizes['8xl'], fontWeights.bold, lineHeights.snug, letterSpacings.tight),
  /** Section title. */
  h2: text('display', fontSizes['5xl'], fontWeights.bold, lineHeights.normal, letterSpacings.tight),
  /** Card title. */
  h3: text('display', fontSizes['3xl'], fontWeights.semibold, lineHeights.normal, letterSpacings.tight),
  /** Price / numeric value inside cards. */
  number: text('display', fontSizes['2xl'], fontWeights.bold, lineHeights.normal),
  /** Default body copy. */
  body: text('body', fontSizes.lg, fontWeights.regular, lineHeights.relaxed),
  bodyStrong: text('body', fontSizes.lg, fontWeights.semibold, lineHeights.relaxed),
  /** Secondary copy, list meta. */
  bodySm: text('body', fontSizes.base, fontWeights.regular, lineHeights.relaxed),
  /** Button labels. */
  button: text('body', fontSizes.xl, fontWeights.semibold, lineHeights.normal),
  buttonSm: text('body', fontSizes.base, fontWeights.semibold, lineHeights.normal),
  /** Form labels. */
  label: text('body', fontSizes.base, fontWeights.semibold, lineHeights.normal),
  /** Captions, timestamps, helper text. */
  caption: text('body', fontSizes.md, fontWeights.regular, lineHeights.normal),
  /** Badges and pills. */
  badge: text('body', fontSizes.sm, fontWeights.bold, lineHeights.normal),
  /** Small uppercase labels ("DEMO", section eyebrows). */
  overline: text('body', fontSizes.xs, fontWeights.bold, lineHeights.normal, letterSpacings.wider, true),
  /** Reward / order codes. */
  code: text('mono', fontSizes['5xl'], fontWeights.bold, lineHeights.normal, letterSpacings.widest),
} as const satisfies Record<string, TextStyleToken>;

export type TypographyVariant = keyof typeof typography;

/** Builds the accent tone for a shop colour, keeping text readable. */
export function accentTone(accent: string = DEFAULT_ACCENT): Tone {
  const solid = normalizeHex(accent);
  if (solid === DEFAULT_ACCENT) {
    // Exact values from the design for the default brand colour.
    return {
      solid,
      onSolid: palette.white,
      tint: palette.rust100,
      onTint: palette.rust900,
      border: palette.peach300,
    };
  }
  const tint = mix(solid, palette.white, 0.86);
  return {
    solid,
    onSolid: readableOn(solid, palette.white, palette.stone900),
    tint,
    onTint: ensureContrast(mix(solid, palette.stone900, 0.35), tint),
    border: mix(solid, palette.white, 0.55),
  };
}

const staticTones: Record<Exclude<ToneName, 'accent'>, Tone> = {
  neutral: {
    solid: palette.stone900,
    onSolid: palette.white,
    tint: palette.stone150,
    onTint: palette.stone700,
    border: palette.stone200,
  },
  success: {
    solid: palette.green700,
    onSolid: palette.white,
    tint: palette.green100,
    onTint: palette.green900,
    border: palette.green300,
  },
  danger: {
    solid: palette.red700,
    onSolid: palette.white,
    tint: palette.red100,
    onTint: palette.red800,
    border: palette.red700,
  },
  warning: {
    solid: palette.amber600,
    onSolid: palette.stone900,
    tint: palette.amber100,
    onTint: palette.amber900,
    border: palette.amber500,
  },
  demo: {
    solid: palette.blue700,
    onSolid: palette.white,
    tint: palette.blue50,
    onTint: palette.blue900,
    border: palette.blue200,
  },
};

export interface StatusStyle {
  tone: ToneName;
  /** Spanish label shown to customers / staff. */
  label: string;
}

/** How each order status is presented. Keys follow `ORDER_STATUSES`. */
export const orderStatusStyles: Record<OrderStatus, StatusStyle> = {
  pending: { tone: 'accent', label: 'Recibido' },
  preparing: { tone: 'warning', label: 'Preparando' },
  ready: { tone: 'success', label: 'Listo' },
  completed: { tone: 'neutral', label: 'Recogido' },
  cancelled: { tone: 'danger', label: 'Cancelado' },
};

/** How each payment status is presented. */
export const paymentStatusStyles: Record<PaymentTone, StatusStyle> = {
  unpaid: { tone: 'warning', label: 'Por cobrar' },
  paid: { tone: 'success', label: 'Pagado' },
  failed: { tone: 'danger', label: 'Pago fallido' },
  refunded: { tone: 'neutral', label: 'Reembolsado' },
};

/**
 * Creates the full MiBarra theme. Call once per shop/surface and pass it down
 * (e.g. through React context). Throws a `RangeError` with a clear message if
 * `accent` is not a valid hex colour.
 */
export function createTheme(options: ThemeOptions = {}) {
  const surface: ThemeSurface = options.surface ?? 'customer';
  if (surface !== 'customer' && surface !== 'dashboard') {
    throw new RangeError(`Unknown theme surface "${String(surface)}". Use "customer" or "dashboard".`);
  }
  const accent = accentTone(options.accent ?? DEFAULT_ACCENT);
  const tones: Record<ToneName, Tone> = { ...staticTones, accent };

  const colors = {
    /** Page background. */
    background: surface === 'dashboard' ? palette.stone150 : palette.stone100,
    /** Cards, sheets, inputs. */
    surface: palette.white,
    /** Subtle fill inside cards (segmented control track, disabled field). */
    surfaceMuted: palette.stone150,
    /** Dark cards (stamp card, cart bar). */
    surfaceInverse: palette.stone900,
    border: palette.stone200,
    /** Stronger border for inputs and unselected options. */
    borderStrong: palette.stone300,
    /** Focus ring / selected outline. */
    focus: accent.solid,

    text: palette.stone900,
    textMuted: palette.stone600,
    /** Placeholders and disabled labels. Not for essential copy. */
    textSubtle: palette.stone500,
    textInverse: palette.white,
    textInverseMuted: overlays.onDarkText,
    /** Accent-coloured text/links on light surfaces (meets AA). */
    textAccent: ensureContrast(accent.solid, palette.white),
    textDanger: palette.red700,
    textSuccess: palette.green700,

    /** Primary action. */
    primary: accent.solid,
    onPrimary: accent.onSolid,
    /** Strong neutral action (dark buttons). */
    secondary: palette.stone900,
    onSecondary: palette.white,
    disabled: palette.stone400,
    onDisabled: palette.white,

    /** Item photo placeholder tile. */
    placeholder: accent.tint,
    onPlaceholder: accent.onTint,
    /** Empty stamp slot outline. */
    stampEmpty: palette.stone400,

    scrim: overlays.scrim,
  } as const;

  return {
    surface,
    colors,
    tones,
    palette,
    typography,
    fontFamilies,
    fontWeights,
    fontSizes,
    lineHeights,
    letterSpacings,
    spacing,
    radii,
    borderWidths,
    shadows,
    overlays,
    icons,
    durations,
    layout,
    breakpoints,
    controlHeights,
    /** Minimum touch target for this surface. */
    minTouchTarget: surface === 'dashboard' ? touchTargets.dashboard : touchTargets.customer,
    touchTargets,
    /** Tone + label for an order status. */
    orderStatus(status: OrderStatus): StatusStyle & Tone {
      const style = orderStatusStyles[status];
      if (!style) throw new RangeError(`Unknown order status "${String(status)}".`);
      return { ...style, ...tones[style.tone] };
    },
    /** Tone + label for a payment status. */
    paymentStatus(status: PaymentTone): StatusStyle & Tone {
      const style = paymentStatusStyles[status];
      if (!style) throw new RangeError(`Unknown payment status "${String(status)}".`);
      return { ...style, ...tones[style.tone] };
    },
  };
}

export type Theme = ReturnType<typeof createTheme>;

/** Default customer theme with the MiBarra accent. */
export const theme: Theme = createTheme();
