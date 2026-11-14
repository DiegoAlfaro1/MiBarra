import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, LinkText, t } from '../components/ui';

/** Desktop web shell for sign in, sign up and guest (WA2–WA4): brand header, centred form card, optional side panel. */
export function WebAccessPage({
  title,
  subtitle,
  aside,
  guestLink = true,
  children,
}: {
  title: string;
  subtitle: string;
  aside?: ReactNode;
  guestLink?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.bar} accessibilityRole="header">
          <View style={styles.barInner}>
            <Pressable accessibilityRole="link" accessibilityLabel="MiBarra, ir al inicio de sesión" onPress={() => router.replace('/signin')} style={styles.brand}>
              <View style={styles.logo}>
                <Feather name="coffee" size={20} color={t.colors.onPrimary} />
              </View>
              <AppText variant="h2">MiBarra</AppText>
            </Pressable>
            {guestLink ? <LinkText label="Continuar como invitado" onPress={() => router.push('/guest')} /> : null}
          </View>
        </View>
        <View style={styles.main}>
          <View style={styles.card}>
            <AppText variant="h1" accessibilityRole="header" aria-level={1}>
              {title}
            </AppText>
            <AppText variant="body" color={t.colors.textMuted}>
              {subtitle}
            </AppText>
            <View style={styles.form}>{children}</View>
          </View>
          {aside ? <View style={styles.aside}>{aside}</View> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: t.colors.background },
  scroll: { flexGrow: 1 },
  bar: { backgroundColor: t.colors.surface, borderBottomWidth: 1, borderBottomColor: t.colors.border },
  barInner: { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingHorizontal: 24, minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  logo: { width: 36, height: 36, borderRadius: 10, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
  main: { width: '100%', maxWidth: 1000, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 48, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', gap: 32 },
  card: { flexGrow: 1, flexBasis: 440, maxWidth: 520, gap: 8, padding: 32, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, borderRadius: t.radii.cardLg },
  form: { marginTop: 16 },
  aside: { flexGrow: 1, flexBasis: 280, maxWidth: 380, gap: 16 },
});
