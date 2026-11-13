import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Badge, Card, Screen, SectionTitle, t } from '../../src/components/ui';
import { PAST_ORDERS, PRODUCTS } from '../../src/data/mock';
import { formatLempiras } from '../../src/lib/format';
import { useIsWide } from '../../src/lib/useIsWide';
import { useAppState, type OrderStatus } from '../../src/state/AppState';
import { WebAccount } from '../../src/web/WebAccount';

const ACTIVE_LABEL: Record<OrderStatus, string> = {
  received: 'Recibido',
  preparing: 'Preparando',
  ready: '¡Listo para recoger!',
  cancelled: 'Cancelado',
};

export default function OrdersRoute() {
  return useIsWide() ? <WebAccount tab="orders" /> : <Orders />;
}

function Orders() {
  const { order, dispatch } = useAppState();
  const active = order && order.status !== 'cancelled' ? order : null;

  return (
    <Screen>
      <AppText variant="h1" accessibilityRole="header">
        Pedidos
      </AppText>

      {active ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Pedido en curso ${active.code}, ${ACTIVE_LABEL[active.status]}. Ver`}
          onPress={() => router.push('/tracking')}
          style={styles.active}
        >
          <View style={styles.row}>
            <AppText variant="overline" color={t.colors.textInverseMuted}>
              ● En curso
            </AppText>
            <AppText variant="caption" color={t.colors.textInverseMuted}>
              #{active.code}
            </AppText>
          </View>
          <View style={styles.row}>
            <View style={styles.flex}>
              <AppText variant="h2" color={t.colors.textInverse}>
                {ACTIVE_LABEL[active.status]}
              </AppText>
              <AppText variant="bodySm" color={t.colors.textInverseMuted}>
                {active.shopName} · recoger {active.pickupLabel}
              </AppText>
            </View>
            <AppText variant="bodyStrong" color={t.colors.textInverse}>
              Ver
            </AppText>
          </View>
        </Pressable>
      ) : (
        <Card>
          <AppText variant="bodyStrong">No tienes pedidos en curso</AppText>
          <AppText variant="bodySm" color={t.colors.textMuted}>
            Cuando hagas un pedido, lo verás aquí.
          </AppText>
        </Card>
      )}

      <SectionTitle>Anteriores</SectionTitle>
      {PAST_ORDERS.map((o) => {
        const done = o.status === 'completed';
        return (
          <Card key={o.id} style={styles.past}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{o.shop}</AppText>
                <AppText variant="caption" color={t.colors.textMuted}>
                  {o.date}
                </AppText>
              </View>
              <Badge label={done ? 'Recogido · +1 sello' : 'Cancelado'} tone={done ? 'success' : 'danger'} />
            </View>
            <AppText variant="bodySm" color={t.colors.textMuted}>
              {o.items}
            </AppText>
            <View style={styles.row}>
              <AppText variant="number" style={styles.flex}>
                {formatLempiras(o.totalCents)}
              </AppText>
              {done ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Pedir de nuevo en ${o.shop}`}
                  onPress={() => reorder(o.shop, dispatch)}
                  style={styles.reorder}
                >
                  <Feather name="rotate-ccw" size={16} color={t.colors.textAccent} />
                  <AppText variant="buttonSm" color={t.colors.textAccent}>
                    Pedir de nuevo
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

/** Demo: "order again" refills the cart with that shop's first available drink. */
function reorder(shopName: string, dispatch: ReturnType<typeof useAppState>['dispatch']) {
  const shopId = shopName === 'La Molienda' ? 'molienda' : 'lempa';
  const product = PRODUCTS.find((p) => !p.soldOut && p.categoryId === 'cafe')!;
  dispatch({
    type: 'add',
    line: {
      id: `reorder-${Date.now()}`,
      shopId,
      productId: product.id,
      name: product.name,
      optionsLabel: product.description,
      selection: null,
      unitCents: product.priceCents,
      quantity: 1,
    },
  });
  router.push('/cart');
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between' },
  active: { backgroundColor: t.colors.surfaceInverse, borderRadius: t.radii.cardLg, padding: 16, gap: 10 },
  past: { gap: 8 },
  reorder: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 4 },
});
