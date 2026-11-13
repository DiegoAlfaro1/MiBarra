import { Feather } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, t } from '../components/ui';
import { MOCK_CUSTOMER_NAME } from '../data/mock';
import { useAppState } from '../state/AppState';

export const WEB_MAX_WIDTH = 1200;

const NAV = [
  { label: 'Explorar', href: '/', match: (p: string) => p === '/' || p.startsWith('/shop') },
  { label: 'Mis pedidos', href: '/orders', match: (p: string) => p.startsWith('/orders') },
  { label: 'Mis sellos', href: '/loyalty', match: (p: string) => p.startsWith('/loyalty') },
] as const;

export function WebHeader() {
  const pathname = usePathname();
  const { session } = useAppState();
  const name = session?.name ?? MOCK_CUSTOMER_NAME;
  return (
    <View style={styles.bar} accessibilityRole="header">
      <View style={styles.inner}>
        <Pressable accessibilityRole="link" accessibilityLabel="MiBarra, ir al inicio" onPress={() => router.navigate('/')} style={styles.brand}>
          <View style={styles.logo}>
            <Feather name="coffee" size={20} color={t.colors.onPrimary} />
          </View>
          <AppText variant="h2">MiBarra</AppText>
        </Pressable>
        <View accessibilityRole="navigation" aria-label="Principal" style={styles.nav}>
          {NAV.map((item) => {
            const current = item.match(pathname);
            return (
              <Pressable
                key={item.label}
                accessibilityRole="link"
                accessibilityState={{ selected: current }}
                onPress={() => router.navigate(item.href)}
                style={[styles.link, current && styles.linkCurrent]}
              >
                <AppText variant={current ? 'bodyStrong' : 'body'}>{item.label}</AppText>
              </Pressable>
            );
          })}
          <Pressable accessibilityRole="link" accessibilityLabel={`Mi perfil, ${name}`} onPress={() => router.navigate('/profile')} style={styles.profile}>
            <View style={styles.avatar}>
              <AppText variant="badge" color={t.colors.textInverse}>
                {name.charAt(0).toUpperCase()}
              </AppText>
            </View>
            <AppText variant="bodyStrong">{name}</AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function WebFooter() {
  return (
    <View style={styles.footer}>
      <View style={[styles.inner, { paddingVertical: 32 }]}>
        <AppText variant="h3" color={t.colors.textInverse}>
          MiBarra
        </AppText>
        <Pressable accessibilityRole="link" style={styles.join}>
          <AppText variant="bodyStrong" color={t.colors.textInverse}>
            ¿Tienes una cafetería? Únete a MiBarra
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: t.colors.surface, borderBottomWidth: 1, borderBottomColor: t.colors.border },
  inner: { width: '100%', maxWidth: WEB_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 24, minHeight: 72, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  logo: { width: 36, height: 36, borderRadius: 10, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  link: { minHeight: 44, paddingHorizontal: 14, borderRadius: 10, justifyContent: 'center' },
  linkCurrent: { backgroundColor: t.colors.surfaceMuted },
  profile: { marginLeft: 8, flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingLeft: 6, paddingRight: 14, borderRadius: 22, borderWidth: 1, borderColor: t.colors.border },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: t.colors.surfaceInverse, alignItems: 'center', justifyContent: 'center' },
  footer: { backgroundColor: t.colors.surfaceInverse, marginTop: 'auto' },
  join: { minHeight: 44, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: t.palette.stone600, justifyContent: 'center' },
});
