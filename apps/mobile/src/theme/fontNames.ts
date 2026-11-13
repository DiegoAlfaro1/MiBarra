// Maps theme font tokens (family + weight) to the names registered by `useFonts` in the root layout.
// Native platforms need one family name per weight, so the theme's `fontWeight` is baked in here.

const DISPLAY: Record<string, string> = {
  '600': 'BricolageGrotesque_600SemiBold',
  '700': 'BricolageGrotesque_700Bold',
};

const BODY: Record<string, string> = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
};

export function resolveFontFamily(family: string, weight: string): string {
  if (family === 'Bricolage Grotesque') return DISPLAY[weight] ?? DISPLAY['700']!;
  if (family === 'Inter') return BODY[weight] ?? BODY['400']!;
  return family === 'ui-monospace' ? 'monospace' : family;
}
