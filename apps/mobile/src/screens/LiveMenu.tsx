import { isItemSoldOut, menuSections, type MenuItem } from '@mibarra/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MenuPhoto } from '../components/MenuPhoto';
import { AppText, Banner, Button, Chip, EmptyState, t } from '../components/ui';
import { formatLempiras } from '../lib/format';
import { useShopMenu } from '../lib/useShops';

/** The menu the owner built in the dashboard: categories as tabs, items with photo and price. */
export function LiveMenu({ shopId, canOrder }: { shopId: string; canOrder: boolean }) {
  const [loaded, reload] = useShopMenu(shopId);
  const [picked, setPicked] = useState<string | null>(null);

  if (loaded.status === 'loading') {
    return (
      <View accessibilityRole="progressbar" accessibilityLabel="Cargando menú" style={styles.center}>
        <ActivityIndicator color={t.colors.primary} />
      </View>
    );
  }
  if (loaded.status === 'error') {
    return <EmptyState icon="wifi-off" title="No pudimos cargar el menú" body={loaded.message} action={<Button label="Reintentar" onPress={reload} />} />;
  }

  const sections = menuSections(loaded.data);
  if (!sections.length) {
    return <EmptyState icon="coffee" title="Menú en preparación" body="Esta cafetería todavía no publicó productos. Vuelve pronto." />;
  }
  const current = sections.find((s) => s.category.id === picked) ?? sections[0]!;

  return (
    <View style={styles.gap}>
      {!canOrder ? (
        <View accessibilityRole="alert">
          <Banner tone="danger" icon="clock" title="Cerrado ahora">
            Puedes ver el menú, pero no hacer pedidos todavía.
          </Banner>
        </View>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={styles.tabs}>
        {sections.map(({ category }) => (
          <Chip
            key={category.id}
            label={category.name}
            selected={category.id === current.category.id}
            onPress={() => setPicked(category.id)}
            minHeight={40}
          />
        ))}
      </ScrollView>
      <View style={styles.gap}>
        {current.items.map((item) => (
          <ItemRow key={item.id} item={item} soldOut={isItemSoldOut(item, loaded.data.options)} canOrder={canOrder} />
        ))}
      </View>
    </View>
  );
}

function ItemRow({ item, soldOut, canOrder }: { item: MenuItem; soldOut: boolean; canOrder: boolean }) {
  const price = formatLempiras(item.price_cents);
  const body = (dim: boolean) => (
    <>
      <MenuPhoto uri={item.photo_url} size={60} dim={dim} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong" color={dim ? t.colors.textMuted : t.colors.text}>
          {item.name}
        </AppText>
        {item.description ? (
          <AppText variant="bodySm" color={t.colors.textMuted}>
            {item.description}
          </AppText>
        ) : null}
        <AppText variant="number" color={dim ? t.colors.textMuted : t.colors.text}>
          {price}
        </AppText>
        {soldOut ? (
          <AppText variant="overline" color={t.colors.textDanger}>
            Agotado hoy
          </AppText>
        ) : null}
      </View>
    </>
  );

  if (soldOut || !canOrder) {
    return (
      <View
        accessible
        accessibilityState={{ disabled: true }}
        accessibilityLabel={!soldOut ? `${item.name}, ${price}` : `${item.name}, ${price}. Agotado hoy`}
        style={[styles.row, styles.dim]}
      >
        {body(true)}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${price}${item.description ? `. ${item.description}` : ''}`}
      accessibilityHint="Abre el producto para elegir opciones y agregarlo"
      onPress={() => router.push({ pathname: '/item/[productId]', params: { productId: item.id, shopId: item.shop_id } })}
      style={styles.row}
    >
      {body(false)}
      <View style={styles.plus}>
        <AppText variant="h3" color={t.colors.onPrimary}>
          +
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 10 },
  center: { paddingVertical: 32, alignItems: 'center' },
  tabs: { gap: 8, paddingVertical: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 84, padding: 12, backgroundColor: t.colors.surface, borderRadius: t.radii.card, borderWidth: 1, borderColor: t.colors.border },
  dim: { opacity: 0.7 },
  plus: { width: 36, height: 36, borderRadius: 18, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
});
