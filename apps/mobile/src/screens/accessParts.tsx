import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Field, IconButton, LinkText, t } from '../components/ui';

export type Method = 'phone' | 'email';

/** Top row of the access screens: back button and optional "Omitir" link (to guest). */
export function AccessTop({ skip = true }: { skip?: boolean }) {
  return (
    <View style={styles.top}>
      <IconButton
        icon="chevron-left"
        label="Volver"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))}
      />
      {skip ? <LinkText label="Omitir" onPress={() => router.push('/guest')} /> : null}
    </View>
  );
}

/** "Celular / Correo" segmented tabs. */
export function MethodTabs({ value, onChange }: { value: Method; onChange: (m: Method) => void }) {
  return (
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
          accessibilityState={{ selected: value === id }}
          onPress={() => onChange(id)}
          style={[styles.segmentBtn, value === id && styles.segmentOn]}
        >
          <AppText variant="bodyStrong" color={value === id ? t.colors.text : t.colors.textMuted}>
            {label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

/** Phone (+504) or email field depending on the chosen method. */
export function ContactField({
  method,
  phone,
  email,
  onPhone,
  onEmail,
  errors,
  invalid,
}: {
  method: Method;
  phone: string;
  email: string;
  onPhone: (v: string) => void;
  onEmail: (v: string) => void;
  errors: Record<string, string>;
  invalid?: boolean;
}) {
  return method === 'phone' ? (
    <Field
      label="Número de celular"
      prefix="+504"
      placeholder="9999 9999"
      value={phone}
      onChangeText={onPhone}
      keyboardType="phone-pad"
      autoComplete="tel"
      maxLength={9}
      error={errors.phone ?? (invalid ? ' ' : undefined)}
    />
  ) : (
    <Field
      label="Correo electrónico"
      placeholder="tu@correo.com"
      value={email}
      onChangeText={onEmail}
      keyboardType="email-address"
      autoCapitalize="none"
      autoComplete="email"
      error={errors.email ?? (invalid ? ' ' : undefined)}
    />
  );
}

/** Password field with show/hide toggle. */
export function PasswordField({
  value,
  onChange,
  error,
  placeholder = 'Mínimo 8 caracteres',
  autoComplete,
  show,
  onToggle,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  autoComplete: 'current-password' | 'new-password';
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <View>
      <Field
        label="Contraseña"
        placeholder={placeholder}
        value={value}
        onChangeText={onChange}
        secureTextEntry={!show}
        autoComplete={autoComplete}
        error={error}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        onPress={onToggle}
        style={styles.eye}
      >
        <Feather name={show ? 'eye-off' : 'eye'} size={20} color={t.colors.textMuted} />
      </Pressable>
    </View>
  );
}

/** Row with a checkbox, used for terms. */
export function CheckRow({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: string }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={children} onPress={onToggle} style={styles.check}>
      <View style={[styles.box, checked && { backgroundColor: t.colors.primary, borderColor: t.colors.primary }]}>
        {checked ? <Feather name="check" size={16} color={t.colors.onPrimary} /> : null}
      </View>
      <AppText variant="bodySm" style={styles.flex}>
        {children}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  segment: { flexDirection: 'row', backgroundColor: t.colors.surfaceMuted, borderRadius: t.radii.control, padding: 4 },
  segmentBtn: { flex: 1, minHeight: 44, borderRadius: t.radii.controlSm, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: t.colors.surface },
  eye: { position: 'absolute', right: 4, top: 22, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: t.colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
});
