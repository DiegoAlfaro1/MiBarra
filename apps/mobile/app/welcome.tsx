import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, t, type IconName } from '../src/components/ui';

const BENEFITS: { icon: IconName; label: string }[] = [
  { icon: 'clock', label: 'Elige la hora de recogida' },
  { icon: 'check-circle', label: 'Te avisamos cuando esté listo' },
  { icon: 'star', label: 'Una tarjeta de sellos en cada cafetería' },
];

/** Welcome screen (ACC-02). UI mockup: buttons only navigate. */
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const onAccent = t.colors.onPrimary;
  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.ring} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Feather name="coffee" size={22} color={t.colors.primary} />
          </View>
          <AppText variant="h2" color={onAccent}>
            MiBarra
          </AppText>
        </View>

        <View style={styles.hero}>
          <AppText variant="display" color={onAccent} accessibilityRole="header">
            Tu café, listo cuando llegas.
          </AppText>
          <AppText variant="body" color={onAccent}>
            Pide en tus cafeterías favoritas, recoge sin hacer fila y junta sellos con cada pedido.
          </AppText>
          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View key={b.label} style={styles.benefit}>
                <View style={styles.badge}>
                  <Feather name={b.icon} size={18} color={onAccent} />
                </View>
                <AppText variant="bodyStrong" color={onAccent} style={styles.flex}>
                  {b.label}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Crear cuenta" onPress={() => router.push('/signup')} style={[styles.btn, styles.btnFilled]}>
          <AppText variant="button" color={t.colors.text}>
            Crear cuenta
          </AppText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Ya tengo cuenta" onPress={() => router.push('/signin')} style={[styles.btn, styles.btnOutline]}>
          <AppText variant="button" color={onAccent}>
            Ya tengo cuenta
          </AppText>
        </Pressable>
        <Pressable accessibilityRole="link" accessibilityLabel="Continuar como invitado" onPress={() => router.push('/guest')} style={styles.guest}>
          <AppText variant="buttonSm" color={onAccent} style={styles.underline}>
            Continuar como invitado
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.colors.primary, paddingHorizontal: t.layout.gutter, overflow: 'hidden' },
  ring: { position: 'absolute', top: -80, right: -100, width: 300, height: 300, borderRadius: 150, borderWidth: 40, borderColor: 'rgba(255,255,255,0.08)' },
  scroll: { flexGrow: 1, gap: 32 },
  flex: { flex: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  hero: { gap: 16, paddingTop: 16 },
  benefits: { gap: 14, marginTop: 8 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  actions: { gap: 12, paddingTop: 16 },
  btn: { minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btnFilled: { backgroundColor: '#FFFFFF' },
  btnOutline: { borderWidth: 2, borderColor: '#FFFFFF' },
  guest: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  underline: { textDecorationLine: 'underline' },
});
