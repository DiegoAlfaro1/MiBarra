import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { MockShop } from '../data/mock';
import { AppText, Avatar, t } from './ui';

export function shopHref(shop: MockShop) {
  return { pathname: '/shop/[id]', params: { id: shop.id } } as const;
}

export function ShopRow({ shop }: { shop: MockShop }) {
  const status = shop.open ? 'Abierto' : 'Cerrado';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${shop.name}, ${shop.area}, ${shop.distanceKm}. ${status}. ${shop.waitLabel}`}
      onPress={() => router.push(shopHref(shop))}
      style={styles.row}
    >
      <Avatar initials={shop.initials} size={52} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{shop.name}</AppText>
        <AppText variant="caption" color={t.colors.textMuted}>
          {shop.area} · {shop.distanceKm}
        </AppText>
        <View style={styles.meta}>
          <AppText variant="badge" color={shop.open ? t.colors.textSuccess : t.colors.textDanger}>
            ● {status}
          </AppText>
          <AppText variant="caption" color={t.colors.textMuted}>
            {shop.waitLabel}
          </AppText>
        </View>
      </View>
      <Feather name="chevron-right" size={20} color={t.colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 76, padding: 12, backgroundColor: t.colors.surface, borderRadius: t.radii.card, borderWidth: 1, borderColor: t.colors.border },
  flex: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
});
