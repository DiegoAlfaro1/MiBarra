import { Slot } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Header } from '../src/components/Shell.tsx';
import { DashboardProvider } from '../src/state/DashboardState.tsx';
import { colors } from '../src/theme.ts';

export default function RootLayout() {
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
