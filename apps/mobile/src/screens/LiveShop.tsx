import { Feather } from '@expo/vector-icons';
import { formatPhone, shopStatus, weeklyHours, type Shop } from '@mibarra/shared';
import { router } from 'expo-router';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';

import { ShopLogo } from '../components/ShopLogo';
import { AppText, BackHeader, Banner, Button, EmptyState, Screen, t } from '../components/ui';
import { useShop } from '../lib/useShops';

/** A shop read from Supabase: the profile the owner saved (logo, address, phone, hours). */
export function LiveShop({ id }: { id: string | undefined }) {
  const [loaded, reload] = useShop(id);

  if (loaded.status === 'loading') {
    return (
      <Screen header={<BackHeader />}>
        <View accessibilityRole="progressbar" accessibilityLabel="Cargando cafetería" style={styles.center}>
          <ActivityIndicator color={t.colors.primary} />
        </View>
      </Screen>
    );
  }
  if (loaded.status === 'error') {
    return (
      <Screen header={<BackHeader />}>
        <EmptyState icon="wifi-off" title="No pudimos cargar la cafetería" body={loaded.message} action={<Button label="Reintentar" onPress={reload} />} />
      </Screen>
    );
  }
  if (!loaded.data) {
    return (
      <Screen header={<BackHeader />}>
        <EmptyState
          icon="alert-circle"
          title="No encontramos esta cafetería"
          body="Puede que ya no esté en la red de MiBarra."
          action={<Button label="Ver cafeterías" onPress={() => router.replace('/')} />}
        />
      </Screen>
    );
  }
  return <Profile shop={loaded.data} />;
}

function Profile({ shop }: { shop: Shop }) {
  const { open, label } = shopStatus(shop, new Date());
  const phone = formatPhone(shop.phone);
  return (
    <Screen header={<BackHeader title={shop.name} subtitle={shop.address ?? undefined} />}>
      <View style={styles.top}>
        <ShopLogo name={shop.name} logoUrl={shop.logo_url} size={72} />
        <AppText variant="bodyStrong" color={open ? t.colors.textSuccess : t.colors.textDanger}>
          ● {label}
        </AppText>
      </View>

      {shop.address ? <Info icon="map-pin" title="Dirección" text={shop.address} /> : null}
      {phone ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Llamar al ${phone}`}
          onPress={() => void Linking.openURL(`tel:${shop.phone}`)}
          style={styles.info}
        >
          <Feather name="phone" size={20} color={t.colors.textMuted} />
          <View style={styles.flex}>
            <AppText variant="caption" color={t.colors.textMuted}>
              Teléfono
            </AppText>
            <AppText variant="bodyStrong">{phone}</AppText>
          </View>
        </Pressable>
      ) : null}

      <AppText variant="h2" accessibilityRole="header">
        Horario
      </AppText>
      <View style={styles.hours}>
        {weeklyHours(shop.hours).map((row) => (
          <View key={row.day} accessible accessibilityLabel={`${row.label}: ${row.text}`} style={styles.hoursRow}>
            <AppText variant="body">{row.label}</AppText>
            <AppText variant="bodyStrong" color={row.text === 'Cerrado' ? t.colors.textMuted : t.colors.text}>
              {row.text}
            </AppText>
          </View>
        ))}
      </View>

      <Banner tone="neutral" icon="clock" title="Menú próximamente">
        El menú de esta cafetería todavía no está disponible para pedir desde la app.
      </Banner>
    </Screen>
  );
}

function Info({ icon, title, text }: { icon: 'map-pin'; title: string; text: string }) {
  return (
    <View accessible accessibilityLabel={`${title}: ${text}`} style={styles.info}>
      <Feather name={icon} size={20} color={t.colors.textMuted} />
      <View style={styles.flex}>
        <AppText variant="caption" color={t.colors.textMuted}>
          {title}
        </AppText>
        <AppText variant="bodyStrong">{text}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { paddingVertical: 48, alignItems: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, padding: 12, backgroundColor: t.colors.surface, borderRadius: t.radii.card, borderWidth: 1, borderColor: t.colors.border },
  hours: { backgroundColor: t.colors.surface, borderRadius: t.radii.card, borderWidth: 1, borderColor: t.colors.border, paddingHorizontal: 12 },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
});
