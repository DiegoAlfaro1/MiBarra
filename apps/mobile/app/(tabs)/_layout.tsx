import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { t, textStyle, type IconName } from '../../src/components/ui';

const icon = (name: IconName) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Feather name={name} size={24} color={color as string} />;
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.colors.text,
        tabBarInactiveTintColor: t.colors.textSubtle,
        tabBarLabelStyle: { ...textStyle('caption'), fontFamily: textStyle('label').fontFamily },
        tabBarStyle: { backgroundColor: t.colors.surface, borderTopColor: t.colors.border, minHeight: 64 },
        tabBarItemStyle: { minHeight: t.minTouchTarget },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="orders" options={{ title: 'Pedidos', tabBarIcon: icon('file-text') }} />
      <Tabs.Screen name="loyalty" options={{ title: 'Sellos', tabBarIcon: icon('credit-card') }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: icon('user') }} />
    </Tabs>
  );
}
