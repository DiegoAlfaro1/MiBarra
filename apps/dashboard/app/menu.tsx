import { listMenu, MenuManagementError, setItemAvailable, type MenuData } from '@mibarra/shared';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Notice, StateView } from '../src/components/Form.tsx';
import { supabase } from '../src/lib/supabase.ts';
import { countOutOfStock, formatLempiras, menuGroups } from '../src/logic/dashboard.ts';
import { useAuth } from '../src/state/AuthState.tsx';
import { colors, tones, typography } from '../src/theme.ts';

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; menu: MenuData };

/** "¿Qué hay hoy?": every staff role marks items as sold out or back in stock. Customers stop seeing sold-out items. */
export default function MenuAvailability() {
  const { access } = useAuth();
  const shopId = access?.shopId ?? null;
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [reloads, setReloads] = useState(0);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shopId) return;
    let active = true;
    listMenu(supabase, shopId)
      .then((menu) => active && setLoad({ status: 'ready', menu }))
      .catch((e: unknown) => active && setLoad({ status: 'error', message: e instanceof Error ? e.message : 'No pudimos cargar el menú.' }));
    return () => {
      active = false;
    };
  }, [shopId, reloads]);

  const retry = useCallback(() => {
    setLoad({ status: 'loading' });
    setReloads((n) => n + 1);
  }, []);

  const toggle = async (id: string, available: boolean) => {
    if (saving.has(id)) return;
    setError(null);
    setSaving((s) => new Set(s).add(id));
    try {
      const saved = await setItemAvailable(supabase, id, available);
      setLoad((prev) => (prev.status === 'ready' ? { status: 'ready', menu: { ...prev.menu, items: prev.menu.items.map((i) => (i.id === id ? saved : i)) } } : prev));
    } catch (e) {
      setError(e instanceof MenuManagementError ? e.message : 'No pudimos cambiar la disponibilidad. Inténtalo de nuevo.');
    } finally {
      setSaving((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  };

  if (!shopId) return <StateView kind="empty" message="Tu cuenta no tiene una cafetería asignada." />;
  if (load.status === 'loading') return <StateView kind="loading" message="Cargando el menú…" />;
  if (load.status === 'error') return <StateView kind="error" message={load.message} onRetry={retry} />;

  const groups = menuGroups(load.menu);
  return (
    <View style={styles.page}>
      <View style={styles.head}>
        <View style={{ flexShrink: 1, gap: 4 }}>
          <Text accessibilityRole="header" style={typography.h1}>¿Qué hay hoy?</Text>
          <Text style={styles.sub}>Un toque marca un producto como agotado. Los clientes dejan de verlo y no pueden pedirlo hasta que lo vuelvas a activar.</Text>
        </View>
        <Text style={styles.pill} accessibilityLiveRegion="polite">{countOutOfStock(load.menu.items)} agotados</Text>
      </View>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {groups.length === 0 ? <StateView kind="empty" message="Todavía no hay productos en el menú. Agrégalos en Catálogo." /> : null}
      {groups.map((g) => (
        <View key={g.category.id} style={styles.group}>
          <Text accessibilityRole="header" style={styles.groupTitle}>{g.category.name}</Text>
          {g.items.map((it) => {
            const out = !it.available;
            return (
              <View key={it.id} style={styles.row}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.name, out && styles.nameOut]}>{it.name}</Text>
                  <Text style={styles.price}>{formatLempiras(it.price_cents / 100)}</Text>
                </View>
                <Text style={[styles.state, out ? styles.stateOut : styles.stateOk]}>{out ? 'Agotado' : 'Disponible'}</Text>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: !out, disabled: saving.has(it.id) }}
                  accessibilityLabel={`Disponible: ${it.name}`}
                  onPress={() => void toggle(it.id, out)}
                  style={[styles.track, { backgroundColor: out ? colors.disabled : tones.success.solid, justifyContent: out ? 'flex-start' : 'flex-end', opacity: saving.has(it.id) ? 0.6 : 1 }]}
                >
                  <View style={styles.knob} />
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 1000, alignSelf: 'center', padding: 24, gap: 20 },
  head: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  sub: { fontSize: 15, color: colors.textMuted },
  pill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.surface, fontSize: 15, fontWeight: '600', overflow: 'hidden', color: colors.text },
  group: { backgroundColor: colors.surface, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  groupTitle: { paddingHorizontal: 20, paddingVertical: 14, fontSize: 16, fontWeight: '700', backgroundColor: '#FAFAF9', color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted },
  name: { fontSize: 17, fontWeight: '600', color: colors.text },
  nameOut: { color: colors.textMuted, textDecorationLine: 'line-through' },
  price: { fontSize: 14, color: colors.textMuted },
  state: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, fontSize: 13, fontWeight: '700', overflow: 'hidden' },
  stateOk: { backgroundColor: tones.success.tint, color: tones.success.onTint },
  stateOut: { backgroundColor: colors.secondary, color: colors.onSecondary },
  track: { width: 72, height: 44, borderRadius: 22, padding: 4, flexDirection: 'row' },
  knob: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF' },
});
