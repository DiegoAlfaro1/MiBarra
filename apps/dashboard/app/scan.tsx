import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { addStamp, isCardFull, redeem, STAMPS_PER_CARD } from '../src/logic/dashboard.ts';
import { SCANNED_CUSTOMER } from '../src/mock/data.ts';
import { colors, theme, tones, typography } from '../src/theme.ts';

export default function Scan() {
  // The camera is a placeholder in this UI-only story: "scanned" simulates reading a customer's QR.
  const [scanned, setScanned] = useState(false);
  const [count, setCount] = useState(SCANNED_CUSTOMER.stamps);
  const [flash, setFlash] = useState('');
  const full = isCardFull(count);
  const c = SCANNED_CUSTOMER;

  return (
    <View style={styles.page}>
      <View accessibilityLabel="Cámara" style={styles.camera}>
        <View style={styles.frame}>
          {(['tl', 'tr', 'bl', 'br'] as const).map((k) => <View key={k} style={[styles.corner, styles[k]]} />)}
          <View style={styles.line} />
        </View>
        <Text style={styles.camTitle}>Apunta al código QR del cliente</Text>
        <Text style={styles.camSub}>Vista de la cámara del dispositivo</Text>
        {!scanned ? (
          <Pressable accessibilityRole="button" onPress={() => setScanned(true)} style={styles.simulate}>
            <Text style={styles.simulateText}>Simular escaneo (demo)</Text>
          </Pressable>
        ) : null}
      </View>

      <View accessibilityLiveRegion="polite" style={styles.panel}>
        {!scanned ? (
          <View style={styles.waiting}>
            <Text style={styles.waitTitle}>Esperando código</Text>
            <Text style={styles.waitText}>Escanea para sumar un sello a una compra en caja o para canjear una recompensa.</Text>
          </View>
        ) : (
          <>
            <View style={styles.who}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{c.initial}</Text></View>
              <View style={{ flexShrink: 1 }}>
                <Text style={typography.h2}>{c.name}</Text>
                <Text style={styles.meta}>{c.meta}</Text>
              </View>
            </View>
            <View style={[styles.card, { backgroundColor: full ? tones.success.tint : colors.background }]}>
              <View style={styles.cardTop}>
                <Text style={[styles.cardLabel, { color: full ? tones.success.onTint : colors.text }]}>Tarjeta de sellos</Text>
                <Text style={[typography.h1, { color: full ? tones.success.onTint : colors.text }]}>{count}/{STAMPS_PER_CARD}</Text>
              </View>
              <View style={styles.stamps}>
                {Array.from({ length: STAMPS_PER_CARD }, (_, i) => (
                  <View key={i} style={[styles.stamp, i < count ? { backgroundColor: full ? tones.success.onTint : colors.primary } : styles.stampEmpty]} />
                ))}
              </View>
              <Text style={[styles.cardLabel, { color: full ? tones.success.onTint : colors.text }]}>
                {full ? 'Recompensa lista: una bebida gratis' : `${STAMPS_PER_CARD - count} sellos más para la recompensa`}
              </Text>
            </View>
            {flash ? <Text accessibilityRole="alert" style={styles.flash}>{flash}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: full }} disabled={full}
              onPress={() => { setCount(addStamp(count)); setFlash('Sello agregado'); }}
              style={[styles.big, full ? styles.bigOff : { backgroundColor: colors.secondary }]}>
              <Text style={[styles.bigText, { color: full ? colors.textSubtle : '#FFFFFF' }]}>Sumar 1 sello · compra en caja</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !full }} disabled={!full}
              onPress={() => { setCount(redeem(count)); setFlash('Recompensa canjeada. La tarjeta vuelve a 0.'); }}
              style={[styles.big, full ? { backgroundColor: tones.success.solid } : styles.bigOutline]}>
              <Text style={[styles.bigText, { color: full ? '#FFFFFF' : colors.textSubtle }]}>Canjear bebida gratis</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const corner = { position: 'absolute', width: 48, height: 48, borderColor: '#FFFFFF' } as const;
const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 1100, alignSelf: 'center', padding: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 20, alignItems: 'stretch' },
  camera: { flexGrow: 1, flexBasis: 380, minHeight: 460, borderRadius: 24, backgroundColor: theme.palette.stone800, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
  frame: { width: 240, height: 240 },
  corner,
  tl: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 12 },
  tr: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 12 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 12 },
  br: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 12 },
  line: { position: 'absolute', left: 16, right: 16, top: '50%', height: 3, backgroundColor: colors.primary },
  camTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  camSub: { color: '#D6D3D1', fontSize: 14, textAlign: 'center' },
  simulate: { minHeight: 48, paddingHorizontal: 18, borderRadius: 12, borderWidth: 2, borderColor: '#FFFFFF', justifyContent: 'center' },
  simulateText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  panel: { flexGrow: 1, flexBasis: 380, gap: 16, padding: 24, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  waiting: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  waitTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  waitText: { fontSize: 15, lineHeight: 22, maxWidth: 300, textAlign: 'center', color: colors.textMuted },
  who: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  meta: { fontSize: 14, color: colors.textMuted },
  card: { gap: 12, padding: 18, borderRadius: 18 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  cardLabel: { fontSize: 15, fontWeight: '600' },
  stamps: { flexDirection: 'row', gap: 8 },
  stamp: { flex: 1, aspectRatio: 1, borderRadius: 999 },
  stampEmpty: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.stampEmpty },
  flash: { padding: 12, borderRadius: 12, backgroundColor: tones.success.tint, color: tones.success.onTint, fontSize: 15, fontWeight: '700', overflow: 'hidden' },
  big: { minHeight: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bigOff: { backgroundColor: colors.border },
  bigOutline: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border },
  bigText: { fontSize: 17, fontWeight: '700' },
});
