import { Slot } from 'expo-router';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { Header } from '../src/components/Shell.tsx';
import { StaffSignIn } from '../src/components/StaffSignIn.tsx';
import { AuthProvider, useAuth } from '../src/state/AuthState.tsx';
import { DashboardProvider } from '../src/state/DashboardState.tsx';
import { colors } from '../src/theme.ts';

/** Shows the dashboard only to signed-in staff; everyone else sees the staff sign-in. */
function Gate() {
  const { status } = useAuth();
  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator accessibilityLabel="Cargando" color={colors.primary} />
      </View>
    );
  }
  if (status === 'signedOut') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StaffSignIn />
      </View>
    );
  }
  return (
    <DashboardProvider>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView stickyHeaderIndices={[0]} contentContainerStyle={{ flexGrow: 1 }}>
          <Header />
          <Slot />
        </ScrollView>
      </View>
    </DashboardProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
