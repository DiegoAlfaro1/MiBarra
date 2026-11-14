import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { NO_ACCESS_MESSAGE, resolveDashboardAccess, validateSignIn } from '../logic/access.ts';
import { supabase } from '../lib/supabase.ts';
import { colors, typography } from '../theme.ts';

type Status = 'loading' | 'signed_out' | 'allowed';

/** Shows the staff sign-in until the login belongs to a barista, manager, owner or platform admin. */
export function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  // Checks the current login. Anyone without dashboard access is signed out straight away.
  const check = useCallback(async (): Promise<boolean> => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return false;
    const [members, admin] = await Promise.all([
      supabase.from('shop_members').select('role, active').eq('user_id', user.id),
      supabase.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle(),
    ]);
    if (members.error || admin.error) throw new Error('lookup failed');
    const access = resolveDashboardAccess({ user, memberships: members.data ?? [], isPlatformAdmin: !!admin.data });
    if (!access.allowed) await supabase.auth.signOut();
    return access.allowed;
  }, []);

  useEffect(() => {
    let live = true;
    check()
      .then((ok) => live && setStatus(ok ? 'allowed' : 'signed_out'))
      .catch(() => {
        if (!live) return;
        setError('No pudimos verificar tu cuenta. Revisa tu conexión e inténtalo de nuevo.');
        setStatus('signed_out');
      });
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && live) setStatus('signed_out');
    });
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, [check]);

  if (status === 'loading') {
    return (
      <View style={styles.center} accessibilityLabel="Cargando">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (status === 'allowed') return <>{children}</>;
  return (
    <SignIn
      initialError={error}
      onSubmit={async (email, password) => {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) return 'Correo o contraseña incorrectos.';
        try {
          if (await check()) {
            setStatus('allowed');
            return null;
          }
          return NO_ACCESS_MESSAGE;
        } catch {
          await supabase.auth.signOut();
          return 'No pudimos verificar tu cuenta. Inténtalo de nuevo.';
        }
      }}
    />
  );
}

function SignIn({ initialError, onSubmit }: { initialError: string | null; onSubmit: (email: string, password: string) => Promise<string | null> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(initialError);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    const invalid = validateSignIn(email, password);
    if (invalid) return setError(invalid);
    setBusy(true);
    setError(null);
    setError(await onSubmit(email, password));
    setBusy(false);
  };

  return (
    <View style={styles.center}>
      <View style={styles.card}>
        <Text style={typography.h2} accessibilityRole="header">Panel MiBarra</Text>
        <Text style={[typography.body, { color: colors.textMuted }]}>Inicia sesión con tu cuenta de la cafetería.</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Correo"
          accessibilityLabel="Correo"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Contraseña"
          accessibilityLabel="Contraseña"
          secureTextEntry
          autoComplete="current-password"
          onSubmitEditing={submit}
        />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} onPress={submit} style={[styles.button, busy && { opacity: 0.6 }]}>
          <Text style={styles.buttonText}>{busy ? 'Entrando…' : 'Entrar'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, minHeight: 400, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.background },
  card: { width: '100%', maxWidth: 420, gap: 14, padding: 24, borderRadius: 16, backgroundColor: colors.surface },
  input: { minHeight: 48, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.textMuted, color: colors.text, fontSize: 16 },
  error: { color: '#B3261E', fontSize: 15, fontWeight: '600' },
  button: { minHeight: 48, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
