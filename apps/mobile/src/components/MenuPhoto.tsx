import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, View, type StyleProp, type ViewStyle } from 'react-native';

import { t } from './ui';

/** An item's photo, or a cup on the placeholder tile when it has none or it cannot load. */
export function MenuPhoto({ uri, size, dim, style }: { uri: string | null; size: number; dim?: boolean; style?: StyleProp<ViewStyle> }) {
  const [failed, setFailed] = useState<string | null>(null);
  const box: StyleProp<ViewStyle> = [
    { width: size, height: size, borderRadius: t.radii.controlLg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    { backgroundColor: dim ? t.colors.surfaceMuted : t.colors.placeholder },
    style,
  ];
  return (
    <View style={box} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {uri && failed !== uri ? (
        <Image source={{ uri }} onError={() => setFailed(uri)} style={{ width: '100%', height: '100%', opacity: dim ? 0.6 : 1 }} />
      ) : (
        <Feather name="coffee" size={Math.round(size * 0.42)} color={dim ? t.colors.textSubtle : t.colors.onPlaceholder} />
      )}
    </View>
  );
}
