import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { canCancel, type DashOrder } from '../logic/dashboard.ts';
import { useDashboard } from '../state/DashboardState.tsx';
import { colors, radii, theme, tones, typography } from '../theme.ts';

const ADVANCE_LABEL = { pending: 'Aceptar y preparar', preparing: 'Marcar listo', ready: 'Entregado · +1 sello' } as const;

export function OrderCard({ order, onCancel }: { order: DashOrder; onCancel: () => void }) {
  const { advance, pay } = useDashboard();
  const pay_ = theme.paymentStatus(order.paid ? 'paid' : 'unpaid');
  return (
    <View accessibilityRole="summary" style={[styles.card, order.status === 'pending' ? styles.cardNew : styles.cardOld]}>
      <View style={styles.top}>
        <View style={{ flexShrink: 1 }}>
          <Text style={typography.h2}>{order.name}</Text>
          <Text style={styles.meta}>#{order.id} · recoger {order.pickup}</Text>
        </View>
        <Text style={[styles.badge, { backgroundColor: pay_.tint, color: pay_.onTint }]}>{pay_.label}</Text>
      </View>
      <View style={{ gap: 6 }}>
        {order.lines.map((l, i) => (
          <View key={i}>
            <Text style={styles.line}>{l.main}</Text>
            {l.opts ? <Text style={styles.opts}>{l.opts}</Text> : null}
          </View>
        ))}
      </View>
      {order.note ? <Text style={styles.note}>Nota: {order.note}</Text> : null}
      <View style={styles.row}>
        <Pressable accessibilityRole="button" onPress={() => advance(order.id)} style={styles.advance}>
          <Text style={styles.advanceText}>{ADVANCE_LABEL[order.status]}</Text>
        </Pressable>
        {!order.paid ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Cobrado, pedido de ${order.name}`} onPress={() => pay(order.id)} style={styles.paid}>
            <Text style={styles.paidText}>Cobrado</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.row}>
        {order.status === 'ready' ? (
          <Pressable accessibilityRole="link" onPress={() => void Linking.openURL('https://wa.me/')} style={styles.wa}>
            <Text style={styles.waText}>Avisar por WhatsApp</Text>
          </Pressable>
        ) : null}
        {canCancel(order) ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Cancelar pedido de ${order.name}`} onPress={onCancel} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 16, borderRadius: 16, backgroundColor: colors.surface },
  cardNew: { borderWidth: 2, borderColor: colors.primary },
  cardOld: { borderWidth: 1, borderColor: colors.borderStrong },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  meta: { fontSize: 14, color: colors.textMuted },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.sm, fontSize: 12, fontWeight: '700', overflow: 'hidden' },
  line: { fontSize: 16, fontWeight: '600', color: colors.text },
  opts: { fontSize: 14, color: '#44403C' },
  note: { padding: 8, borderRadius: 10, backgroundColor: tones.warning.tint, color: tones.warning.onTint, fontSize: 14, fontWeight: '600', overflow: 'hidden' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  advance: { flexGrow: 1, flexBasis: 140, minHeight: 52, borderRadius: 14, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  advanceText: { color: colors.onSecondary, fontSize: 16, fontWeight: '700' },
  paid: { minHeight: 52, paddingHorizontal: 14, borderRadius: 14, borderWidth: 2, borderColor: colors.text, justifyContent: 'center' },
  paidText: { fontSize: 15, fontWeight: '700', color: colors.text },
  wa: { flexGrow: 1, flexBasis: 160, minHeight: 48, borderRadius: 14, backgroundColor: tones.success.solid, alignItems: 'center', justifyContent: 'center' },
  waText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  cancel: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: colors.textDanger, textDecorationLine: 'underline' },
});
