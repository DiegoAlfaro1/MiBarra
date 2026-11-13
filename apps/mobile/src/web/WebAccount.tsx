import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Badge, Card, EmptyState, QrPlaceholder, t } from '../components/ui';
import { shopHref } from '../components/ShopRow';
import { MOCK_CUSTOMER_NAME, PAST_ORDERS, SHOPS } from '../data/mock';
import { pastOrderRow, stampCards, type StampCardTone } from '../lib/account';
import { formatLempiras } from '../lib/format';
import { useAppState, type OrderStatus } from '../state/AppState';
import { WEB_MAX_WIDTH, WebFooter, WebHeader } from './WebHeader';

export type AccountTab = 'stamps' | 'orders';

const TABS: { id: AccountTab; label: string; href: '/loyalty' | '/orders' }[] = [
  { id: 'stamps', label: 'Mis sellos', href: '/loyalty' },
  { id: 'orders', label: 'Mis pedidos', href: '/orders' },
];

const ACTIVE_LABEL: Record<OrderStatus, string> = {
  received: 'Recibido',
  preparing: 'Preparando',
  ready: '¡Listo para recoger!',
  cancelled: 'Cancelado',
};

const CARD_STYLE: Record<StampCardTone, { bg: string; fg: string; border: string; bar: string; track: string }> = {
  accent: { bg: t.colors.primary, fg: t.colors.onPrimary, border: t.colors.primary, bar: t.colors.onPrimary, track: 'rgba(0,0,0,0.18)' },
  reward: { bg: t.tones.success.tint, fg: t.tones.success.onTint, border: t.tones.success.border, bar: t.tones.success.onTint, track: 'rgba(0,0,0,0.12)' },
  plain: { bg: t.colors.surface, fg: t.colors.text, border: t.colors.border, bar: t.colors.primary, track: t.colors.surfaceMuted },
};

