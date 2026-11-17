import { createTheme, fontStacks } from '@mibarra/shared';

/** Dashboard theme (staff surface: bigger touch targets, warmer background). */
export const theme = createTheme({ surface: 'dashboard' });
export const { colors, typography, radii, tones } = theme;

/** Body font for text styles that don't spread a `typography` preset (web-only app, so a CSS stack works). */
export const bodyFont = fontStacks.body;
