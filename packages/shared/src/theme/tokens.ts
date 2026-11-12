/**
 * Raw design tokens for MiBarra, taken from `mibarra-design/README.md` and the
 * `*.dc.html` mockups. These are the only place hex values should live; UI code
 * should read semantic roles from `createTheme()` instead of these directly.
 *
 * Values are plain numbers/strings so they work in React Native `StyleSheet`
 * (numbers = density-independent px) and on the web alike.
 */

/** Stone-based neutral palette used for text, surfaces and borders. */
export const palette = {
  white: '#FFFFFF',
  black: '#000000',
  stone50: '#FAFAF9',
  stone100: '#F7F5F2',
  stone150: '#F1EFEC',
  stone200: '#E7E5E4',
  stone300: '#D6D3D1',
  stone400: '#A8A29E',
  stone500: '#78716C',
  stone600: '#57534E',
  stone700: '#44403C',
  stone800: '#292524',
  stone900: '#1C1917',

  /** Brand accent (default shop colour) and its companions. */
  rust600: '#B4441B',
  rust900: '#7C2D12',
  rust100: '#F8E6DC',
  peach100: '#FFEDD5',
  peach300: '#FDBA74',

  green700: '#15803D',
  green900: '#14532D',
  green100: '#DCFCE7',
  green300: '#86EFAC',

  red700: '#B91C1C',
  red800: '#991B1B',
  red100: '#FEE2E2',

  amber500: '#F59E0B',
  amber600: '#D97706',
  amber800: '#92400E',
  amber900: '#78350F',
  amber100: '#FEF3C7',

  blue700: '#1D4ED8',
  blue900: '#1E3A8A',
  blue50: '#EFF6FF',
  blue200: '#BFDBFE',

  olive700: '#3F6212',
} as const;

/** Accent colours offered for per-shop branding in the design canvas. */
export const SHOP_ACCENTS = [palette.rust600, palette.blue700, palette.olive700, palette.rust900] as const;
export const DEFAULT_ACCENT = palette.rust600;

/** Font family names. Load them with `@expo-google-fonts/*` or Google Fonts on the web. */
export const fontFamilies = {
  /** Headings and numbers (weights 600/700). */
  display: 'Bricolage Grotesque',
  /** Everything else (weights 400–700). */
  body: 'Inter',
  /** Codes such as reward / order codes. */
  mono: 'ui-monospace',
} as const;

/** Fallback stacks for CSS (web) contexts. */
export const fontStacks = {
  display: "'Bricolage Grotesque', sans-serif",
  body: 'Inter, system-ui, sans-serif',
  mono: 'ui-monospace, monospace',
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** Font sizes in px, as used across the mockups. */
export const fontSizes = {
  xxs: 10,
  xs: 11,
  sm: 12,
  md: 13,
  base: 14,
  lg: 15,
  xl: 16,
  '2xl': 17,
  '3xl': 18,
  '4xl': 20,
  '5xl': 22,
  '6xl': 24,
  '7xl': 26,
  '8xl': 28,
  '9xl': 30,
  '10xl': 32,
  '11xl': 36,
  '12xl': 40,
} as const;

/** Unitless line-height multipliers. */
export const lineHeights = {
  tight: 1.1,
  snug: 1.15,
  normal: 1.35,
  relaxed: 1.45,
  loose: 1.5,
} as const;

/** Letter spacing in em; multiply by font size for React Native. */
export const letterSpacings = {
  tighter: -0.03,
  tight: -0.02,
  normal: 0,
  wide: 0.04,
  wider: 0.06,
  widest: 0.08,
} as const;

/** Spacing scale in px (gaps, paddings, margins). */
export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  4.5: 18,
  5: 20,
  5.5: 22,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  13: 52,
  14: 56,
} as const;

/** Corner radii in px. Controls 10–14, cards 16–24, pills 999. */
export const radii = {
  none: 0,
  xs: 4,
  sm: 6,
  control: 12,
  controlSm: 10,
  controlLg: 14,
  card: 18,
  cardSm: 16,
  cardLg: 22,
  sheet: 24,
  pill: 999,
} as const;

export const borderWidths = {
  hairline: 1,
  thick: 2,
} as const;

/** Minimum touch target sizes (NFR-08). */
export const touchTargets = {
  /** Customer app (mobile + web). */
  customer: 44,
  /** Shop dashboard default — busy hands. */
  dashboard: 48,
  /** Large dashboard actions (advance status, mark paid). */
  dashboardLarge: 60,
} as const;

/** Common control heights in px. */
export const controlHeights = {
  sm: 40,
  md: 44,
  lg: 48,
  xl: 52,
  xxl: 56,
  xxxl: 60,
} as const;

/** Content max widths for the fluid web/dashboard layouts. */
export const layout = {
  /** Mobile design frame width. */
  mobileFrame: 390,
  dialog: 480,
  narrow: 560,
  content: 1100,
  wide: 1200,
  /** Horizontal page padding on phones. */
  gutter: 20,
  /** Top padding under the status bar on phones. */
  safeTop: 52,
} as const;

/** Breakpoints (min-width, px) for responsive layouts. */
export const breakpoints = {
  phone: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
} as const;

/** Shadows in a cross-platform shape (RN iOS + web via react-native-web). */
export interface ShadowToken {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  /** Android elevation equivalent. */
  elevation: number;
}

export const shadows = {
  none: { shadowColor: palette.black, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  /** Selected segment in a segmented control. */
  sm: { shadowColor: palette.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 1 },
  /** Floating cart bar, dialogs. */
  lg: { shadowColor: palette.stone900, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 8 },
} as const satisfies Record<string, ShadowToken>;

/** Backdrop behind modal dialogs and sheets. */
export const overlays = {
  scrim: 'rgba(28,25,23,0.55)',
  scrimStrong: 'rgba(28,25,23,0.6)',
  /** Translucent white used on dark/accent cards (stamps, chips). */
  onDarkSubtle: 'rgba(255,255,255,0.12)',
  onDark: 'rgba(255,255,255,0.18)',
  onDarkText: 'rgba(255,255,255,0.7)',
} as const;

/** Icon defaults (Lucide-style 2px stroke line icons). */
export const icons = {
  strokeWidth: 2,
  sizes: { sm: 16, md: 20, lg: 24, xl: 40 },
} as const;

export const durations = {
  fast: 120,
  normal: 200,
  slow: 320,
} as const;
