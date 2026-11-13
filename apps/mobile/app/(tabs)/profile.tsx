import { StyleSheet, View } from 'react-native';

import { AppText, Avatar, Button, Card, Screen, t } from '../../src/components/ui';
import { AuthForm } from '../../src/screens/AuthForm';
import { useAppState } from '../../src/state/AppState';

export default function Profile() {
  const { session, signIn, signOut } = useAppState();

  if (!session) {
    return (
      <Screen>
        <AuthForm onSuccess={signIn} />
      </Screen>
    );
  }
  return (
    <Screen>
      <AppText variant="h1" accessibilityRole="header">
        Perfil
      </AppText>
      <Card style={styles.card}>
        <Avatar initials={session.name.charAt(0).toUpperCase()} />
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{session.name}</AppText>
          <AppText variant="caption" color={t.colors.textMuted}>
            Sesión iniciada en este teléfono
          </AppText>
        </View>
      </Card>
      <Button label="Cerrar sesión" variant="outline" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
