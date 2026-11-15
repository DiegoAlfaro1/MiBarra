import { can, type Permission } from '@mibarra/shared';
import { Link, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../state/AuthState.tsx';
import { useDashboard } from '../state/DashboardState.tsx';
import { SHOP_NAME } from '../mock/data.ts';
import { bodyFont, colors, theme, tones, typography } from '../theme.ts';

const NAV: readonly { href: '/' | '/menu' | '/scan' | '/summary' | '/catalog' | '/shop'; label: string; needs?: Permission }[] = [
  { href: '/', label: 'Pedidos' },
  { href: '/menu', label: 'Menú' },
  { href: '/scan', label: 'Escanear' },
  { href: '/summary', label: 'Resumen' },
  { href: '/catalog', label: 'Editar menú', needs: 'editMenu' },
  { href: '/shop', label: 'Tienda', needs: 'editShopSettings' },
];

/** Dark header with shop name, section nav and the open/pause switch. */
export function Header() {
  const path = usePathname();
  const { open, setOpen } = useDashboard();
  const { signOut, access } = useAuth();
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <View style={styles.logo} accessibilityElementsHidden>
          <Text style={styles.logoText}>☕</Text>
        </View>
        <View>
          <Text style={[typography.h3, { color: colors.textInverse }]}>{SHOP_NAME}</Text>
          <Text style={[typography.badge, { color: theme.palette.stone300 }]}>Panel MiBarra</Text>
        </View>
      </View>
      <View style={styles.nav} accessibilityRole="menu" aria-label="Panel">
        {NAV.filter((item) => !item.needs || can(access?.role, item.needs)).map((item) => {
          const active = item.href === '/' ? path === '/' : path.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} asChild>
              <Pressable accessibilityRole="link" aria-current={active ? 'page' : undefined} style={StyleSheet.flatten([styles.navItem, active && styles.navActive])}>
                <Text style={[styles.navText, { color: active ? colors.text : colors.textInverse, fontWeight: active ? '700' : '600' }]}>{item.label}</Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: open }}
        accessibilityLabel="Recibir pedidos"
        onPress={() => setOpen(!open)}
        style={[styles.switch, { backgroundColor: open ? tones.success.solid : colors.textMuted }]}
      >
        <View style={styles.knob} />
        <Text style={styles.switchText}>{open ? 'Recibiendo pedidos' : 'Pedidos en pausa'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar sesión" onPress={signOut} style={styles.navItem}>
        <Text style={[styles.navText, { color: colors.textInverse }]}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.surfaceInverse, paddingHorizontal: 24, paddingVertical: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontFamily: bodyFont, fontSize: 20 },
  nav: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  navItem: { minHeight: 48, paddingHorizontal: 18, borderRadius: 12, justifyContent: 'center' },
  navActive: { backgroundColor: colors.surface },
  navText: { fontFamily: bodyFont, fontSize: 15 },
  switch: { minHeight: 48, paddingLeft: 6, paddingRight: 16, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 10 },
  knob: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF' },
  switchText: { color: '#FFFFFF', fontFamily: bodyFont, fontSize: 15, fontWeight: '700' },
});
