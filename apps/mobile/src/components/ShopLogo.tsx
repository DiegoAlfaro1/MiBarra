import { shopInitials } from '@mibarra/shared';
import { useState } from 'react';
import { Image } from 'react-native';

import { Avatar, t } from './ui';

/** The shop's logo, or its initials when it has none or the image cannot load. */
export function ShopLogo({ name, logoUrl, size = 52 }: { name: string; logoUrl: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!logoUrl || failed) return <Avatar initials={shopInitials(name)} size={size} />;
  return (
    <Image
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      source={{ uri: logoUrl }}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: t.radii.controlLg, backgroundColor: t.colors.placeholder }}
    />
  );
}
