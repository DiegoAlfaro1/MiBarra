import { Pressable, StyleSheet, View } from 'react-native';

import { PICKUP_SLOTS } from '../data/mock';
import { formatLempiras } from '../lib/format';
import { isSlotFull, PAYMENTS, type PickupSlot } from '../lib/checkout';
import type { Checkout } from '../lib/useCheckout';
import { AppText, Banner, Card, Chip, DemoBadge, Field, t } from './ui';

// Presentational sections used by both the phone checkout and the web checkout.

export function SlotSection({ c }: { c: Checkout }) {
  return (
    <>
      <AppText variant="h2" accessibilityRole="header">
        ¿Cuándo pasas por él?
      </AppText>
      <View style={styles.slots}>
        {(PICKUP_SLOTS as readonly PickupSlot[]).map((s) => (
          <View key={s.id} style={styles.slot}>
            <Chip
              label={s.label}
              sub={isSlotFull(s) ? 'Lleno' : s.sub || undefined}
              selected={c.slotId === s.id}
              disabled={isSlotFull(s)}
              onPress={() => c.setSlotId(s.id)}
              minHeight={58}
            />
          </View>
        ))}
      </View>
      {c.errors.slot ? (
        <AppText variant="caption" color={t.colors.textDanger} accessibilityRole="alert">
          {c.errors.slot}
        </AppText>
      ) : null}
    </>
  );
}

export function PaymentSection({ c }: { c: Checkout }) {
  const { card, errors } = c;
  return (
    <>
      <AppText variant="h2" accessibilityRole="header">
        Forma de pago
      </AppText>
      <View style={styles.gap}>
        {PAYMENTS.map((p) => {
          const on = c.payment === p.id;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${p.label}${p.demo ? ', demo' : ''}. ${p.sub}`}
              onPress={() => c.choosePayment(p.id)}
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
      {c.payment === 'card' ? (
        <Card style={styles.gap}>
          <Banner tone="demo" icon="info">
            Modo demo · no se realiza ningún cobro real
          </Banner>
          <Field label="Número de tarjeta" value={card.number} onChangeText={card.setNumber} keyboardType="number-pad" maxLength={19} error={errors.number} />
          <View style={styles.pair}>
            <View style={styles.flex}>
              <Field label="Vence" value={card.expiry} onChangeText={card.setExpiry} placeholder="MM/AA" maxLength={5} error={errors.expiry} />
            </View>
            <View style={styles.flex}>
              <Field label="CVV" value={card.cvv} onChangeText={card.setCvv} keyboardType="number-pad" maxLength={4} secureTextEntry error={errors.cvv} />
            </View>
          </View>
        </Card>
      ) : null}
    </>
  );
}

export function ContactSection({ c }: { c: Checkout }) {
  return (
    <>
      <AppText variant="h2" accessibilityRole="header">
        ¿A nombre de quién?
      </AppText>
      <View style={styles.gap}>
        <Field label="Nombre" value={c.contact.name} onChangeText={c.contact.setName} autoComplete="name" error={c.errors.name} />
        <Field label="Celular (para avisos por WhatsApp)" value={c.contact.phone} onChangeText={c.contact.setPhone} keyboardType="phone-pad" autoComplete="tel" prefix="+504" maxLength={9} error={c.errors.phone} />
      </View>
    </>
  );
}

export function SummaryCard({ c }: { c: Checkout }) {
  const { cart, shop } = c;
  return (
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
      {shop ? (
        <View style={styles.sumRow}>
          <AppText variant="bodySm" color={t.colors.textMuted}>
            Recoger en {shop.name}
          </AppText>
          <AppText variant="bodySm" color={t.colors.textMuted}>
            {shop.area}
          </AppText>
        </View>
      ) : null}
    </Card>
  );
}

export function submitLabel(c: Checkout): string {
  return c.payment === 'card' ? `Pagar ${formatLempiras(c.total)} (demo)` : 'Hacer pedido';
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 10 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { width: '31.5%', flexGrow: 1 },
  pay: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, padding: 12, borderRadius: t.radii.controlLg, backgroundColor: t.colors.surface },
  payTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  radio: { width: 20, height: 20, borderRadius: 10 },
  pair: { flexDirection: 'row', gap: 12 },
  summary: { gap: 8 },
  sumRow: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
});
