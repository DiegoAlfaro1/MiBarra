import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { AppText, BackHeader, Button, Chip, EmptyState, Screen, Stepper, t } from '../../src/components/ui';
import { EXTRAS, MILKS, SIZES } from '../../src/data/options';
import { PRODUCTS } from '../../src/data/mock';
import { defaultSelection, describeSelection, unitPriceCents, type Selection } from '../../src/lib/cart';
import { formatExtra, formatLempiras } from '../../src/lib/format';
import { useAppState } from '../../src/state/AppState';

let lineCounter = 0;
const newLineId = () => `line-${Date.now()}-${(lineCounter += 1)}`;

export default function ItemScreen() {
  const { productId, shopId = 'lempa', lineId } = useLocalSearchParams<{ productId: string; shopId?: string; lineId?: string }>();
  const { cart, dispatch } = useAppState();
  const product = PRODUCTS.find((p) => p.id === productId);
  const editing = lineId ? cart.lines.find((l) => l.id === lineId) : undefined;

  const [selection, setSelection] = useState<Selection>(editing?.selection ?? defaultSelection());
  const [quantity, setQuantity] = useState(editing?.quantity ?? 1);

  if (!product || product.soldOut) {
    return (
      <Screen header={<BackHeader icon="x" backLabel="Cerrar" />}>
        <EmptyState
          icon="alert-circle"
          title={product ? 'Agotado hoy' : 'No encontramos este producto'}
          body="Elige otra opción del menú."
          action={<Button label="Volver al menú" onPress={() => router.back()} />}
        />
      </Screen>
    );
  }

  const sel = product.customizable ? selection : null;
  const unit = unitPriceCents(product.priceCents, sel);
  const total = unit * quantity;

  const toggleExtra = (id: string) =>
    setSelection((s) => ({ ...s, extraIds: s.extraIds.includes(id) ? s.extraIds.filter((e) => e !== id) : [...s.extraIds, id] }));

  const submit = () => {
    const line = {
      id: editing?.id ?? newLineId(),
      shopId: editing?.shopId ?? shopId,
      productId: product.id,
      name: product.name,
      optionsLabel: sel ? describeSelection(sel) : product.description,
      selection: sel,
      unitCents: unit,
      quantity,
    };
    dispatch(editing ? { type: 'replace', id: editing.id, line } : { type: 'add', line });
    // Editing came from the cart; adding goes to the cart too, as in the design.
    if (editing) router.back();
    else router.replace('/cart');
  };

  return (
    <Screen
      header={<BackHeader icon="x" backLabel="Cerrar" />}
      footer={
        <View style={styles.footerRow}>
          <Stepper value={quantity} onChange={setQuantity} />
          <Button
            style={styles.flex}
            variant="primary"
            label={editing ? 'Guardar' : 'Agregar'}
            right={formatLempiras(total)}
            onPress={submit}
          />
        </View>
      }
    >
      <View style={styles.hero}>
        <Feather name="coffee" size={56} color={t.colors.onPlaceholder} />
      </View>
      <View style={styles.gap4}>
        <AppText variant="h1" accessibilityRole="header">
          {product.name}
        </AppText>
        <AppText variant="body" color={t.colors.textMuted}>
          {product.description}. Desde {formatLempiras(product.priceCents)}
        </AppText>
      </View>

      {product.customizable ? (
        <>
          <View style={styles.group} accessibilityRole="radiogroup">
            <AppText variant="h3">Tamaño</AppText>
            <View style={styles.sizes}>
              {SIZES.map((s) => (
                <View key={s.id} style={styles.flex}>
                  <Chip
                    label={s.label}
                    sub={s.extraCents ? `${s.oz} · ${formatExtra(s.extraCents)}` : s.oz}
                    selected={selection.sizeId === s.id}
                    onPress={() => setSelection((x) => ({ ...x, sizeId: s.id }))}
                    minHeight={64}
                  />
                </View>
              ))}
            </View>
          </View>

          <View style={styles.group} accessibilityRole="radiogroup">
            <AppText variant="h3">Leche</AppText>
            <View style={styles.wrap}>
              {MILKS.map((m) => (
                <Chip
                  key={m.id}
                  label={m.extraCents ? `${m.label} ${formatExtra(m.extraCents)}` : m.label}
                  selected={selection.milkId === m.id}
                  onPress={() => setSelection((x) => ({ ...x, milkId: m.id }))}
                />
              ))}
            </View>
          </View>

          <View style={styles.group}>
            <AppText variant="h3">Extras</AppText>
            {EXTRAS.map((e) => {
              const on = selection.extraIds.includes(e.id);
              return (
                <Pressable
                  key={e.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${e.label}, ${formatExtra(e.priceCents)}`}
                  onPress={() => toggleExtra(e.id)}
                  style={styles.extra}
                >
                  <View style={[styles.box, on && { backgroundColor: t.colors.primary, borderColor: t.colors.primary }]}>
                    {on ? <Feather name="check" size={16} color={t.colors.onPrimary} /> : null}
                  </View>
                  <AppText variant="body" style={styles.flex}>
                    {e.label}
                  </AppText>
                  <AppText variant="bodySm" color={t.colors.textMuted}>
                    {formatExtra(e.priceCents)}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap4: { gap: 6 },
  hero: { height: 140, borderRadius: t.radii.cardLg, backgroundColor: t.colors.placeholder, alignItems: 'center', justifyContent: 'center' },
  group: { gap: 10 },
  sizes: { flexDirection: 'row', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  extra: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 14, backgroundColor: t.colors.surface, borderRadius: t.radii.controlLg, borderWidth: 1, borderColor: t.colors.border },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: t.colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
