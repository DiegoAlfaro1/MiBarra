import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Badge, Banner, BackHeader, Button, Chip, EmptyState, Screen, StampDots, t } from '../../src/components/ui';
import { CATEGORIES, CLOSED_SHOP_MENU, PRODUCTS, SHOPS } from '../../src/data/mock';
import { cartCount, cartTotalCents } from '../../src/lib/cart';
import { formatLempiras } from '../../src/lib/format';
import { useAppState } from '../../src/state/AppState';

export default function ShopScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const shop = SHOPS.find((s) => s.id === id);
  const { cart } = useAppState();
  const [category, setCategory] = useState<string>(CATEGORIES[0].id);

  if (!shop) {
    return (
      <Screen header={<BackHeader />}>
        <EmptyState
          icon="alert-circle"
          title="No encontramos esta cafetería"
          body="Puede que ya no esté en la red de MiBarra."
          action={<Button label="Ver cafeterías" onPress={() => router.replace('/')} />}
        />
      </Screen>
    );
  }

  if (!shop.open) {
    const paused = shop.closedReason === 'paused';
    return (
      <Screen
        header={<BackHeader title={shop.name} subtitle={`${shop.area} · ${shop.distanceKm}`} />}
        footer={
          <>
            <Button label="No se aceptan pedidos ahora" onPress={() => undefined} disabled />
            <Button label="Ver cafeterías abiertas cerca" variant="outline" onPress={() => router.replace('/')} />
          </>
        }
      >
        <View accessibilityRole="alert">
          <Banner tone="danger" icon="clock" title={paused ? 'Pedidos en pausa' : 'Cerrado ahora'}>
            {paused
              ? 'La cafetería está muy llena y pausó los pedidos por unos minutos. Vuelve a intentar pronto.'
              : 'Abre mañana a las 6:30 a. m. Puedes ver el menú, pero no hacer pedidos todavía.'}
          </Banner>
        </View>
        <AppText variant="h2" accessibilityRole="header">
          Menú
        </AppText>
        {CLOSED_SHOP_MENU.map((item) => (
          <View key={item.name} style={[styles.row, styles.dim]}>
            <View style={[styles.photo, { backgroundColor: t.colors.surfaceMuted }]}>
              <Feather name="coffee" size={26} color={t.colors.textSubtle} />
            </View>
            <View style={styles.flex}>
              <AppText variant="bodyStrong" color={t.colors.textMuted}>
                {item.name}
              </AppText>
              <AppText variant="bodySm" color={t.colors.textMuted}>
                {formatLempiras(item.priceCents)}
              </AppText>
            </View>
          </View>
        ))}
      </Screen>
    );
  }

  const items = PRODUCTS.filter((p) => p.categoryId === category);
  const count = cartCount(cart.lines);
  const showCartBar = count > 0 && cart.shopId === shop.id;

  return (
    <Screen
      scroll={false}
      padded={false}
      footer={undefined}
    >
      <View style={styles.hero}>
        <BackHeader backLabel="Volver" />
        <View style={styles.heroBody}>
          <AppText variant="h1" color={t.colors.textInverse} accessibilityRole="header">
            {shop.name}
          </AppText>
          <AppText variant="bodySm" color={t.colors.textInverseMuted}>
            {shop.area} · {shop.hoursLabel}
          </AppText>
          <View style={styles.heroMeta}>
            <Badge label={shop.waitLabel} tone="success" />
            <View style={styles.heroStamps}>
              <AppText variant="caption" color={t.colors.textInverseMuted}>
                {shop.stamps}/{shop.stampGoal} sellos
              </AppText>
              <StampDots filled={shop.stamps} total={shop.stampGoal} />
            </View>
          </View>
        </View>
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="tablist"
          contentContainerStyle={styles.tabs}
        >
          {CATEGORIES.map((c) => (
            <Chip key={c.id} label={c.label} selected={c.id === category} onPress={() => setCategory(c.id)} minHeight={40} />
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={[styles.menu, showCartBar && { paddingBottom: 96 }]}>
        {items.map((item) =>
          item.soldOut ? (
            <View
              key={item.id}
              accessible
              accessibilityState={{ disabled: true }}
              accessibilityLabel={`${item.name}. Agotado hoy`}
              style={[styles.row, styles.dim]}
            >
              <View style={[styles.photo, { backgroundColor: t.colors.surfaceMuted }]}>
                <Feather name="coffee" size={26} color={t.colors.textSubtle} />
              </View>
              <View style={styles.flex}>
                <AppText variant="bodyStrong" color={t.colors.textMuted}>
                  {item.name}
                </AppText>
                <AppText variant="bodySm" color={t.colors.textMuted}>
                  {item.description}
                </AppText>
                <AppText variant="overline" color={t.colors.textDanger}>
                  Agotado hoy
                </AppText>
              </View>
            </View>
          ) : (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${formatLempiras(item.priceCents)}. ${item.description}`}
              onPress={() => router.push({ pathname: '/item/[productId]', params: { productId: item.id, shopId: shop.id } })}
              style={styles.row}
            >
              <View style={[styles.photo, { backgroundColor: t.colors.placeholder }]}>
                <Feather name="coffee" size={26} color={t.colors.onPlaceholder} />
              </View>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{item.name}</AppText>
                <AppText variant="bodySm" color={t.colors.textMuted}>
                  {item.description}
                </AppText>
                <AppText variant="number">{formatLempiras(item.priceCents)}</AppText>
              </View>
              <View style={styles.plus}>
                <AppText variant="h3" color={t.colors.onPrimary}>
                  +
                </AppText>
              </View>
            </Pressable>
          ),
        )}
      </ScrollView>

      {showCartBar ? (
        <View style={styles.cartBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ver carrito, ${count} productos, ${formatLempiras(cartTotalCents(cart.lines))}`}
            onPress={() => router.push('/cart')}
            style={styles.cartBarBtn}
          >
            <View style={styles.cartCount}>
              <AppText variant="badge" color={t.colors.onPrimary}>
                {count}
              </AppText>
            </View>
            <AppText variant="button" color={t.colors.textInverse} style={styles.flex}>
              Ver carrito
            </AppText>
            <AppText variant="button" color={t.colors.textInverse}>
              {formatLempiras(cartTotalCents(cart.lines))}
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { backgroundColor: t.colors.surfaceInverse, marginTop: -8, paddingTop: 8, paddingBottom: 16, borderBottomLeftRadius: t.radii.sheet, borderBottomRightRadius: t.radii.sheet },
  heroBody: { paddingHorizontal: t.layout.gutter, gap: 4 },
  heroMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 12 },
  heroStamps: { gap: 4, minWidth: 120 },
  tabs: { paddingHorizontal: t.layout.gutter, paddingVertical: 12, gap: 8 },
  menu: { paddingHorizontal: t.layout.gutter, paddingBottom: 24, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 84, padding: 12, backgroundColor: t.colors.surface, borderRadius: t.radii.card, borderWidth: 1, borderColor: t.colors.border },
  dim: { opacity: 0.7 },
  photo: { width: 60, height: 60, borderRadius: t.radii.controlLg, alignItems: 'center', justifyContent: 'center' },
  plus: { width: 36, height: 36, borderRadius: 18, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
  cartBar: { position: 'absolute', left: t.layout.gutter, right: t.layout.gutter, bottom: 16 },
  cartBarBtn: { minHeight: t.controlHeights.xxl, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, backgroundColor: t.colors.surfaceInverse, borderRadius: t.radii.controlLg },
  cartCount: { minWidth: 26, height: 26, borderRadius: 13, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
});
