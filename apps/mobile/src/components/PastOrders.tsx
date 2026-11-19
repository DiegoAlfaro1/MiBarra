import { Feather } from '@expo/vector-icons';
import { listMyOrderHistory, loadShopMenu, planReorder, type HistoryOrder } from '@mibarra/shared';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { formatLempiras } from '../lib/format';
import { historyView, reorderCartLines, reorderNotice } from '../lib/orderHistory';
import { supabase } from '../lib/supabase';
import { useAppState } from '../state/AppState';
import { AppText, Badge, Banner, Button, Card, EmptyState, t } from './ui';

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; orders: HistoryOrder[] };

/** The signed-in customer's past orders from Supabase: items, personalization, prices and "Pedir de nuevo". */
export function PastOrders() {
  const { session, dispatch } = useAppState();
  const signedIn = !!session && !session.guest;
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'warning' | 'danger'; text: string } | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    listMyOrderHistory(supabase).then(
      (orders) => !cancelled && setLoad({ status: 'ready', orders }),
      (e: unknown) => !cancelled && setLoad({ status: 'error', message: e instanceof Error ? e.message : 'No pudimos cargar tus pedidos.' }),
    );
    return () => {
      cancelled = true;
    };
  }, [signedIn, attempt]);

  const reorder = useCallback(
    async (order: HistoryOrder) => {
      if (busyId) return;
      setBusyId(order.id);
      setNotice(null);
      try {
        // Today's menu decides what can still be ordered; the server prices and checks it again at checkout.
        const menu = await loadShopMenu(supabase, order.shop_id);
        const plan = planReorder(order, menu);
        for (const line of reorderCartLines(order.id, order.shop_id, plan)) dispatch({ type: 'add', line });
        const message = reorderNotice(plan);
        if (!message) router.push('/cart');
        else setNotice({ tone: plan.lines.length ? 'warning' : 'danger', text: message });
      } catch (e) {
        setNotice({ tone: 'danger', text: e instanceof Error ? e.message : 'No pudimos repetir el pedido. Inténtalo de nuevo.' });
      } finally {
        setBusyId(null);
      }
    },
    [busyId, dispatch],
  );

  if (!signedIn) {
    return (
      <EmptyState
        icon="file-text"
        title="Inicia sesión para ver tus pedidos"
        body="Tu historial se guarda en tu cuenta MiBarra."
        action={<Button label="Iniciar sesión" onPress={() => router.push('/signin')} />}
      />
    );
  }
  if (load.status === 'loading') {
    return <ActivityIndicator accessibilityLabel="Cargando tus pedidos" color={t.colors.primary} style={styles.loading} />;
  }
  if (load.status === 'error') {
    return (
      <View style={styles.list}>
        <Banner tone="danger" icon="alert-circle">
          {load.message}
        </Banner>
        <Button label="Reintentar" variant="outline" onPress={() => {
            setLoad({ status: 'loading' });
            setAttempt((n) => n + 1);
          }} />
      </View>
    );
  }
  if (!load.orders.length) {
    return <EmptyState icon="file-text" title="Aún no tienes pedidos" body="Cuando hagas un pedido, lo verás aquí." />;
  }

  return (
    <View style={styles.list}>
      {notice ? (
        <View style={styles.list}>
          <Banner tone={notice.tone} icon="alert-circle">
            {notice.text}
          </Banner>
          {notice.tone === 'warning' ? <Button label="Ver carrito" onPress={() => router.push('/cart')} /> : null}
        </View>
      ) : null}
      {load.orders.map((order) => {
        const v = historyView(order);
        return (
          <Card key={v.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{v.shop}</AppText>
                <AppText variant="caption" color={t.colors.textMuted}>
                  {v.date}
                </AppText>
              </View>
              <Badge label={v.status} tone={v.tone} />
            </View>
            {v.lines.map((l) => (
              <View key={l.id} accessible accessibilityLabel={`${l.quantity} ${l.name}${l.personalization ? `, ${l.personalization}` : ''}, ${formatLempiras(l.lineCents)}`} style={styles.row}>
                <View style={styles.flex}>
                  <AppText variant="body">
                    {l.quantity} × {l.name}
                  </AppText>
                  {l.personalization ? (
                    <AppText variant="bodySm" color={t.colors.textMuted}>
                      {l.personalization}
                    </AppText>
                  ) : null}
                </View>
                <AppText variant="bodySm">{formatLempiras(l.lineCents)}</AppText>
              </View>
            ))}
            {v.note ? (
              <AppText variant="bodySm" color={t.colors.textMuted}>
                Nota: {v.note}
              </AppText>
            ) : null}
            <View style={styles.row}>
              <AppText variant="number" style={styles.flex} accessibilityLabel={`Total ${formatLempiras(v.totalCents)}`}>
                {formatLempiras(v.totalCents)}
              </AppText>
              {v.canReorder ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Pedir de nuevo en ${v.shop}`}
                  accessibilityState={{ disabled: !!busyId, busy: busyId === v.id }}
                  disabled={!!busyId}
                  onPress={() => reorder(order)}
                  style={styles.reorder}
                >
                  <Feather name="rotate-ccw" size={16} color={t.colors.textAccent} />
                  <AppText variant="buttonSm" color={t.colors.textAccent}>
                    {busyId === v.id ? 'Agregando…' : 'Pedir de nuevo'}
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: 12 },
  loading: { paddingVertical: 32 },
  card: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between' },
  reorder: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 4 },
});
