import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, BackHeader, Banner, Button, QrPlaceholder, Screen, t } from '../src/components/ui';
import { REWARD_CODE, SHOPS } from '../src/data/mock';

export default function Reward() {
  const shop = SHOPS.find((s) => s.id === 'valle')!;
  return (
    <Screen
      header={<BackHeader title={shop.name} backLabel="Volver a mis sellos" />}
      footer={<Button label="Usarla en mi próximo pedido" variant="dark" onPress={() => router.replace('/')} />}
    >
      <View style={styles.hero}>
        <AppText variant="overline" color={t.colors.textSuccess}>
          {shop.stamps}/{shop.stampGoal} sellos
        </AppText>
        <AppText variant="h1" style={styles.center} accessibilityRole="header">
          Tu bebida gratis te espera
        </AppText>
        <AppText variant="body" color={t.colors.textMuted} style={styles.center}>
          Cualquier bebida mediana del menú. Muestra este código en caja para canjearla.
        </AppText>
      </View>
      <View style={styles.qrCard}>
        <QrPlaceholder seed={2} size={196} label="Código QR de canje" />
        <AppText variant="code" accessibilityLabel={`Código ${REWARD_CODE.split('').join(' ')}`} selectable>
          {REWARD_CODE}
        </AppText>
      </View>
      <Banner tone="success" icon="gift">
        Al canjearla, tu tarjeta vuelve a 0 sellos y empiezas a juntar la siguiente.
      </Banner>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  hero: { alignItems: 'center', gap: 8 },
  qrCard: { alignItems: 'center', gap: 14, padding: 24, backgroundColor: t.colors.surface, borderRadius: t.radii.sheet, borderWidth: 1, borderColor: t.colors.border },
});
