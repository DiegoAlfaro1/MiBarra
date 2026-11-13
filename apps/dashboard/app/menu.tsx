import { Pressable, StyleSheet, Text, View } from 'react-native';

import { countSoldOut, formatLempiras } from '../src/logic/dashboard.ts';
import { MENU } from '../src/mock/data.ts';
import { useDashboard } from '../src/state/DashboardState.tsx';
import { colors, tones, typography } from '../src/theme.ts';

export default function MenuAvailability() {
  const { soldOut, toggleProduct } = useDashboard();
  return (
    <View style={styles.page}>
      <View style={styles.head}>
        <View style={{ flexShrink: 1, gap: 4 }}>
          <Text accessibilityRole="header" style={typography.h1}>¿Qué hay hoy?</Text>
          <Text style={styles.sub}>Un toque marca un producto como agotado. Los clientes lo ven en gris al instante.</Text>
        </View>
        <Text style={styles.pill} accessibilityLiveRegion="polite">{countSoldOut(soldOut)} agotados</Text>
      </View>
      {MENU.map((g) => (
        <View key={g.title} style={styles.group}>
          <Text accessibilityRole="header" style={styles.groupTitle}>{g.title}</Text>
          {g.items.map((it) => {
            const out = !!soldOut[it.id];
            return (
              <View key={it.id} style={styles.row}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.name, out && styles.nameOut]}>{it.name}</Text>
                  <Text style={styles.price}>{formatLempiras(it.price)}</Text>
                </View>
                <Text style={[styles.state, out ? styles.stateOut : styles.stateOk]}>{out ? 'Agotado' : 'Disponible'}</Text>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: !out }}
                  accessibilityLabel={`Disponible: ${it.name}`}
                  onPress={() => toggleProduct(it.id)}
                  style={[styles.track, { backgroundColor: out ? colors.disabled : tones.success.solid, justifyContent: out ? 'flex-start' : 'flex-end' }]}
                >
                  <View style={styles.knob} />
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 1000, alignSelf: 'center', padding: 24, gap: 20 },
  head: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  sub: { fontSize: 15, color: colors.textMuted },
  pill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.surface, fontSize: 15, fontWeight: '600', overflow: 'hidden', color: colors.text },
  group: { backgroundColor: colors.surface, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  groupTitle: { paddingHorizontal: 20, paddingVertical: 14, fontSize: 16, fontWeight: '700', backgroundColor: '#FAFAF9', color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted },
  name: { fontSize: 17, fontWeight: '600', color: colors.text },
  nameOut: { color: colors.textMuted, textDecorationLine: 'line-through' },
  price: { fontSize: 14, color: colors.textMuted },
  state: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, fontSize: 13, fontWeight: '700', overflow: 'hidden' },
  stateOk: { backgroundColor: tones.success.tint, color: tones.success.onTint },
  stateOut: { backgroundColor: colors.secondary, color: colors.onSecondary },
  track: { width: 72, height: 44, borderRadius: 22, padding: 4, flexDirection: 'row' },
  knob: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF' },
});
