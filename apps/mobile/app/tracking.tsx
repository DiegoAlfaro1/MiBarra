import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, BackHeader, Button, Card, EmptyState, Screen, t } from '../src/components/ui';
import { formatLempiras } from '../src/lib/format';
import { useAppState, type OrderStatus } from '../src/state/AppState';

const STEPS = ['Recibido', 'Preparando', 'Listo'] as const;
const ORDER: OrderStatus[] = ['received', 'preparing', 'ready'];

// Demo only: the real status will come from the shop dashboard in realtime (NOT-01).
const DEMO_ADVANCE_MS: Partial<Record<OrderStatus, number>> = { received: 6000, preparing: 8000 };

export default function Tracking() {
  const { order, setOrderStatus, session } = useAppState();
  const status = order?.status;

  useEffect(() => {
    const delay = status ? DEMO_ADVANCE_MS[status] : undefined;
    if (!status || delay === undefined) return;
    const timer = setTimeout(() => setOrderStatus(ORDER[ORDER.indexOf(status) + 1]!), delay);
    return () => clearTimeout(timer);
  }, [status, setOrderStatus]);

  if (!order || order.status === 'cancelled') {
    return (
      <Screen header={<BackHeader icon="home" backLabel="Ir al inicio" onBack={() => router.replace('/')} />}>
        <EmptyState
          icon="clock"
          title="No tienes pedidos en curso"
          body="Cuando hagas un pedido, aquí verás cómo va."
          action={<Button label="Ver cafeterías" onPress={() => router.replace('/')} />}
        />
      </Screen>
    );
  }

  const idx = ORDER.indexOf(order.status);
  const ready = idx === 2;
  const color = ready ? t.colors.textSuccess : t.colors.primary;
  const name = session?.name ?? 'Diego';
  const copy = [
    ['Pedido recibido', `${order.shopName} ya tiene tu pedido. Te avisamos aquí cuando empiecen a prepararlo.`],
    ['Preparando tu pedido', 'Tu barista está en ello. Sal con calma, te avisamos cuando esté listo.'],
    ['¡Listo para recoger!', `Di tu nombre en la barra: ${name}, pedido ${order.code}.`],
  ][idx]!;
  const times = ['9:03 a. m.', idx >= 1 ? '9:05 a. m.' : 'En espera', idx >= 2 ? '9:13 a. m.' : 'Aprox. 9:15 a. m.'];

  return (
    <Screen
      header={
        <View style={styles.header}>
          <BackHeader icon="home" backLabel="Ir al inicio" onBack={() => router.replace('/')} />
          <AppText variant="bodyStrong" style={styles.headerTitle}>
            Pedido #{order.code}
          </AppText>
        </View>
      }
    >
      <View
        accessibilityLiveRegion="polite"
        style={[
          styles.hero,
          ready ? { backgroundColor: t.tones.success.tint } : { backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border },
        ]}
      >
        <View style={[styles.heroIcon, { backgroundColor: color }]}>
          <Feather name={ready ? 'check' : 'coffee'} size={40} color={t.colors.textInverse} />
        </View>
        <AppText variant="h1" style={styles.center} color={ready ? t.tones.success.onTint : t.colors.text} accessibilityRole="header">
          {copy[0]}
        </AppText>
        <AppText variant="body" style={styles.center} color={ready ? t.tones.success.onTint : t.colors.textMuted}>
          {copy[1]}
        </AppText>
      </View>

      <View accessibilityLabel="Progreso del pedido" style={styles.steps}>
        {STEPS.map((label, i) => {
          const done = i <= idx;
          return (
            <View key={label} style={styles.step} accessible accessibilityLabel={`${label}, ${times[i]}${i === idx ? ', paso actual' : ''}`}>
              <View style={styles.rail}>
                <View style={[styles.dot, done ? { backgroundColor: color } : { borderWidth: 2, borderColor: t.colors.borderStrong, backgroundColor: t.colors.surface }]} />
                {i < 2 ? <View style={[styles.line, { backgroundColor: i < idx ? color : t.colors.border }]} /> : null}
              </View>
              <View style={styles.flex}>
                <AppText variant={i === idx ? 'bodyStrong' : 'body'} color={done ? t.colors.text : t.colors.textMuted}>
                  {label}
                </AppText>
                <AppText variant="caption" color={t.colors.textMuted}>
                  {times[i]}
                </AppText>
              </View>
            </View>
          );
        })}
      </View>

      <Card style={styles.details}>
        <Detail label="Recoger en" value={`${order.shopName}`} />
        <Detail label="Hora estimada" value="9:15 a. m." />
        <Detail
          label="Pago"
          value={`${order.payment === 'counter' ? 'En caja' : 'Tarjeta (demo)'} · ${formatLempiras(order.totalCents)}`}
        />
      </Card>

      {idx === 0 ? (
        <View style={styles.gap}>
          <Button
            label="Cancelar pedido"
            variant="danger"
            onPress={() => {
              setOrderStatus('cancelled');
              router.replace({ pathname: '/cancelled', params: { by: 'cliente' } });
            }}
          />
          <AppText variant="caption" color={t.colors.textMuted} style={styles.center}>
            Puedes cancelar hasta que la cafetería empiece a prepararlo.
          </AppText>
        </View>
      ) : null}
      {ready ? <Button label="Ver mi tarjeta de sellos · 7/8" variant="dark" onPress={() => router.navigate('/loyalty')} /> : null}
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <AppText variant="bodySm" color={t.colors.textMuted}>
        {label}
      </AppText>
      <AppText variant="bodyStrong" style={styles.detailValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 8 },
  center: { textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { flex: 1, marginLeft: -44, textAlign: 'center', paddingRight: 44 },
  hero: { alignItems: 'center', gap: 12, padding: 24, borderRadius: t.radii.sheet },
  heroIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  steps: { paddingHorizontal: 8 },
  step: { flexDirection: 'row', gap: 14, minHeight: 56 },
  rail: { alignItems: 'center', width: 20 },
  dot: { width: 20, height: 20, borderRadius: 10 },
  line: { width: 2, flex: 1, minHeight: 30 },
  details: { gap: 10 },
  detail: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  detailValue: { flex: 1, textAlign: 'right' },
});
