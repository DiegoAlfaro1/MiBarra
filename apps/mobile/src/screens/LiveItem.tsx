import { Feather } from '@expo/vector-icons';
import {
  defaultOptionIds,
  describeOptions,
  isItemSoldOut,
  itemChoices,
  optionChoiceError,
  toggleOption,
  unitPriceWithOptions,
  type ItemOption,
  type MenuItemDetail,
} from '@mibarra/shared';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { MenuPhoto } from '../components/MenuPhoto';
import { AppText, BackHeader, Banner, Button, Chip, EmptyState, Screen, Stepper, t } from '../components/ui';
import type { CartLine } from '../lib/cart';
import { formatExtra, formatLempiras } from '../lib/format';
import { useMenuItem } from '../lib/useShops';
import { useAppState } from '../state/AppState';

let lineCounter = 0;
const newLineId = () => `line-${Date.now()}-${(lineCounter += 1)}`;

/** A menu item read from Supabase: photo, description, price and the sizes and extras the owner set. */
export function LiveItem({ itemId, lineId }: { itemId: string; lineId?: string }) {
  const [loaded, reload] = useMenuItem(itemId);
  const header = <BackHeader icon="x" backLabel="Cerrar" />;

  if (loaded.status === 'loading') {
    return (
      <Screen header={header}>
        <View accessibilityRole="progressbar" accessibilityLabel="Cargando producto" style={styles.center}>
          <ActivityIndicator color={t.colors.primary} />
        </View>
      </Screen>
    );
  }
  if (loaded.status === 'error') {
    return (
      <Screen header={header}>
        <EmptyState icon="wifi-off" title="No pudimos cargar el producto" body={loaded.message} action={<Button label="Reintentar" onPress={reload} />} />
      </Screen>
    );
  }
  if (!loaded.data || isItemSoldOut(loaded.data.item, loaded.data.options)) {
    return (
      <Screen header={header}>
        <EmptyState
          icon="alert-circle"
          title={loaded.data ? 'Agotado hoy' : 'No encontramos este producto'}
          body="Elige otra opción del menú."
          action={<Button label="Volver al menú" onPress={() => router.back()} />}
        />
      </Screen>
    );
  }
  return <ItemForm detail={loaded.data} lineId={lineId} header={header} />;
}

function ItemForm({ detail, lineId, header }: { detail: MenuItemDetail; lineId?: string; header: ReactNode }) {
  const { item } = detail;
  const { cart, dispatch } = useAppState();
  const editing = lineId ? cart.lines.find((l) => l.id === lineId) : undefined;
  const choices = itemChoices(detail.options, item.id);

  const [chosen, setChosen] = useState<string[]>(editing?.optionIds ?? defaultOptionIds(choices));
  const [quantity, setQuantity] = useState(editing?.quantity ?? 1);
  const [error, setError] = useState<string | null>(null);

  const unit = unitPriceWithOptions(item, choices, chosen);
  const pick = (id: string) => {
    setError(null);
    setChosen((c) => toggleOption(choices, c, id));
  };

  const submit = () => {
    const problem = optionChoiceError(choices, chosen);
    if (problem) {
      setError(problem);
      return;
    }
    const line: CartLine = {
      id: editing?.id ?? newLineId(),
      shopId: item.shop_id,
      productId: item.id,
      name: item.name,
      optionsLabel: describeOptions(item, choices, chosen),
      selection: null,
      optionIds: chosen,
      unitCents: unit,
      quantity,
    };
    dispatch(editing ? { type: 'replace', id: editing.id, line } : { type: 'add', line });
    if (editing) router.back();
    else router.replace('/cart');
  };

  return (
    <Screen
      header={header}
      footer={
        <View style={styles.footerRow}>
          <Stepper value={quantity} onChange={setQuantity} />
          <Button style={styles.flex} label={editing ? 'Guardar' : 'Agregar'} right={formatLempiras(unit * quantity)} onPress={submit} />
        </View>
      }
    >
      <MenuPhoto uri={item.photo_url} size={140} style={styles.hero} />
      <View style={styles.gap4}>
        <AppText variant="h1" accessibilityRole="header">
          {item.name}
        </AppText>
        <AppText variant="body" color={t.colors.textMuted}>
          {item.description ? `${item.description}. ` : ''}
          {choices.sizes.length ? 'Desde' : 'Precio:'} {formatLempiras(unitPriceWithOptions(item, choices, defaultOptionIds(choices)))}
        </AppText>
      </View>

      {error ? (
        <View accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Banner tone="danger" icon="alert-circle">
            {error}
          </Banner>
        </View>
      ) : null}

      {choices.sizes.length ? (
        <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel="Tamaño">
          <AppText variant="h3">Tamaño</AppText>
          <View style={styles.wrap}>
            {choices.sizes.map((s) => (
              <Chip
                key={s.id}
                label={s.name}
                sub={s.price_change_cents ? formatExtra(s.price_change_cents) : undefined}
                selected={chosen.includes(s.id)}
                onPress={() => pick(s.id)}
                minHeight={56}
              />
            ))}
          </View>
        </View>
      ) : null}

      {choices.extras.length ? (
        <View style={styles.group}>
          <AppText variant="h3">Extras</AppText>
          {choices.extras.map((e) => (
            <Extra key={e.id} option={e} on={chosen.includes(e.id)} onPress={() => pick(e.id)} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

function Extra({ option, on, onPress }: { option: ItemOption; on: boolean; onPress: () => void }) {
  const price = option.price_change_cents ? formatExtra(option.price_change_cents) : 'Sin costo';
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={`${option.name}, ${price}`}
      onPress={onPress}
      style={styles.extra}
    >
      <View style={[styles.box, on && { backgroundColor: t.colors.primary, borderColor: t.colors.primary }]}>
        {on ? <Feather name="check" size={16} color={t.colors.onPrimary} /> : null}
      </View>
      <AppText variant="body" style={styles.flex}>
        {option.name}
      </AppText>
      <AppText variant="bodySm" color={t.colors.textMuted}>
        {price}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap4: { gap: 6 },
  center: { paddingVertical: 48, alignItems: 'center' },
  hero: { width: '100%', borderRadius: t.radii.cardLg },
  group: { gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  extra: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 14, backgroundColor: t.colors.surface, borderRadius: t.radii.controlLg, borderWidth: 1, borderColor: t.colors.border },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: t.colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
