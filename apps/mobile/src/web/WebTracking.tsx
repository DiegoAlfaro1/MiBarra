import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, EmptyState, t } from '../components/ui';
import { MOCK_CUSTOMER_NAME, SHOPS } from '../data/mock';
import { formatLempiras } from '../lib/format';
import { TRACKING_STEPS, trackingView } from '../lib/tracking';
import { useAppState } from '../state/AppState';
import { WEB_MAX_WIDTH, WebFooter, WebHeader } from './WebHeader';

const STAMP_GOAL = 8;
const STAMPS_NOW = 6;
// Design color for the stamp earned by this order (not in the palette).
const NEXT_STAMP = '#FDBA74';

export function WebTracking() {
  const { order, setOrderStatus, session } = useAppState();
  const shop = SHOPS.find((s) => s.id === order?.shopId);
  const view = order ? trackingView(order.status, { shopName: order.shopName, customerName: session?.name ?? MOCK_CUSTOMER_NAME, code: order.code }) : null;

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <WebHeader />
        {!order || !view ? (
          <View style={styles.main}>
            <EmptyState
              icon="clock"
              title="No tienes pedidos en curso"
              body="Cuando hagas un pedido, aquí verás cómo va."
              action={<Button label="Ver cafeterías" onPress={() => router.replace('/')} />}
            />
          </View>
        ) : (
          <View style={styles.main}>
            <View style={styles.left}>
              <View
                accessibilityLiveRegion="polite"
                style={[styles.hero, view.ready ? styles.heroReady : styles.heroDefault]}
              >
                <View style={styles.heroMeta}>
                  <AppText variant="bodyStrong" color={view.ready ? t.tones.success.onTint : t.colors.text}>
                    Pedido #{order.code} · {order.shopName}
                  </AppText>
                  <AppText variant="bodyStrong" color={view.ready ? t.tones.success.onTint : t.colors.text}>
                    Listo aprox. 9:15 a. m.
                  </AppText>
                </View>
                <AppText variant="display" accessibilityRole="header" aria-level={1} color={view.ready ? t.tones.success.onTint : t.colors.text}>
                  {view.title}
                </AppText>
                <AppText variant="body" color={view.ready ? t.tones.success.onTint : t.colors.textMuted} style={styles.lead}>
                  {view.body}
                </AppText>
                <View accessibilityLabel="Progreso del pedido" style={styles.steps}>
                  {TRACKING_STEPS.map((label, i) => {
                    const done = i <= view.index;
                    const color = view.ready ? t.tones.success.solid : t.colors.primary;
                    return (
                      <View
                        key={label}
                        accessible
                        accessibilityLabel={`${label}, ${view.times[i]}${i === view.index ? ', paso actual' : ''}`}
                        style={styles.step}
                      >
                        <View style={[styles.bar, { backgroundColor: done ? color : t.colors.border }]} />
                        <AppText variant={i === view.index ? 'bodyStrong' : 'body'} color={view.ready ? t.tones.success.onTint : t.colors.text}>
                          {label}
                        </AppText>
                        <AppText variant="caption" color={view.ready ? t.tones.success.onTint : t.colors.textMuted}>
                          {view.times[i]}
                        </AppText>
                      </View>
                    );
                  })}
                </View>
              </View>

              <View style={styles.cards}>
                <Card style={styles.infoCard}>
                  <AppText variant="h3" accessibilityRole="header" aria-level={2}>
                    Tu pedido
                  </AppText>
                  {order.lines.map((l) => (
                    <View key={l.id} style={styles.line}>
                      <AppText variant="body" style={styles.flex}>
                        {l.quantity} × {l.name}
                      </AppText>
                      <AppText variant="body">{formatLempiras(l.unitCents * l.quantity)}</AppText>
                    </View>
                  ))}
                  <View style={[styles.line, styles.total]}>
                    <AppText variant="bodyStrong" style={styles.flex}>
                      Total · {order.payment === 'counter' ? 'pagar en caja' : 'tarjeta (demo)'}
                    </AppText>
                    <AppText variant="bodyStrong">{formatLempiras(order.totalCents)}</AppText>
                  </View>
                </Card>
                <Card style={styles.infoCard}>
                  <AppText variant="h3" accessibilityRole="header" aria-level={2}>
                    Dónde recoger
                  </AppText>
                  <AppText variant="body">{order.shopName}</AppText>
                  <AppText variant="body" color={t.colors.textMuted}>
                    {shop ? shop.area : 'Tegucigalpa'}, Tegucigalpa
                  </AppText>
                  <Pressable accessibilityRole="link" accessibilityLabel={`Cómo llegar a ${order.shopName}, vista previa`} style={styles.linkBtn}>
                    <AppText variant="bodyStrong" style={styles.underline}>
                      Cómo llegar
                    </AppText>
                  </Pressable>
                </Card>
              </View>

              {view.canCancel ? (
                <View style={styles.cancelRow}>
                  <View style={styles.cancelBtn}>
                    <Button
                      label="Cancelar pedido"
                      variant="danger"
                      onPress={() => {
                        setOrderStatus('cancelled');
                        router.replace({ pathname: '/cancelled', params: { by: 'cliente' } });
                      }}
                    />
                  </View>
                  <AppText variant="caption" color={t.colors.textMuted} style={styles.flex}>
                    Puedes cancelar hasta que la cafetería empiece a prepararlo.
                  </AppText>
                </View>
              ) : null}
            </View>

            <View style={styles.aside}>
              <AppText variant="overline" color={t.colors.textInverseMuted}>
                Al recogerlo sumas
              </AppText>
              <AppText variant="h1" color={t.colors.textInverse}>
                +1 sello · {STAMPS_NOW + 1}/{STAMP_GOAL}
              </AppText>
              <View accessible accessibilityRole="image" accessibilityLabel={`${STAMPS_NOW} de ${STAMP_GOAL} sellos, el siguiente se suma al recoger`} style={styles.dots}>
                {Array.from({ length: STAMP_GOAL }, (_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, { backgroundColor: i < STAMPS_NOW ? t.colors.primary : i === STAMPS_NOW ? NEXT_STAMP : t.palette.stone700 }]}
                  />
                ))}
              </View>
              <AppText variant="bodySm" color={t.colors.textInverseMuted}>
                Te falta un pedido para tu bebida gratis en {order.shopName}.
              </AppText>
              {view.ready ? (
                <Pressable accessibilityRole="link" onPress={() => router.navigate('/loyalty')} style={styles.linkBtn}>
                  <View style={styles.row}>
                    <Feather name="credit-card" size={18} color={t.colors.textInverse} />
                    <AppText variant="bodyStrong" color={t.colors.textInverse} style={styles.underline}>
                      Ver mi tarjeta de sellos
                    </AppText>
                  </View>
                </Pressable>
              ) : null}
            </View>
          </View>
        )}
        <WebFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: t.colors.background },
  scroll: { flexGrow: 1 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  main: { width: '100%', maxWidth: WEB_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 36, paddingBottom: 64, flexDirection: 'row', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' },
  left: { flexGrow: 999, flexShrink: 1, flexBasis: 560, minWidth: 0, gap: 20 },
  hero: { gap: 14, padding: 28, borderRadius: 24, borderWidth: 1 },
  heroDefault: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
  heroReady: { backgroundColor: t.tones.success.tint, borderColor: t.tones.success.border },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  lead: { maxWidth: 560 },
  steps: { flexDirection: 'row', gap: 10, marginTop: 8 },
  step: { flex: 1, gap: 6 },
  bar: { height: 8, borderRadius: 4 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  infoCard: { flexGrow: 1, flexBasis: 220, gap: 10, padding: 20, borderRadius: 20 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  total: { paddingTop: 8, borderTopWidth: 1, borderTopColor: t.colors.surfaceMuted },
  linkBtn: { minHeight: 44, justifyContent: 'center' },
  underline: { textDecorationLine: 'underline' },
  cancelRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14 },
  cancelBtn: { minWidth: 180 },
  aside: { flexGrow: 1, flexShrink: 1, flexBasis: 280, gap: 14, padding: 24, borderRadius: 22, backgroundColor: t.colors.surfaceInverse },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { flex: 1, aspectRatio: 1, borderRadius: 999 },
});
