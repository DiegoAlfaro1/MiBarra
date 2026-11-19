import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { PastOrders } from '../../src/components/PastOrders';
import { AppText, Card, Screen, SectionTitle, t } from '../../src/components/ui';
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
  const { order } = useAppState();
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
      <PastOrders />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between' },
  active: { backgroundColor: t.colors.surfaceInverse, borderRadius: t.radii.cardLg, padding: 16, gap: 10 },
});
