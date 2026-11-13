import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { OrderCard } from '../src/components/OrderCard.tsx';
import { CANCEL_REASONS, countUnpaid, ordersWithStatus, type LiveStatus } from '../src/logic/dashboard.ts';
import { SUMMARY } from '../src/mock/data.ts';
import { useDashboard } from '../src/state/DashboardState.tsx';
import { formatLempiras } from '../src/logic/dashboard.ts';
import { colors, radii, tones, typography } from '../src/theme.ts';

const COLUMNS: { status: LiveStatus; title: string; dot: string }[] = [
  { status: 'pending', title: 'Nuevos', dot: tones.accent.solid },
  { status: 'preparing', title: 'Preparando', dot: tones.warning.solid },
  { status: 'ready', title: 'Listos para recoger', dot: tones.success.solid },
];

export default function LiveOrders() {
  const { open, alertVisible, dismissAlert, orders, cancel } = useDashboard();
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [reason, setReason] = useState(0);
  const target = orders.find((o) => o.id === cancelId);
  const newest = ordersWithStatus(orders, 'pending')[0];

  return (
    <View style={styles.page}>
      {open && alertVisible && newest ? (
        <View accessibilityRole="alert" style={styles.alert}>
          <Text style={styles.alertText}>🔔 ¡Pedido nuevo! #{newest.id} · {newest.name} · recoger {newest.pickup}</Text>
          <Pressable accessibilityRole="button" onPress={dismissAlert} style={styles.alertBtn}>
            <Text style={styles.alertBtnText}>Visto</Text>
          </Pressable>
        </View>
      ) : null}
      {!open ? (
        <Text accessibilityRole="summary" style={styles.paused}>
          Pedidos en pausa: los clientes ven la cafetería como cerrada. Los pedidos en curso siguen aquí.
        </Text>
      ) : null}

      <View style={styles.chips}>
        <Text style={styles.chip}><Text style={styles.bold}>Hoy:</Text> {SUMMARY.orders} pedidos</Text>
        <Text style={styles.chip}><Text style={styles.bold}>Ventas:</Text> {formatLempiras(SUMMARY.sales)}</Text>
        <Text style={styles.chip}><Text style={styles.bold}>Por cobrar en caja:</Text> {countUnpaid(orders)}</Text>
      </View>

      <View style={styles.columns}>
        {COLUMNS.map((col) => {
          const cards = ordersWithStatus(orders, col.status);
          return (
            <View key={col.status} style={styles.column} accessibilityLabel={col.title}>
              <View style={styles.colHead}>
                <View style={styles.colTitle}>
                  <View style={[styles.dot, { backgroundColor: col.dot }]} />
                  <Text accessibilityRole="header" style={styles.colTitleText}>{col.title}</Text>
                </View>
                <Text style={styles.count}>{cards.length}</Text>
              </View>
              {cards.map((o) => (
                <OrderCard key={o.id} order={o} onCancel={() => { setCancelId(o.id); setReason(0); }} />
              ))}
              {cards.length === 0 ? <Text style={styles.empty}>Sin pedidos aquí</Text> : null}
            </View>
          );
        })}
      </View>

      <Modal transparent visible={!!target} animationType="fade" onRequestClose={() => setCancelId(null)}>
        <View style={styles.scrim}>
          <View accessibilityViewIsModal aria-modal style={styles.dialog} accessibilityLabel="Cancelar pedido">
            <Text accessibilityRole="header" style={typography.h2}>Cancelar pedido de {target?.name}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 15 }}>El cliente verá el motivo en su app.</Text>
            {CANCEL_REASONS.map((label, i) => (
              <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: reason === i }} onPress={() => setReason(i)}
                style={[styles.reason, reason === i && styles.reasonOn]}>
                <Text style={[styles.reasonText, reason === i && { color: colors.textInverse }]}>{label}</Text>
              </Pressable>
            ))}
            <View style={styles.dialogBtns}>
              <Pressable accessibilityRole="button" onPress={() => setCancelId(null)} style={[styles.dBtn, styles.dBack]}>
                <Text style={styles.dBackText}>Volver</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => { if (cancelId) cancel(cancelId); setCancelId(null); }} style={[styles.dBtn, { backgroundColor: tones.danger.solid }]}>
                <Text style={styles.dConfirmText}>Cancelar pedido</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: 32 },
  alert: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 24, paddingVertical: 14, backgroundColor: colors.primary },
  alertText: { color: colors.onPrimary, fontSize: 18, fontWeight: '700', flexShrink: 1 },
  alertBtn: { minHeight: 44, paddingHorizontal: 18, borderRadius: radii.control, borderWidth: 2, borderColor: '#FFFFFF', justifyContent: 'center' },
  alertBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  paused: { paddingHorizontal: 24, paddingVertical: 14, backgroundColor: '#44403C', color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 24, paddingTop: 20 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radii.control, backgroundColor: colors.surface, fontSize: 15, color: colors.text, overflow: 'hidden' },
  bold: { fontWeight: '700' },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, padding: 24, alignItems: 'flex-start' },
  column: { flexGrow: 1, flexBasis: 300, gap: 12, padding: 14, borderRadius: 20, backgroundColor: colors.border },
  colHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 4 },
  colTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colTitleText: { fontSize: 17, fontWeight: '700', color: colors.text },
  dot: { width: 12, height: 12, borderRadius: 6 },
  count: { minWidth: 28, height: 28, paddingHorizontal: 8, borderRadius: 14, backgroundColor: colors.surface, textAlign: 'center', lineHeight: 28, fontSize: 14, fontWeight: '700', overflow: 'hidden', color: colors.text },
  empty: { padding: 20, textAlign: 'center', fontSize: 15, color: colors.textMuted },
  scrim: { flex: 1, backgroundColor: 'rgba(28,25,23,0.6)', alignItems: 'center', paddingTop: 120, paddingHorizontal: 16 },
  dialog: { width: '100%', maxWidth: 480, backgroundColor: colors.surface, borderRadius: 24, padding: 24, gap: 14 },
  reason: { minHeight: 52, paddingHorizontal: 16, borderRadius: 14, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center' },
  reasonOn: { backgroundColor: colors.text, borderColor: colors.text },
  reasonText: { fontSize: 16, fontWeight: '600', color: colors.text },
  dialogBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  dBtn: { flex: 1, minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dBack: { borderWidth: 2, borderColor: colors.text, backgroundColor: colors.surface },
  dBackText: { fontSize: 16, fontWeight: '700', color: colors.text },
  dConfirmText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
