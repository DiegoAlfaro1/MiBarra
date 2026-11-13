import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ShopRow } from '../../src/components/ShopRow';
import { AppText, EmptyState, Screen, SectionTitle, StampDots, Avatar, t, textStyle } from '../../src/components/ui';
import { MOCK_CUSTOMER_NAME, PRODUCTS, SHOPS } from '../../src/data/mock';
import { useAppState } from '../../src/state/AppState';

export default function Home() {
  const { session } = useAppState();
  const [query, setQuery] = useState('');
  const name = session?.name ?? MOCK_CUSTOMER_NAME;
  const home = SHOPS[0]!;

  const shops = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SHOPS;
    // Every open shop serves the same sample menu, so a drink match lists the open shops.
    const drinkMatch = PRODUCTS.some((p) => p.name.toLowerCase().includes(q));
    return SHOPS.filter(
      (s) => s.name.toLowerCase().includes(q) || s.area.toLowerCase().includes(q) || (drinkMatch && s.open),
    );
  }, [query]);

  return (
    <Screen>
      <View style={styles.top}>
        <View style={styles.flex}>
          <AppText variant="bodySm" color={t.colors.textMuted}>
            Hola, {name}
          </AppText>
          <AppText variant="h1" accessibilityRole="header">
            ¿Dónde pedimos hoy?
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mi perfil"
          onPress={() => router.navigate('/profile')}
          style={styles.profile}
        >
          <AppText variant="bodyStrong" color={t.colors.textInverse}>
            {name.charAt(0).toUpperCase()}
          </AppText>
        </Pressable>
      </View>

      <View style={styles.search}>
        <Feather name="search" size={20} color={t.colors.textMuted} />
        <TextInput
          accessibilityLabel="Buscar cafetería o bebida"
          placeholder="Buscar cafetería o bebida"
          placeholderTextColor={t.colors.textSubtle}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          style={[textStyle('body'), styles.searchInput]}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${home.name}: ${home.stamps} de ${home.stampGoal} sellos. ${home.stampGoal - home.stamps} sellos más para un café gratis`}
        onPress={() => router.navigate('/loyalty')}
        style={styles.stampCard}
      >
        <View style={styles.stampTop}>
          <Avatar initials={home.initials} size={40} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong" color={t.colors.textInverse}>
              {home.name}
            </AppText>
            <AppText variant="caption" color={t.colors.textInverseMuted}>
              {home.stampGoal - home.stamps} sellos más para un café gratis
            </AppText>
          </View>
          <AppText variant="h2" color={t.colors.textInverse}>
            {home.stamps}/{home.stampGoal}
          </AppText>
        </View>
        <StampDots filled={home.stamps} total={home.stampGoal} />
      </Pressable>

      <SectionTitle right={`${shops.length} en la red`}>Cafeterías cerca de ti</SectionTitle>
      {shops.length ? (
        <View style={styles.list}>
          {shops.map((shop) => (
            <ShopRow key={shop.id} shop={shop} />
          ))}
        </View>
      ) : (
        <EmptyState icon="search" title="Sin resultados" body="No encontramos cafeterías con esa búsqueda. Prueba con otro nombre." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profile: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 16, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, borderRadius: t.radii.controlLg },
  searchInput: { flex: 1, height: 48, color: t.colors.text },
  stampCard: { backgroundColor: t.colors.surfaceInverse, borderRadius: t.radii.cardLg, padding: 16, gap: 14 },
  stampTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  list: { gap: 10 },
});
