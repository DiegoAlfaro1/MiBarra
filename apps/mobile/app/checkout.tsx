import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  BackHeader,
  Banner,
  Button,
  Card,
  Chip,
  DemoBadge,
  EmptyState,
  Field,
  Screen,
  t,
} from '../src/components/ui';
import { PICKUP_SLOTS, SHOPS } from '../src/data/mock';
import { cartTotalCents } from '../src/lib/cart';
import { formatLempiras } from '../src/lib/format';
import { validateCard, type FieldErrors } from '../src/lib/validation';
import { useAppState } from '../src/state/AppState';

const PAYMENTS = [
  { id: 'counter', label: 'Pagar en caja', sub: 'Pagas al recoger, en efectivo o tarjeta', demo: false },
  { id: 'card', label: 'Tarjeta en línea', sub: 'Se cobra a la cuenta de la cafetería', demo: true },
] as const;

export default function Checkout() {
  const { cart, placeOrder } = useAppState();
  const [slot, setSlot] = useState<string>(PICKUP_SLOTS[0].id);
  const [pay, setPay] = useState<'counter' | 'card'>('counter');
  const [number, setNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('123');
  const [errors, setErrors] = useState<FieldErrors>({});
  // Guards against double taps so one checkout never creates two orders.
  const submitted = useRef(false);
  const shop = SHOPS.find((s) => s.id === cart.shopId);

  if (!cart.lines.length || !shop) {
    return (
      <Screen header={<BackHeader title="Confirmar pedido" />}>
        <EmptyState
          icon="shopping-bag"
          title="No hay nada que confirmar"
          body="Tu carrito está vacío. Agrega productos para hacer un pedido."
          action={<Button label="Ver cafeterías" onPress={() => router.replace('/')} />}
        />
      </Screen>
    );
  }

  const total = cartTotalCents(cart.lines);
  const selected = PICKUP_SLOTS.find((s) => s.id === slot) ?? PICKUP_SLOTS[0];
  const pickupLabel = slot === 'asap' ? 'en ~10 min' : selected.label;

  const submit = () => {
    if (submitted.current) return;
    if (pay === 'card') {
      const found = validateCard({ number, expiry, cvv });
      setErrors(found);
      if (Object.keys(found).length) return;
    }
    submitted.current = true;
    placeOrder({
      code: 'A-1042',
      shopId: shop.id,
      shopName: shop.name,
      lines: cart.lines,
      totalCents: total,
      pickupLabel,
      payment: pay,
      status: 'received',
    });
    router.replace('/tracking');
  };

  return (
    <Screen
      header={<BackHeader title="Confirmar pedido" />}
      footer={
        <>
          <View style={styles.totalRow}>
            <AppText variant="bodyStrong">Recoger: {pickupLabel}</AppText>
            <AppText variant="h2">{formatLempiras(total)}</AppText>
          </View>
          <Button
            label={pay === 'card' ? `Pagar ${formatLempiras(total)} (demo)` : 'Hacer pedido'}
            variant="dark"
            onPress={submit}
          />
        </>
      }
    >
      <AppText variant="h2" accessibilityRole="header">
        ¿Cuándo pasas por él?
      </AppText>
      <View style={styles.slots}>
        {PICKUP_SLOTS.map((s) => (
          <View key={s.id} style={styles.slot}>
            <Chip
              label={s.label}
              sub={'full' in s && s.full ? 'Lleno' : s.sub || undefined}
              selected={slot === s.id}
              disabled={'full' in s && s.full}
              onPress={() => setSlot(s.id)}
              minHeight={58}
            />
          </View>
        ))}
      </View>

      <AppText variant="h2" accessibilityRole="header">
        Forma de pago
      </AppText>
      <View style={styles.gap}>
        {PAYMENTS.map((p) => {
          const on = pay === p.id;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${p.label}${p.demo ? ', demo' : ''}. ${p.sub}`}
              onPress={() => {
                setPay(p.id);
                setErrors({});
              }}
              style={[styles.pay, { borderColor: on ? t.colors.secondary : t.colors.border, borderWidth: on ? 2 : 1 }]}
            >
              <View style={[styles.radio, on ? { borderWidth: 6, borderColor: t.colors.secondary } : { borderWidth: 2, borderColor: t.colors.stampEmpty }]} />
              <View style={styles.flex}>
                <View style={styles.payTitle}>
                  <AppText variant="bodyStrong">{p.label}</AppText>
                  {p.demo ? <DemoBadge /> : null}
                </View>
                <AppText variant="caption" color={t.colors.textMuted}>
                  {p.sub}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>

      {pay === 'card' ? (
        <Card style={styles.gap}>
          <Banner tone="demo" icon="info">
            Modo demo · no se realiza ningún cobro real
          </Banner>
          <Field label="Número de tarjeta" value={number} onChangeText={setNumber} keyboardType="number-pad" maxLength={19} error={errors.number} />
          <View style={styles.pair}>
            <View style={styles.flex}>
              <Field label="Vence" value={expiry} onChangeText={setExpiry} placeholder="MM/AA" maxLength={5} error={errors.expiry} />
            </View>
            <View style={styles.flex}>
              <Field label="CVV" value={cvv} onChangeText={setCvv} keyboardType="number-pad" maxLength={4} secureTextEntry error={errors.cvv} />
            </View>
          </View>
        </Card>
      ) : null}

      <Card style={styles.summary}>
        {cart.lines.map((l) => (
          <View key={l.id} style={styles.sumRow}>
            <AppText variant="body" style={styles.flex}>
              {l.quantity > 1 ? `${l.quantity}× ` : ''}
              {l.name}
              {l.selection ? ` ${l.optionsLabel.split(' ')[0]!.toLowerCase()}` : ''}
            </AppText>
            <AppText variant="body">{formatLempiras(l.unitCents * l.quantity)}</AppText>
          </View>
        ))}
        <View style={styles.sumRow}>
          <AppText variant="bodySm" color={t.colors.textMuted}>
            Recoger en {shop.name}
          </AppText>
          <AppText variant="bodySm" color={t.colors.textMuted}>
            {shop.area}
          </AppText>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { width: '31.5%', flexGrow: 1 },
  pay: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, padding: 12, borderRadius: t.radii.controlLg, backgroundColor: t.colors.surface },
  payTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  radio: { width: 20, height: 20, borderRadius: 10 },
  pair: { flexDirection: 'row', gap: 12 },
  summary: { gap: 8 },
  sumRow: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
});
