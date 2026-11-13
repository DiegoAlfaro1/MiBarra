import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatLempiras } from '../src/logic/dashboard.ts';
import { SUMMARY } from '../src/mock/data.ts';
import { colors, typography } from '../src/theme.ts';

const S = SUMMARY;

function Kpi({ label, value, hint, dark }: { label: string; value: string; hint?: string; dark?: boolean }) {
  const fg = dark ? colors.textInverse : colors.text;
  return (
    <View style={[styles.kpi, { backgroundColor: dark ? colors.surfaceInverse : colors.surface }]}>
      <Text style={[styles.kpiLabel, { color: dark ? '#D6D3D1' : colors.textMuted }]}>{label}</Text>
      <Text style={[typography.displayLg, { color: fg }]}>{value}</Text>
      {hint ? <Text style={[styles.hint, { color: dark ? '#D6D3D1' : colors.textMuted }]}>{hint}</Text> : null}
    </View>
  );
}

export default function Summary() {
  return (
    <View style={styles.page}>
      <View style={{ gap: 4 }}>
        <Text accessibilityRole="header" style={typography.h1}>Resumen de hoy</Text>
        <Text style={styles.sub}>{S.dateLabel}</Text>
      </View>
      <View style={styles.kpis}>
        <Kpi dark label="Ventas por MiBarra" value={formatLempiras(S.sales, 0)} />
        <Kpi label="Pedidos" value={String(S.orders)} hint={`${S.delivered} entregados · ${S.cancelled} cancelados`} />
        <Kpi label="Ticket promedio" value={formatLempiras(S.avgTicket, 0)} />
        <Kpi label="Sellos entregados" value={String(S.stamps)} hint={`${S.redeemed} recompensas canjeadas`} />
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.h2}>Cómo pagaron</Text>
        <View accessibilityRole="image" accessibilityLabel={`En caja ${formatLempiras(S.cash, 0)}; tarjeta en línea ${formatLempiras(S.card, 0)}`} style={styles.bar}>
          <View style={{ flex: S.cash, backgroundColor: colors.secondary }} />
          <View style={{ flex: S.card, backgroundColor: colors.primary }} />
        </View>
        <View style={styles.legend}>
          <Text style={styles.legendItem}><Text style={{ color: colors.secondary }}>■</Text> En caja · {formatLempiras(S.cash, 0)}</Text>
          <Text style={styles.legendItem}><Text style={{ color: colors.primary }}>■</Text> Tarjeta en línea (demo) · {formatLempiras(S.card, 0)}</Text>
        </View>
      </View>

      <ScrollView horizontal style={styles.tableWrap} contentContainerStyle={{ minWidth: 560, flexGrow: 1 }}>
        <View style={{ flex: 1 }} accessibilityRole="summary">
          <Text accessibilityRole="header" style={styles.caption}>Últimos pedidos entregados</Text>
          <View style={styles.tr}>
            {['Hora', 'Cliente', 'Productos', 'Pago', 'Total'].map((h, i) => (
              <Text key={h} style={[styles.th, cell[i], i === 4 && { textAlign: 'right' }]}>{h}</Text>
            ))}
          </View>
          {S.recent.map((r, n) => (
            <View key={n} style={[styles.tr, styles.trBody]}>
              <Text style={[styles.td, cell[0]]}>{r.time}</Text>
              <Text style={[styles.td, cell[1], { fontWeight: '600' }]}>{r.who}</Text>
              <Text style={[styles.td, cell[2], { color: '#44403C' }]}>{r.items}</Text>
              <Text style={[styles.td, cell[3]]}>{r.pay}</Text>
              <Text style={[styles.td, cell[4], { textAlign: 'right', fontWeight: '600' }]}>{formatLempiras(r.total)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const cell = [{ flex: 1.1 }, { flex: 1 }, { flex: 2.2 }, { flex: 1.3 }, { flex: 1 }];
const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 1100, alignSelf: 'center', padding: 24, gap: 20 },
  sub: { fontSize: 15, color: colors.textMuted },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  kpi: { flexGrow: 1, flexBasis: 220, gap: 6, padding: 22, borderRadius: 20 },
  kpiLabel: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 14 },
  section: { gap: 12, padding: 22, borderRadius: 20, backgroundColor: colors.surface },
  h2: { fontSize: 17, fontWeight: '700', color: colors.text },
  bar: { flexDirection: 'row', height: 20, borderRadius: 10, overflow: 'hidden' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  legendItem: { fontSize: 15, color: colors.text },
  tableWrap: { backgroundColor: colors.surface, borderRadius: 20 },
  caption: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6, fontSize: 17, fontWeight: '700', color: colors.text },
  tr: { flexDirection: 'row' },
  trBody: { borderTopWidth: 1, borderTopColor: colors.surfaceMuted },
  th: { paddingHorizontal: 20, paddingVertical: 10, fontSize: 13, fontWeight: '600', color: colors.textMuted },
  td: { paddingHorizontal: 20, paddingVertical: 14, fontSize: 15, color: colors.text },
});
