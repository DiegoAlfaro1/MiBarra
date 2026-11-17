import {
  isItemSoldOut,
  listMenu,
  MenuManagementError,
  setItemAvailable,
  setOptionAvailable,
  type ItemOption,
  type MenuData,
  type MenuItem,
} from '@mibarra/shared';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Notice, StateView, Toggle } from '../src/components/Form.tsx';
import { supabase } from '../src/lib/supabase.ts';
import { formatLempiras } from '../src/logic/dashboard.ts';
import { useAuth } from '../src/state/AuthState.tsx';
import { bodyFont, colors, tones, typography } from '../src/theme.ts';

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; menu: MenuData };

/**
 * Sold-out switches for every staff role (baristas included). One tap marks a whole item or one of
 * its sizes/extras as sold out; customers see it right away. An item whose sizes are all sold out
 * cannot be ordered, and is shown as sold out here too.
 */
export default function MenuAvailability() {
  const { access } = useAuth();
  const shopId = access?.shopId ?? null;
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [reloads, setReloads] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shopId) return;
    let active = true;
    listMenu(supabase, shopId)
      .then((menu) => active && setLoad({ status: 'ready', menu }))
      .catch((e: unknown) => active && setLoad((prev) => (prev.status === 'ready' ? prev : { status: 'error', message: e instanceof Error ? e.message : 'No pudimos cargar el menú.' })));
    return () => {
      active = false;
    };
  }, [shopId, reloads]);

  const retry = useCallback(() => {
    setLoad({ status: 'loading' });
    setReloads((n) => n + 1);
  }, []);

  const change = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
      setReloads((n) => n + 1);
    } catch (e) {
      setError(e instanceof MenuManagementError ? e.message : 'No pudimos cambiar la disponibilidad. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setBusy(null);
    }
  };

  const menu = load.status === 'ready' ? load.menu : null;
  const soldOutCount = menu ? menu.items.filter((i) => isItemSoldOut(i, menu.options)).length : 0;

  return (
    <View style={styles.page}>
      <View style={styles.head}>
        <View style={{ flexShrink: 1, gap: 4 }}>
          <Text accessibilityRole="header" style={typography.h1}>¿Qué hay hoy?</Text>
          <Text style={styles.sub}>Un toque marca un producto como agotado. Los clientes lo ven en gris al instante.</Text>
        </View>
        {menu ? <Text style={styles.pill} accessibilityLiveRegion="polite">{soldOutCount} agotados</Text> : null}
      </View>
      {error ? <Notice tone="danger">{error}</Notice> : null}

      {!shopId ? (
        <StateView kind="empty" message="Esta cuenta no tiene una tienda asignada todavía." />
      ) : load.status === 'loading' ? (
        <StateView kind="loading" message="Cargando el menú…" />
      ) : load.status === 'error' ? (
        <StateView kind="error" message={load.message} onRetry={retry} />
      ) : load.menu.items.length === 0 ? (
        <StateView kind="empty" message="Todavía no hay productos. El dueño o encargado puede crearlos en Editar menú." />
      ) : (
        load.menu.categories.map((category) => {
          const items = load.menu.items.filter((i) => i.category_id === category.id);
          if (!items.length) return null;
          return (
            <View key={category.id} style={styles.group}>
              <Text accessibilityRole="header" style={styles.groupTitle}>{category.name}</Text>
              {items.map((item) => (
                <ItemBlock key={item.id} item={item} options={load.menu.options.filter((o) => o.item_id === item.id)} busy={busy}
                  onItem={(available) => change(item.id, () => setItemAvailable(supabase, item.id, available))}
                  onOption={(option, available) => change(option.id, () => setOptionAvailable(supabase, option.id, available))} />
              ))}
            </View>
          );
        })
      )}
    </View>
  );
}

function ItemBlock({ item, options, busy, onItem, onOption }: {
  item: MenuItem;
  options: ItemOption[];
  busy: string | null;
  onItem: (available: boolean) => void;
  onOption: (option: ItemOption, available: boolean) => void;
}) {
  const out = isItemSoldOut(item, options);
  const sizesOut = item.available && out; // on sale, but every size is sold out
  return (
    <View style={styles.block}>
      <View style={styles.row}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.name, out && styles.nameOut]}>{item.name}</Text>
          <Text style={styles.price}>{formatLempiras(item.price_cents / 100)}</Text>
          {sizesOut ? <Text style={styles.warn}>Todos los tamaños están agotados: no se puede pedir.</Text> : null}
        </View>
        <Text style={[styles.state, out ? styles.stateOut : styles.stateOk]}>{out ? 'Agotado' : 'Disponible'}</Text>
        <Toggle label={`Disponible: ${item.name}`} value={item.available} onChange={onItem} disabled={busy === item.id} />
      </View>
      {options.map((option) => (
        <View key={option.id} style={styles.optionRow}>
          <Text style={[styles.optionName, !option.available && styles.nameOut]}>
            {option.kind === 'size' ? 'Tamaño' : 'Extra'}: {option.name}
          </Text>
          <Toggle label={`Disponible: ${option.name} de ${item.name}`} value={option.available} onChange={(v) => onOption(option, v)} disabled={busy === option.id} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 1000, alignSelf: 'center', padding: 24, gap: 20 },
  head: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  sub: { fontFamily: bodyFont, fontSize: 15, color: colors.textMuted },
  pill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.surface, fontFamily: bodyFont, fontSize: 15, fontWeight: '600', overflow: 'hidden', color: colors.text },
  group: { backgroundColor: colors.surface, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  groupTitle: { paddingHorizontal: 20, paddingVertical: 14, fontFamily: bodyFont, fontSize: 16, fontWeight: '700', backgroundColor: '#FAFAF9', color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.border },
  block: { borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, paddingHorizontal: 20 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingLeft: 40, paddingRight: 20 },
  optionName: { flex: 1, fontFamily: bodyFont, fontSize: 15, color: colors.text },
  name: { fontFamily: bodyFont, fontSize: 17, fontWeight: '600', color: colors.text },
  nameOut: { color: colors.textMuted, textDecorationLine: 'line-through' },
  price: { fontFamily: bodyFont, fontSize: 14, color: colors.textMuted },
  warn: { fontFamily: bodyFont, fontSize: 13, fontWeight: '600', color: colors.textDanger },
  state: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, fontFamily: bodyFont, fontSize: 13, fontWeight: '700', overflow: 'hidden' },
  stateOk: { backgroundColor: tones.success.tint, color: tones.success.onTint },
  stateOut: { backgroundColor: colors.secondary, color: colors.onSecondary },
});
