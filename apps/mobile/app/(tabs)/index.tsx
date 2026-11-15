import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ShopRow } from '../../src/components/ShopRow';
import { AppText, Button, EmptyState, Screen, SectionTitle, StampDots, Avatar, t, textStyle } from '../../src/components/ui';
import { SHOPS } from '../../src/data/mock';
import { greetingName } from '../../src/lib/access';
import { searchShops } from '../../src/lib/shops';
import { useShops } from '../../src/lib/useShops';
import { useIsWide } from '../../src/lib/useIsWide';
import { useAppState } from '../../src/state/AppState';
import { WebHome } from '../../src/web/WebHome';

export default function Home() {
  const wide = useIsWide();
  // Browsing shops and menus needs no account; sign-up is asked for at checkout.
  return wide ? <WebHome /> : <MobileHome />;
}

function MobileHome() {
  const { session } = useAppState();
  const [query, setQuery] = useState('');
  const name = greetingName(session);
  const home = SHOPS[0]!;

  const [loaded, reload] = useShops();
  const shops = useMemo(() => (loaded.status === 'ready' ? searchShops(loaded.data, query) : []), [loaded, query]);

  return (
    <Screen>
      <View style={styles.top}>
        <View style={styles.flex}>
          <AppText variant="bodySm" color={t.colors.textMuted}>
            {name ? `Hola, ${name}` : 'Hola'}
          </AppText>
          <AppText variant="h1" accessibilityRole="header">
            ¿Dónde pedimos hoy?
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={name ? 'Mi perfil' : 'Iniciar sesión o crear cuenta'}
          onPress={() => router.navigate('/profile')}
          style={styles.profile}
        >
          <AppText variant="bodyStrong" color={t.colors.textInverse}>
            {name ? name.charAt(0).toUpperCase() : '?'}
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

      <SectionTitle right={loaded.status === 'ready' ? `${shops.length} en la red` : undefined}>Cafeterías cerca de ti</SectionTitle>
      {loaded.status === 'loading' ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Cargando cafeterías" style={styles.loading}>
          <ActivityIndicator color={t.colors.primary} />
        </View>
      ) : loaded.status === 'error' ? (
        <EmptyState
          icon="wifi-off"
          title="No pudimos cargar las cafeterías"
          body={loaded.message}
          action={<Button label="Reintentar" onPress={reload} />}
        />
      ) : shops.length ? (
        <View style={styles.list}>
          {shops.map((shop) => (
            <ShopRow key={shop.id} shop={shop} />
          ))}
        </View>
      ) : query.trim() ? (
        <EmptyState icon="search" title="Sin resultados" body="No encontramos cafeterías con esa búsqueda. Prueba con otro nombre." />
      ) : (
        <EmptyState icon="coffee" title="Aún no hay cafeterías" body="Cuando una cafetería se una a MiBarra, la verás aquí." />
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
  loading: { paddingVertical: 32, alignItems: 'center' },
});
