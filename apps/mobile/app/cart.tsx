import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, BackHeader, Banner, Button, Card, EmptyState, Field, LinkText, Screen, Stepper, t } from '../src/components/ui';
import { SHOPS } from '../src/data/mock';
import { cartTotalCents, lineTotalCents } from '../src/lib/cart';
import { formatLempiras } from '../src/lib/format';
import { useAppState } from '../src/state/AppState';

export default function CartScreen() {
  const { cart, dispatch, session } = useAppState();
  const shop = SHOPS.find((s) => s.id === cart.shopId);

  if (!cart.lines.length || !shop) {
    return (
      <Screen header={<BackHeader title="Tu pedido" backLabel="Volver al menú" />}>
        <EmptyState
          icon="shopping-bag"
          title="Tu carrito está vacío"
          body="Agrega una bebida o algo de comer para empezar tu pedido."
          action={<Button label="Ver cafeterías" onPress={() => router.replace('/')} />}
        />
      </Screen>
    );
  }

  const total = cartTotalCents(cart.lines);
  return (
    <Screen
      header={<BackHeader title="Tu pedido" subtitle={`${shop.name} · Recoger en tienda`} backLabel="Volver al menú" />}
      footer={
        <>
          <View style={styles.totalRow}>
            <AppText variant="h3">Total</AppText>
            <AppText variant="h2">{formatLempiras(total)}</AppText>
          </View>
          <Button label="Continuar al pago" variant="dark" onPress={() => router.push(session ? '/checkout' : '/login')} />
        </>
      }
    >
      <Card style={styles.lines}>
        {cart.lines.map((line, i) => (
          <View key={line.id} style={[styles.line, i > 0 && styles.divider]}>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{line.name}</AppText>
              <AppText variant="caption" color={t.colors.textMuted}>
                {line.optionsLabel}
              </AppText>
              <View style={styles.actions}>
                {line.selection ? (
                  <LinkText
                    label="Editar"
                    onPress={() =>
                      router.push({ pathname: '/item/[productId]', params: { productId: line.productId, lineId: line.id } })
                    }
                  />
                ) : null}
                <LinkText label="Quitar" color={t.colors.textDanger} onPress={() => dispatch({ type: 'remove', id: line.id })} />
              </View>
            </View>
            <View style={styles.right}>
              <AppText variant="number">{formatLempiras(lineTotalCents(line))}</AppText>
              <Stepper value={line.quantity} onChange={(quantity) => dispatch({ type: 'setQty', id: line.id, quantity })} />
            </View>
          </View>
        ))}
        <LinkText
          label="+ Agregar más productos"
          onPress={() => (router.canGoBack() ? router.back() : router.replace({ pathname: '/shop/[id]', params: { id: shop.id } }))}
        />
      </Card>

      <Field
        label="Nota para la cafetería"
        placeholder="Ej.: sin tapa, extra caliente"
        value={cart.note}
        onChangeText={(note) => dispatch({ type: 'setNote', note })}
        multiline
        maxLength={200}
      />

      <Banner tone="accent" icon="award">
        Este pedido suma 1 sello a tu tarjeta
      </Banner>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  lines: { gap: 4 },
  line: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: t.colors.border },
  actions: { flexDirection: 'row', gap: 16 },
  right: { alignItems: 'flex-end', gap: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
