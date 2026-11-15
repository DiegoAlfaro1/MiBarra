import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatPhone, shopStatus, type Shop } from '@mibarra/shared';

import { ShopLogo } from './ShopLogo';
import { AppText, t } from './ui';

export function shopHref(shop: { id: string }) {
  return { pathname: '/shop/[id]', params: { id: shop.id } } as const;
}

export function ShopRow({ shop }: { shop: Shop }) {
  const { open, label } = shopStatus(shop, new Date());
  const place = shop.address ?? 'Sin dirección';
  const phone = formatPhone(shop.phone);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${shop.name}, ${place}. ${open ? 'Abierto' : 'Cerrado'}. ${label}`}
      onPress={() => router.push(shopHref(shop))}
      style={styles.row}
    >
      <ShopLogo name={shop.name} logoUrl={shop.logo_url} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{shop.name}</AppText>
        <AppText variant="caption" color={t.colors.textMuted} numberOfLines={1}>
          {phone ? `${place} · ${phone}` : place}
        </AppText>
        <View style={styles.meta}>
          <AppText variant="badge" color={open ? t.colors.textSuccess : t.colors.textDanger}>
            ● {label}
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
