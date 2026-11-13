import { useWindowDimensions } from 'react-native';

import { isWideWidth } from './breakpoint.ts';

export function useIsWide(): boolean {
  return isWideWidth(useWindowDimensions().width);
}
