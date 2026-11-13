import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { AppStateProvider } from '../src/state/AppState';
import { fontAssets } from '../src/theme/fonts';
import { t } from '../src/components/ui';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  // If the fonts fail to load we still render, falling back to system fonts.
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.background }}>
        <ActivityIndicator accessibilityLabel="Cargando" color={t.colors.primary} />
      </View>
    );
  }

  return (
    <AppStateProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.colors.background } }}>
        <Stack.Screen name="item/[productId]" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="dark" />
    </AppStateProvider>
  );
}
