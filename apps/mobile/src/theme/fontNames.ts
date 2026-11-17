// Maps theme font tokens (family + weight) to the names registered by `useFonts` in the root layout.
// Native platforms need one family name per weight, so the theme's `fontWeight` is baked in here.

const DISPLAY: Record<string, string> = {
  '600': 'Fraunces_600SemiBold',
  '700': 'Fraunces_700Bold',
};

const BODY: Record<string, string> = {
  '400': 'DMSans_400Regular',
  '500': 'DMSans_500Medium',
  '600': 'DMSans_600SemiBold',
  '700': 'DMSans_700Bold',
};

export function resolveFontFamily(family: string, weight: string): string {
  if (family === 'Fraunces') return DISPLAY[weight] ?? DISPLAY['700']!;
  if (family === 'DM Sans') return BODY[weight] ?? BODY['400']!;
  return family === 'ui-monospace' ? 'monospace' : family;
}
