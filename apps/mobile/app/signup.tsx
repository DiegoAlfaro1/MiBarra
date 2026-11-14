import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Field, LinkText, Screen, t } from '../src/components/ui';
import { passwordStrength, validateSignup, type FieldErrors } from '../src/lib/validation';
import { AccessTop, CheckRow, ContactField, MethodTabs, PasswordField, type Method } from '../src/screens/accessParts';
import { useAppState } from '../src/state/AppState';

const PERKS = ['Sellos en cada cafetería', 'Historial', 'Pedir de nuevo'];
const STRENGTH_CAPTION = ['', 'Muy corta · mínimo 8 caracteres', 'Contraseña aceptable · mínimo 8 caracteres', 'Contraseña fuerte'];

/** Sign-up screen (ACC-01). UI mockup: valid input signs in as the typed name; no account is created. */
export default function SignUp() {
  const { signIn } = useAppState();
  const [method, setMethod] = useState<Method>('phone');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [terms, setTerms] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const strength = passwordStrength(password);

  const submit = () => {
    const found = validateSignup({ signup: true, method, name, phone, email, password, acceptedTerms: terms });
    setErrors(found);
    if (Object.keys(found).length === 0) {
      signIn({ name: name.trim() });
      router.replace('/');
    }
  };

  return (
    <Screen header={<View style={styles.pad}><AccessTop /></View>}>
      <View style={styles.gap}>
        <AppText variant="h1" accessibilityRole="header">
          Crea tu cuenta
        </AppText>
        <View style={styles.chips}>
          {PERKS.map((p) => (
            <View key={p} style={styles.chip}>
              <AppText variant="caption" color={t.palette.rust900}>
                {p}
              </AppText>
            </View>
          ))}
        </View>
        <Field label="Nombre" placeholder="¿Cómo te llamamos al entregar?" value={name} onChangeText={setName} autoComplete="name" error={errors.name} />
        <AppText variant="label">Registrarme con</AppText>
        <MethodTabs value={method} onChange={(m) => { setMethod(m); setErrors({}); }} />
        <ContactField method={method} phone={phone} email={email} onPhone={setPhone} onEmail={setEmail} errors={errors} />
        <PasswordField value={password} onChange={setPassword} error={errors.password} autoComplete="new-password" show={show} onToggle={() => setShow((v) => !v)} />
        {strength > 0 ? (
          <View accessible accessibilityLabel={STRENGTH_CAPTION[strength]} style={styles.meterWrap}>
            <View style={styles.meter}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={[styles.bar, i <= strength && { backgroundColor: strength === 1 ? t.colors.textDanger : '#15803D' }]} />
              ))}
            </View>
            <AppText variant="caption" color={t.colors.textMuted}>
              {STRENGTH_CAPTION[strength]}
            </AppText>
          </View>
        ) : null}
        <CheckRow checked={terms} onToggle={() => setTerms((v) => !v)}>
          Acepto los Términos y la Política de privacidad
        </CheckRow>
        {errors.terms ? (
          <AppText variant="caption" color={t.colors.textDanger} accessibilityLiveRegion="polite">
            {errors.terms}
          </AppText>
        ) : null}
        <Button label="Crear cuenta" onPress={submit} disabled={!terms} />
        <View style={styles.row}>
          <AppText variant="bodySm" color={t.colors.textMuted}>
            ¿Ya tienes cuenta?
          </AppText>
          <LinkText label="Inicia sesión" onPress={() => router.replace('/signin')} />
        </View>
        <View style={styles.row}>
          <LinkText label="Continuar como invitado" onPress={() => router.push('/guest')} color={t.colors.textMuted} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: t.layout.gutter },
  gap: { gap: 16, paddingBottom: 24 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: t.palette.rust100, borderRadius: t.radii.pill, paddingHorizontal: 12, paddingVertical: 6 },
  meterWrap: { gap: 6 },
  meter: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: t.palette.stone200 },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
});
