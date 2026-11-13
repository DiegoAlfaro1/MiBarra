import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Field, LinkText, t, type IconName } from '../components/ui';
import { validateAuth, type FieldErrors } from '../lib/validation';

export interface AuthResult {
  name: string;
}

/** Sign-up / log-in form (ACC-01..03). Calls `onSuccess` only when the input is valid. Demo: no account is created. */
export function AuthForm({ onSuccess }: { onSuccess: (result: AuthResult) => void }) {
  const [signup, setSignup] = useState(true);
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keep, setKeep] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});

  const submit = () => {
    const found = validateAuth({ signup, method, name, phone, email, password });
    setErrors(found);
    if (Object.keys(found).length === 0) onSuccess({ name: name.trim() || 'Diego' });
  };
  const icon: IconName = 'coffee';

  return (
    <View style={styles.gap}>
      <View style={styles.intro}>
        <View style={styles.logo}>
          <Feather name={icon} size={28} color={t.colors.onPrimary} />
        </View>
        <AppText variant="h1" accessibilityRole="header">
          {signup ? 'Crea tu cuenta para terminar el pedido' : 'Bienvenido de vuelta'}
        </AppText>
        <AppText variant="body" color={t.colors.textMuted}>
          Una sola cuenta para todas las cafeterías de MiBarra. Tu pedido te espera.
        </AppText>
      </View>

      <View style={styles.segment} accessibilityRole="tablist">
        {(
          [
            ['phone', 'Celular'],
            ['email', 'Correo'],
          ] as const
        ).map(([id, label]) => (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: method === id }}
            onPress={() => setMethod(id)}
            style={[styles.segmentBtn, method === id && styles.segmentOn]}
          >
            <AppText variant="bodyStrong" color={method === id ? t.colors.text : t.colors.textMuted}>
              {label}
            </AppText>
          </Pressable>
        ))}
      </View>

      {signup ? (
        <Field label="Nombre" placeholder="¿Cómo te llamamos al entregar?" value={name} onChangeText={setName} autoComplete="name" error={errors.name} />
      ) : null}
      {method === 'phone' ? (
        <Field
          label="Número de celular"
          prefix="+504"
          placeholder="9999 9999"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          maxLength={9}
          error={errors.phone}
        />
      ) : (
        <Field
          label="Correo electrónico"
          placeholder="tu@correo.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={errors.email}
        />
      )}
      <Field
        label="Contraseña"
        placeholder="Mínimo 8 caracteres"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={signup ? 'new-password' : 'current-password'}
        error={errors.password}
      />

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: keep }}
        onPress={() => setKeep((v) => !v)}
        style={styles.check}
      >
        <View style={[styles.box, keep && { backgroundColor: t.colors.primary, borderColor: t.colors.primary }]}>
          {keep ? <Feather name="check" size={16} color={t.colors.onPrimary} /> : null}
        </View>
        <AppText variant="bodySm">Mantener sesión iniciada en este teléfono</AppText>
      </Pressable>

      <Button label={signup ? 'Crear cuenta y continuar' : 'Iniciar sesión y continuar'} onPress={submit} />
      <View style={styles.switchRow}>
        <AppText variant="bodySm" color={t.colors.textMuted}>
          {signup ? '¿Ya tienes cuenta?' : '¿Eres nuevo?'}
        </AppText>
        <LinkText
          label={signup ? 'Inicia sesión' : 'Crea una cuenta'}
          onPress={() => {
            setSignup((v) => !v);
            setErrors({});
          }}
        />
      </View>
      <AppText variant="caption" color={t.colors.textMuted} style={styles.legal}>
        Al continuar aceptas los Términos y la Política de privacidad.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 16 },
  intro: { gap: 10 },
  logo: { width: 56, height: 56, borderRadius: 18, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', backgroundColor: t.colors.surfaceMuted, borderRadius: t.radii.control, padding: 4 },
  segmentBtn: { flex: 1, minHeight: 44, borderRadius: t.radii.controlSm, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: t.colors.surface },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: t.colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  legal: { textAlign: 'center' },
});
