import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ContactSection, PaymentSection, SlotSection, SummaryCard, submitLabel } from '../components/CheckoutSections';
import { AppText, Button, t } from '../components/ui';
import { formatLempiras } from '../lib/format';
import type { Checkout } from '../lib/useCheckout';
import { WEB_MAX_WIDTH, WebFooter, WebHeader } from './WebHeader';

// Wide-screen layout for W3: steps on the left, order summary on the right.
// All state and rules come from useCheckout, shared with the phone screen.
export function WebCheckout({ c }: { c: Checkout }) {
  const back = () => (c.shop ? router.replace({ pathname: '/shop/[id]', params: { id: c.shop.id } }) : router.replace('/'));
  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <WebHeader />
        <View style={[styles.inner, styles.body]}>
          <View style={styles.steps}>
            <Pressable accessibilityRole="link" accessibilityLabel="Volver al menú" onPress={back} style={styles.back}>
              <AppText variant="label" color={t.colors.textAccent}>
                ← Volver al menú
              </AppText>
            </Pressable>
            <AppText variant="display" accessibilityRole="header" aria-level={1}>
              Confirmar pedido
            </AppText>
            <SlotSection c={c} />
            <PaymentSection c={c} />
            <ContactSection c={c} />
          </View>

          <View accessibilityRole="complementary" aria-label="Resumen del pedido" style={styles.aside}>
            <AppText variant="h2" accessibilityRole="header" aria-level={2}>
              Tu pedido
            </AppText>
            <SummaryCard c={c} />
            <View style={styles.row}>
              <AppText variant="bodyStrong" style={styles.flex}>
                Recoger {c.pickupLabel}
              </AppText>
              <AppText variant="h2">{formatLempiras(c.total)}</AppText>
            </View>
            <Button label={submitLabel(c)} variant="dark" onPress={c.submit} />
            <AppText variant="caption" color={t.colors.textMuted} style={styles.center}>
              El pago va directo a la cafetería. MiBarra no guarda datos de tarjeta.
            </AppText>
          </View>
        </View>
        <WebFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1, backgroundColor: t.colors.background },
  scroll: { flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inner: { width: '100%', maxWidth: WEB_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 24 },
  body: { paddingTop: 28, paddingBottom: 64, flexDirection: 'row', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' },
  steps: { flexGrow: 999, flexShrink: 1, flexBasis: 480, minWidth: 0, gap: 16 },
  back: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  aside: { flexGrow: 1, flexBasis: 320, maxWidth: 400, gap: 14, padding: 20, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, borderRadius: 22 },
  center: { textAlign: 'center' },
});
