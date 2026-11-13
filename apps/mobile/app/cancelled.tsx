import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, BackHeader, Button, Card, Screen, t } from '../src/components/ui';
import { useAppState } from '../src/state/AppState';

export default function Cancelled() {
  const { by } = useLocalSearchParams<{ by?: string }>();
  const { order, session } = useAppState();
  const byShop = by !== 'cliente';
  const shopName = order?.shopName ?? 'Café Lempa';
  const code = order?.code ?? 'A-1042';
  const name = session?.name ?? 'Diego';

  return (
    <Screen
      header={<BackHeader icon="home" backLabel="Ir al inicio" title={`Pedido #${code}`} onBack={() => router.replace('/')} />}
      footer={
        <>
          <Button label="Volver al menú" variant="dark" onPress={() => router.replace({ pathname: '/shop/[id]', params: { id: order?.shopId ?? 'lempa' } })} />
          <Button label="Probar otra cafetería" variant="outline" onPress={() => router.replace('/')} />
        </>
      }
    >
      <View accessibilityRole="alert" style={styles.hero}>
        <View style={styles.icon}>
          <Feather name="x" size={40} color={t.colors.textInverse} />
        </View>
        <AppText variant="h1" style={styles.center} accessibilityRole="header">
          {byShop ? `${shopName} canceló tu pedido` : 'Cancelaste tu pedido'}
        </AppText>
        <AppText variant="body" color={t.colors.textMuted} style={styles.center}>
          {byShop
            ? 'Lo sentimos. Abajo está el motivo que nos dejó la cafetería.'
            : 'Listo, la cafetería ya fue avisada y no preparará tu pedido.'}
        </AppText>
      </View>

      {byShop ? (
        <Card style={[styles.reason, { backgroundColor: t.tones.danger.tint }]}>
          <AppText variant="overline" color={t.tones.danger.onTint}>
            Motivo de la cafetería
          </AppText>
          <AppText variant="body" color={t.tones.danger.onTint}>
            “Se nos acabó la leche de almendra. Disculpa, {name}.”
          </AppText>
        </Card>
      ) : null}

      <Card style={styles.list}>
        {['No se hizo ningún cobro', 'Los pedidos cancelados no suman sellos'].map((text) => (
          <View key={text} style={styles.li}>
            <Feather name="check-circle" size={20} color={t.colors.textSuccess} />
            <AppText variant="body">{text}</AppText>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  hero: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  icon: { width: 80, height: 80, borderRadius: 40, backgroundColor: t.colors.textDanger, alignItems: 'center', justifyContent: 'center' },
  reason: { gap: 6, borderColor: t.tones.danger.border },
  list: { gap: 12 },
  li: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