export function WebAccount({ tab }: { tab: AccountTab }) {
  const { session, order } = useAppState();
  const name = session?.name ?? MOCK_CUSTOMER_NAME;
  const active = order && order.status !== 'cancelled' ? order : null;

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <WebHeader />
        <View style={styles.main}>
          <View style={styles.titleRow}>
            <AppText variant="display" accessibilityRole="header" aria-level={1}>
              Hola, {name}
            </AppText>
            <View accessibilityRole="tablist" aria-label="Secciones" style={styles.tabs}>
              {TABS.map((item) => {
                const on = item.id === tab;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    onPress={() => !on && router.navigate(item.href)}
                    style={[styles.tab, on && styles.tabOn]}
                  >
                    <AppText variant="bodyStrong" color={on ? t.colors.text : t.palette.stone700}>
                      {item.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
          {tab === 'stamps' ? <Stamps /> : <Orders activeOrder={active} />}
        </View>
        <WebFooter />
      </ScrollView>
    </View>
  );
}

function Stamps() {
  const cards = stampCards(SHOPS, SHOPS[0]!.id);
  return (
    <View style={styles.stamps}>
      <View style={styles.cards}>
        {cards.map((c) => {
          const s = CARD_STYLE[c.tone];
          return (
            <View
              key={c.shopId}
              accessible
              accessibilityLabel={`${c.name}: ${c.count} sellos. ${c.note}`}
              style={[styles.stampCard, { backgroundColor: s.bg, borderColor: s.border }]}
            >
              <View style={styles.between}>
                <AppText variant="bodyStrong" color={s.fg}>
                  {c.name}
                </AppText>
                <AppText variant="h2" color={s.fg}>
                  {c.count}
                </AppText>
              </View>
              <View style={[styles.track, { backgroundColor: s.track }]}>
                <View style={{ width: `${c.percent}%`, height: 8, backgroundColor: s.bar }} />
              </View>
              <AppText variant="bodySm" color={s.fg}>
                {c.note}
              </AppText>
            </View>
          );
        })}
      </View>
      <View style={styles.qrCard}>
        <AppText variant="h3" accessibilityRole="header" aria-level={2}>
          Tu código MiBarra
        </AppText>
        <QrPlaceholder seed={1} size={180} label="Código QR de tu cuenta (vista previa)" />
        <AppText variant="bodySm" color={t.colors.textMuted} style={styles.center}>
          Muéstralo en caja para sumar sellos en compras sin la app o canjear recompensas.
        </AppText>
      </View>
    </View>
  );
}

function Orders({ activeOrder }: { activeOrder: ReturnType<typeof useAppState>['order'] }) {
  const rows = PAST_ORDERS.map(pastOrderRow);
  const empty = !activeOrder && rows.length === 0;
  if (empty) {
    return <EmptyState icon="file-text" title="Aún no tienes pedidos" body="Cuando hagas un pedido, lo verás aquí." />;
  }
  return (
    <Card style={styles.tableCard}>
      <ScrollView horizontal>
        <View accessibilityRole="table" style={styles.table}>
          <View accessibilityRole="row" style={styles.tr}>
            {['Fecha', 'Cafetería', 'Productos', 'Total', 'Estado', ''].map((h, i) => (
              <AppText key={`${h}-${i}`} variant="caption" accessibilityRole="columnheader" color={t.colors.textMuted} style={COLS[i]}>
                {h}
              </AppText>
            ))}
          </View>
          {activeOrder ? (
            <View accessibilityRole="row" style={[styles.tr, styles.trBorder]}>
              <AppText variant="body" style={COLS[0]}>
                Hoy
              </AppText>
              <AppText variant="bodyStrong" style={COLS[1]}>
                {activeOrder.shopName}
              </AppText>
              <AppText variant="body" color={t.palette.stone700} style={COLS[2]}>
                {activeOrder.lines.map((l) => l.name).join(', ')}
              </AppText>
              <AppText variant="bodyStrong" style={COLS[3]}>
                {formatLempiras(activeOrder.totalCents)}
              </AppText>
              <View style={COLS[4]}>
                <Badge label={ACTIVE_LABEL[activeOrder.status]} tone="warning" />
              </View>
              <Pressable accessibilityRole="link" accessibilityLabel={`Seguir pedido ${activeOrder.code}`} onPress={() => router.push('/tracking')} style={[styles.action, COLS[5]]}>
                <AppText variant="bodyStrong" style={styles.underline}>
                  Seguir pedido
                </AppText>
              </Pressable>
            </View>
          ) : null}
          {rows.map((r) => (
            <View key={r.id} accessibilityRole="row" style={[styles.tr, styles.trBorder]}>
              <AppText variant="body" style={COLS[0]}>
                {r.date}
              </AppText>
              <AppText variant="bodyStrong" style={COLS[1]}>
                {r.shop}
              </AppText>
              <AppText variant="body" color={t.palette.stone700} style={COLS[2]}>
                {r.items}
              </AppText>
              <AppText variant="bodyStrong" style={COLS[3]}>
                {formatLempiras(r.totalCents)}
              </AppText>
              <View style={COLS[4]}>
                <Badge label={r.status} tone={r.tone} />
              </View>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`${r.action === 'reorder' ? 'Pedir de nuevo' : 'Ver detalle'}, ${r.shop}, ${r.date}`}
                onPress={() => {
                  const shop = SHOPS.find((s) => s.name === r.shop);
                  if (r.action === 'reorder' && shop) router.push(shopHref(shop));
                }}
                disabled={r.action === 'detail'}
                style={[styles.action, COLS[5]]}
              >
                <AppText variant="bodyStrong" color={r.action === 'detail' ? t.colors.textMuted : t.colors.text} style={styles.underline}>
                  {r.action === 'reorder' ? 'Pedir de nuevo' : 'Ver detalle'}
                </AppText>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </Card>
  );
}

const COLS = [{ width: 150 }, { width: 140 }, { flex: 1, minWidth: 180 }, { width: 90 }, { width: 190 }, { width: 130, alignItems: 'flex-end' as const }];

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: t.colors.background },
  scroll: { flexGrow: 1 },
  center: { textAlign: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  main: { width: '100%', maxWidth: WEB_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 36, paddingBottom: 64, gap: 24 },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  tabs: { flexDirection: 'row', padding: 4, borderRadius: 14, backgroundColor: t.colors.border },
  tab: { minHeight: 44, paddingHorizontal: 18, borderRadius: 10, justifyContent: 'center' },
  tabOn: { backgroundColor: t.colors.surface },
  stamps: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' },
  cards: { flexGrow: 999, flexShrink: 1, flexBasis: 520, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  stampCard: { flexGrow: 1, flexBasis: 260, gap: 12, padding: 20, borderRadius: 20, borderWidth: 1 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  qrCard: { flexGrow: 1, flexBasis: 280, alignItems: 'center', gap: 14, padding: 24, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, borderRadius: 22 },
  tableCard: { padding: 0, borderRadius: 22, overflow: 'hidden' },
  table: { minWidth: 760, flexGrow: 1 },
  tr: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  trBorder: { borderTopWidth: 1, borderTopColor: t.colors.surfaceMuted },
  action: { minHeight: 44, justifyContent: 'center' },
  underline: { textDecorationLine: 'underline' },
});
