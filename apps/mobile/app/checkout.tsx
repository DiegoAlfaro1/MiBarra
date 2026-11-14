import { Redirect, router } from 'expo-router';
import { View, StyleSheet } from 'react-native';

import { ContactSection, PaymentSection, SlotSection, SummaryCard, submitLabel } from '../src/components/CheckoutSections';
import { AppText, BackHeader, Button, EmptyState, Screen } from '../src/components/ui';
import { canCheckout } from '../src/lib/access';
import { formatLempiras } from '../src/lib/format';
import { useCheckout } from '../src/lib/useCheckout';
import { useIsWide } from '../src/lib/useIsWide';
import { useAppState } from '../src/state/AppState';
import { WebCheckout } from '../src/web/WebCheckout';

export default function Checkout() {
  const wide = useIsWide();
  const c = useCheckout();
  const { session } = useAppState();

  // Menus are public, but ordering needs an account: send guests to sign up (the cart is kept).
  if (!canCheckout(session)) return <Redirect href="/login" />;

  if (c.isEmpty) {
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

  if (wide) return <WebCheckout c={c} />;

  return (
    <Screen
      header={<BackHeader title="Confirmar pedido" />}
      footer={
        <>
          <View style={styles.totalRow}>
            <AppText variant="bodyStrong">Recoger: {c.pickupLabel}</AppText>
            <AppText variant="h2">{formatLempiras(c.total)}</AppText>
          </View>
          <Button label={submitLabel(c)} variant="dark" onPress={c.submit} />
        </>
      }
    >
      <SlotSection c={c} />
      <PaymentSection c={c} />
      <ContactSection c={c} />
      <SummaryCard c={c} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
