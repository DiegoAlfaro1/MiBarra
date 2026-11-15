import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { formatPhone, shopStatus, type Shop } from '@mibarra/shared';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText, Badge, Button, EmptyState, StampDots, t, textStyle } from '../components/ui';
import { ShopLogo } from '../components/ShopLogo';
import { shopHref } from '../components/ShopRow';
import { SHOPS } from '../data/mock';
import { searchShops, SHOP_FILTERS, type ShopFilter } from '../lib/shops';
import { useShops } from '../lib/useShops';
import { WEB_MAX_WIDTH, WebFooter, WebHeader } from './WebHeader';

const COVERS = ['#B4441B', '#3F6212', '#78716C'];
const HOW = [
  { title: 'Elige y personaliza', body: 'Tamaño, leche y extras, como lo pedirías en la barra.' },
  { title: 'Escoge la hora', body: 'Lo antes posible o en un horario que te quede bien.' },
  { title: 'Recoge y suma sellos', body: 'Te avisamos cuando esté listo. Cada pedido suma a tu tarjeta.' },
];

function ShopCard({ shop, index }: { shop: Shop; index: number }) {
  const { open, label } = shopStatus(shop, new Date());
  const status = open ? 'Abierto' : 'Cerrado';
  const place = shop.address ?? 'Sin dirección';
  const phone = formatPhone(shop.phone);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${shop.name}, ${place}. ${status}. ${label}`}
      onPress={() => router.push(shopHref(shop))}
      style={styles.shopCard}
    >
      <View style={[styles.cover, { backgroundColor: open ? (COVERS[index % 2] ?? COVERS[0]) : COVERS[2] }]}>
        <ShopLogo name={shop.name} logoUrl={shop.logo_url} size={72} />
      </View>
      <View style={styles.shopBody}>
        <View style={styles.row}>
          <AppText variant="h3" style={styles.flex}>
            {shop.name}
          </AppText>
          <Badge label={status} tone={open ? 'success' : 'danger'} />
        </View>
        <AppText variant="bodySm" color={t.colors.textMuted}>
          {phone ? `${place} · ${phone}` : place}
        </AppText>
        <AppText variant="bodyStrong">{label}</AppText>
      </View>
    </Pressable>
  );
}

export function WebHome() {
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ShopFilter>('all');
  const [loaded, reload] = useShops();
  const shops = useMemo(() => {
    if (loaded.status !== 'ready') return [];
    const found = searchShops(loaded.data, query);
    return filter === 'open' ? found.filter((s) => shopStatus(s, new Date()).open) : found;
  }, [loaded, filter, query]);
  const home = SHOPS[0]!;
  const left = home.stampGoal - home.stamps;

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <WebHeader />
        <View style={styles.main}>
          <View style={styles.hero}>
            <View style={styles.heroText}>
              <AppText variant="display" accessibilityRole="header" aria-level={1} style={styles.h1}>
                Pide tu café antes de llegar.
              </AppText>
              <AppText variant="body" color={t.colors.textMuted} style={styles.lead}>
                Elige tu cafetería, arma tu pedido y recógelo listo, sin hacer fila. Tus sellos se suman solos.
              </AppText>
              <View style={styles.searchRow} accessibilityRole="search">
                <View style={styles.search}>
                  <Feather name="search" size={20} color={t.colors.textMuted} />
                  <TextInput
                    accessibilityLabel="Buscar cafetería o bebida"
                    placeholder="Buscar cafetería o bebida"
                    placeholderTextColor={t.colors.textSubtle}
                    value={draft}
                    onChangeText={(v) => {
                      setDraft(v);
                      setQuery(v);
                    }}
                    onSubmitEditing={() => setQuery(draft)}
                    returnKeyType="search"
                    style={[textStyle('body'), styles.searchInput]}
                  />
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Buscar" onPress={() => setQuery(draft)} style={styles.searchBtn}>
                  <AppText variant="button" color={t.colors.textInverse}>
                    Buscar
                  </AppText>
                </Pressable>
              </View>
            </View>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Tu tarjeta de ${home.name}: ${home.stamps} de ${home.stampGoal} sellos. ${left} pedidos más para una bebida gratis. Ver todas mis tarjetas`}
              onPress={() => router.navigate('/loyalty')}
              style={styles.stampCard}
            >
              <View style={styles.row}>
                <View style={styles.flex}>
                  <AppText variant="overline" color={t.colors.textInverseMuted}>
                    {`Tu tarjeta · ${home.name}`}
                  </AppText>
                  <AppText variant="display" color={t.colors.textInverse} style={styles.stampCount}>
                    {`${home.stamps} de ${home.stampGoal} sellos`}
                  </AppText>
                  <AppText variant="bodySm" color={t.colors.textInverseMuted}>
                    {`${left} pedidos más para una bebida gratis`}
                  </AppText>
                </View>
                <View style={styles.stampLogo}>
                  <AppText variant="bodyStrong" color={t.colors.onPrimary}>
                    {home.initials}
                  </AppText>
                </View>
              </View>
              <StampDots filled={home.stamps} total={home.stampGoal} />
              <AppText variant="bodyStrong" color={t.colors.textInverse} style={styles.underline}>
                Ver todas mis tarjetas
              </AppText>
            </Pressable>
          </View>

          <View style={styles.section}>
            <View style={[styles.row, styles.wrap]}>
              <AppText variant="h1" accessibilityRole="header" aria-level={2}>
                Cafeterías en MiBarra
              </AppText>
              <View accessibilityRole="radiogroup" aria-label="Filtrar" style={styles.filters}>
                {SHOP_FILTERS.filter((f) => f.id !== 'near').map((f) => {
                  const on = f.id === filter;
                  return (
                    <Pressable
                      key={f.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      aria-pressed={on}
                      onPress={() => setFilter(f.id)}
                      style={[styles.pill, on && styles.pillOn]}
                    >
                      <AppText variant="label" color={on ? t.colors.textInverse : t.colors.text}>
                        {f.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            {loaded.status === 'loading' ? (
              <View accessibilityRole="progressbar" accessibilityLabel="Cargando cafeterías" style={{ paddingVertical: 48 }}>
                <ActivityIndicator color={t.colors.primary} />
              </View>
            ) : loaded.status === 'error' ? (
              <EmptyState icon="wifi-off" title="No pudimos cargar las cafeterías" body={loaded.message} action={<Button label="Reintentar" onPress={reload} />} />
            ) : shops.length ? (
              <View style={styles.grid}>
                {shops.map((shop, i) => (
                  <ShopCard key={shop.id} shop={shop} index={i} />
                ))}
              </View>
            ) : query.trim() || filter !== 'all' ? (
              <EmptyState icon="search" title="Sin resultados" body="No encontramos cafeterías con esa búsqueda. Prueba con otro nombre." />
            ) : (
              <EmptyState icon="coffee" title="Aún no hay cafeterías" body="Cuando una cafetería se una a MiBarra, la verás aquí." />
            )}
          </View>

          <View style={styles.how}>
            {HOW.map((step, i) => (
              <View key={step.title} style={styles.howCard}>
                <AppText variant="display" color={t.colors.textAccent}>
                  {String(i + 1)}
                </AppText>
                <AppText variant="bodyStrong">{step.title}</AppText>
                <AppText variant="bodySm" color={t.colors.textMuted}>
                  {step.body}
                </AppText>
              </View>
            ))}
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
  main: { width: '100%', maxWidth: WEB_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 64, gap: 48 },
  hero: { flexDirection: 'row', flexWrap: 'wrap', gap: 32, alignItems: 'stretch' },
  heroText: { flexGrow: 999, flexShrink: 1, flexBasis: 520, minWidth: 0, justifyContent: 'center', gap: 20 },
  h1: { fontSize: 56, lineHeight: 58, letterSpacing: -1.5 },
  lead: { fontSize: 18, lineHeight: 27, maxWidth: 520 },
  searchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, maxWidth: 560 },
  search: { flexGrow: 1, flexBasis: 300, flexDirection: 'row', alignItems: 'center', gap: 10, height: 56, paddingHorizontal: 16, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.borderStrong, borderRadius: 16 },
  searchInput: { flex: 1, height: 56, color: t.colors.text, fontSize: 16 },
  searchBtn: { height: 56, paddingHorizontal: 24, borderRadius: 16, backgroundColor: t.colors.surfaceInverse, alignItems: 'center', justifyContent: 'center' },
  stampCard: { flexGrow: 1, flexShrink: 1, flexBasis: 340, justifyContent: 'space-between', gap: 24, padding: 28, borderRadius: 28, backgroundColor: t.colors.surfaceInverse },
  stampCount: { fontSize: 34, lineHeight: 40 },
  stampLogo: { width: 52, height: 52, borderRadius: 14, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
  underline: { textDecorationLine: 'underline' },
  section: { gap: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrap: { flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { height: 44, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface, justifyContent: 'center' },
  pillOn: { backgroundColor: t.colors.surfaceInverse, borderColor: t.colors.surfaceInverse },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  shopCard: { flexGrow: 1, flexBasis: 300, maxWidth: 400, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, borderRadius: 22, overflow: 'hidden' },
  cover: { height: 140, alignItems: 'center', justifyContent: 'center' },
  shopBody: { gap: 8, paddingTop: 18, paddingHorizontal: 20, paddingBottom: 20 },
  how: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  howCard: { flexGrow: 1, flexBasis: 240, gap: 8, padding: 24, borderRadius: 20, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border },
});
