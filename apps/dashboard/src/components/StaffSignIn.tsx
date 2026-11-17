import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '../state/AuthState.tsx';
import { bodyFont, colors, typography } from '../theme.ts';

/** Sign-in for shop staff (barista, manager, owner) and platform admins. */
export function StaffSignIn() {
  const { signIn, notice } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(await signIn(email, password));
    setBusy(false);
  };
  const message = error ?? notice;

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={[typography.h2, { color: colors.text }]} accessibilityRole="header">Panel MiBarra</Text>
        <Text style={[typography.body, { color: colors.textMuted }]}>Inicia sesión con tu cuenta del negocio.</Text>
        <Text style={styles.label}>Correo</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          accessibilityLabel="Correo"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          accessibilityLabel="Contraseña"
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={submit}
        />
        {message ? <Text accessibilityRole="alert" style={styles.error}>{message}</Text> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Iniciar sesión"
          accessibilityState={{ disabled: busy, busy }}
          disabled={busy}
          onPress={submit}
          style={[styles.button, busy && { opacity: 0.6 }]}
        >
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Iniciar sesión</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, minHeight: 600 },
  card: { width: '100%', maxWidth: 420, backgroundColor: colors.surface, borderRadius: 16, padding: 24, gap: 8 },
  label: { fontFamily: bodyFont, fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 8 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.textMuted, borderRadius: 12, paddingHorizontal: 12, fontFamily: bodyFont, fontSize: 16, color: colors.text },
  error: { color: '#B3261E', fontFamily: bodyFont, fontSize: 15, fontWeight: '600', marginTop: 8 },
  button: { minHeight: 48, marginTop: 16, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontFamily: bodyFont, fontSize: 16, fontWeight: '700' },
});
