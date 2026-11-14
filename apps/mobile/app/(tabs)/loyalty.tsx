import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar, Card, DemoBadge, QrPlaceholder, Screen, t } from '../../src/components/ui';
import { SHOPS } from '../../src/data/mock';
import { useIsWide } from '../../src/lib/useIsWide';
import { WebAccount } from '../../src/web/WebAccount';

export default function LoyaltyRoute() {
  return useIsWide() ? <WebAccount tab="stamps" /> : <Loyalty />;
}

function Loyalty() {
  const main = SHOPS[0]!;
  const others = SHOPS.slice(1).reverse();
  const accent = t.colors.primary;

  return (
    <Screen>
      <AppText variant="h1" accessibilityRole="header">
        Mis sellos
      </AppText>

      <View style={[styles.card, { backgroundColor: accent }]}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <AppText variant="h2" color={t.colors.onPrimary}>
              {main.name}
            </AppText>
            <AppText variant="bodyStrong" color={t.colors.onPrimary}>
              {main.stamps} de {main.stampGoal} sellos
            </AppText>
            <AppText variant="caption" color={t.colors.onPrimary}>
              Con {main.stampGoal} sellos: una bebida gratis
            </AppText>
          </View>
          <Avatar initials={main.initials} />
        </View>

        <View accessible accessibilityRole="image" accessibilityLabel={`${main.stamps} de ${main.stampGoal} sellos`} style={styles.grid}>
          {Array.from({ length: main.stampGoal }, (_, i) => (
            <View key={i} style={styles.cell}>
              {i < main.stamps ? (
                <View style={[styles.stamp, { backgroundColor: t.colors.surface }]}>
                  <Feather name="coffee" size={22} color={accent} />
                </View>
              ) : (
                <View style={[styles.stamp, styles.stampEmpty]} />
              )}
            </View>
          ))}
        </View>

        <View style={styles.qrBox}>
          <QrPlaceholder seed={1} size={96} label="Código QR de tu tarjeta" />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">Muéstralo en caja</AppText>
            <AppText variant="caption" color={t.colors.textMuted}>
              Para sumar sellos en compras sin la app o canjear tu recompensa.
            </AppText>
          </View>
        </View>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Agregar a Wallet, vista previa" style={styles.wallet} onPress={() => undefined}>
        <Feather name="credit-card" size={20} color={t.colors.onSecondary} />
        <AppText variant="button" color={t.colors.onSecondary}>
          Agregar a Wallet
        </AppText>
        <DemoBadge label="VISTA PREVIA" />
      </Pressable>

      <AppText variant="h2" accessibilityRole="header">
        Otras cafeterías
      </AppText>
      {others.map((shop) => {
        const complete = shop.stamps >= shop.stampGoal;
        return (
          <Pressable
            key={shop.id}
            accessibilityRole={complete ? 'button' : 'text'}
            accessibilityLabel={`${shop.name}: ${shop.stamps} de ${shop.stampGoal} sellos${complete ? '. Recompensa lista, toca para canjear' : ''}`}
            onPress={complete ? () => router.push('/reward') : undefined}
          >
            <Card style={styles.other}>
              <Avatar initials={shop.initials} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{shop.name}</AppText>
                {complete ? (
                  <AppText variant="caption" color={t.colors.textSuccess}>
                    ¡Recompensa lista! Toca para canjear
                  </AppText>
                ) : (
                  <View style={styles.bar}>
                    <View style={[styles.barFill, { width: `${(shop.stamps / shop.stampGoal) * 100}%`, backgroundColor: accent }]} />
                  </View>
                )}
              </View>
              <AppText variant="h3">
                {shop.stamps}/{shop.stampGoal}
              </AppText>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: { borderRadius: t.radii.cardLg, padding: 18, gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  cell: { width: '25%', alignItems: 'center' },
  stamp: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  stampEmpty: { borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.7)' },
  qrBox: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, backgroundColor: t.colors.surface, borderRadius: t.radii.cardSm },
  wallet: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: t.controlHeights.xl, backgroundColor: t.colors.secondary, borderRadius: t.radii.controlLg },
  other: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bar: { height: 8, borderRadius: 4, backgroundColor: t.colors.surfaceMuted, overflow: 'hidden', marginTop: 6 },
  barFill: { height: 8, borderRadius: 4 },
});
