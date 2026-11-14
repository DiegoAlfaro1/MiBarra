import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Banner, Button, Field, LinkText, t } from '../components/ui';
import { signIn as signInRequest, signUp as signUpRequest } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { passwordStrength, validateAuth, validateGuest, validateSignup, type FieldErrors } from '../lib/validation';
import { useAppState } from '../state/AppState';
import { CheckRow, ContactField, MethodTabs, PasswordField, type Method } from './accessParts';

// Form bodies shared by the phone screens and the desktop web pages (design A2–A4 and WA2–WA4).
// Sign-in and sign-up use Supabase Auth; the guest form starts a local no-account session.

const PERKS = ['Sellos en cada cafetería', 'Historial', 'Pedir de nuevo'];
const STRENGTH_CAPTION = ['', 'Muy corta · mínimo 8 caracteres', 'Contraseña aceptable · mínimo 8 caracteres', 'Contraseña fuerte'];
const PASSWORD_HINT = 'Mínimo 8 caracteres, una mayúscula y un carácter especial.';

export const GUEST_INCLUDED = [
  { ok: true, label: 'Ver menús, pedir y pagar' },
  { ok: true, label: 'Seguir tu pedido en vivo' },
  { ok: false, label: 'Juntar sellos y recompensas' },
  { ok: false, label: 'Guardar historial y pedir de nuevo' },
];

export function SignInForm({ showTitle = true }: { showTitle?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<Method>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failed, setFailed] = useState(false);

  const [failure, setFailure] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    const found = validateAuth({ signup: false, method, name: '', phone, email, password });
    setErrors(found);
    setFailed(Object.keys(found).length > 0);
    setFailure(null);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    const outcome = await signInRequest(supabase, { method, phone, email, password });
    setBusy(false);
    if (outcome.ok) router.replace('/');
    else setFailure(outcome.message);
  };

  return (
    <View style={styles.gap}>
      {showTitle ? (
        <>
          <AppText variant="h1" accessibilityRole="header">
            Hola de nuevo
          </AppText>
          <AppText variant="body" color={t.colors.textMuted}>
            Inicia sesión para ver tus sellos y pedidos.
          </AppText>
        </>
      ) : null}
      <MethodTabs value={method} onChange={(m) => { setMethod(m); setErrors({}); setFailed(false); }} />
      {failed || failure ? (
        <Banner tone="danger" icon="alert-circle">
          {failure ?? (method === 'phone' ? 'Revisa tu número y contraseña. Intenta de nuevo.' : 'Revisa tu correo y contraseña. Intenta de nuevo.')}
        </Banner>
      ) : null}
      <ContactField method={method} phone={phone} email={email} onPhone={setPhone} onEmail={setEmail} errors={errors} />
      <PasswordField value={password} onChange={setPassword} error={errors.password} autoComplete="current-password" show={show} onToggle={() => setShow((v) => !v)} />
      <LinkText label="¿Olvidaste tu contraseña?" onPress={() => undefined} />
      <Button label="Iniciar sesión" onPress={submit} disabled={busy} />
      <AppText variant="caption" color={t.colors.textMuted} style={styles.center}>
        o
      </AppText>
      <Button label="Con Google" variant="outline" icon="globe" onPress={() => undefined} />
      <Button label="Con Apple" variant="outline" icon="smartphone" onPress={() => undefined} />
      <View style={styles.row}>
        <AppText variant="bodySm" color={t.colors.textMuted}>
          ¿No tienes cuenta?
        </AppText>
        <LinkText label="Crear cuenta" onPress={() => router.replace('/signup')} />
      </View>
      <View style={styles.row}>
        <LinkText label="Continuar como invitado" onPress={() => router.push('/guest')} color={t.colors.textMuted} />
      </View>
    </View>
  );
}

export function SignUpForm({ showTitle = true }: { showTitle?: boolean }) {
  const [method, setMethod] = useState<Method>('phone');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [terms, setTerms] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const strength = passwordStrength(password);

  const submit = async () => {
    if (loading) return;
    const found = validateSignup({ signup: true, method, name, phone, email, password, acceptedTerms: terms });
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;
    setLoading(true);
    const result = await signUpRequest(supabase, name, { method, phone, email, password });
    setLoading(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setCreated(true);
    // TODO(FUTURE, issue #16): send a verification email and ask the user to confirm it before sign-in.
    setTimeout(() => router.replace('/signin'), 1500);
  };

  return (
    <View style={styles.gap}>
      {showTitle ? (
        <>
          <AppText variant="h1" accessibilityRole="header">
            Crea tu cuenta
          </AppText>
          <PerkChips />
        </>
      ) : null}
      {created ? (
        <Banner tone="success" icon="check-circle">
          ¡Cuenta creada! Ahora inicia sesión.
        </Banner>
      ) : null}
      {formError ? (
        <Banner tone="danger" icon="alert-circle">
          {formError}
        </Banner>
      ) : null}
      <Field label="Nombre" placeholder="¿Cómo te llamamos al entregar?" value={name} onChangeText={setName} autoComplete="name" error={errors.name} />
      <AppText variant="label">Registrarme con</AppText>
      <MethodTabs value={method} onChange={(m) => { setMethod(m); setErrors({}); }} />
      <ContactField method={method} phone={phone} email={email} onPhone={setPhone} onEmail={setEmail} errors={errors} />
      <PasswordField value={password} onChange={setPassword} error={errors.password} autoComplete="new-password" show={show} onToggle={() => setShow((v) => !v)} />
      <AppText variant="caption" color={t.colors.textMuted}>
        {PASSWORD_HINT}
      </AppText>
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
      <Button label={loading ? 'Creando cuenta…' : 'Crear cuenta'} onPress={submit} disabled={!terms || loading || created} />
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
  );
}

export function PerkChips() {
  return (
    <View style={styles.chips}>
      {PERKS.map((p) => (
        <View key={p} style={styles.chip}>
          <AppText variant="caption" color={t.palette.rust900}>
            {p}
          </AppText>
        </View>
      ))}
    </View>
  );
}

export function GuestForm({ showTitle = true, showIncluded = true }: { showTitle?: boolean; showIncluded?: boolean }) {
  const { startGuest } = useAppState();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const submit = () => {
    const found = validateGuest({ name, phone });
    setErrors(found);
    if (Object.keys(found).length === 0) {
      startGuest(name.trim());
      router.replace('/');
    }
  };

  return (
    <View style={styles.gap}>
      {showTitle ? (
        <>
          <AppText variant="h1" accessibilityRole="header">
            Pide sin crear cuenta
          </AppText>
          <AppText variant="body" color={t.colors.textMuted}>
            Solo dinos cómo llamarte en la barra. Puedes crear tu cuenta cuando quieras.
          </AppText>
        </>
      ) : null}
      <Field label="Tu nombre" placeholder="Ej.: Diego" value={name} onChangeText={setName} autoComplete="name" error={errors.name} />
      <Field
        label="Celular (opcional, para avisarte por WhatsApp)"
        prefix="+504"
        placeholder="9999 9999"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        maxLength={9}
        error={errors.phone}
      />
      {showIncluded ? <GuestIncluded /> : null}
      <StampNote />
      <Button label="Empezar a pedir" variant="dark" onPress={submit} />
      <Button label="Mejor crear cuenta" variant="outline" onPress={() => router.replace('/signup')} style={styles.alt} />
    </View>
  );
}

export function GuestIncluded() {
  return (
    <View style={styles.card}>
      {GUEST_INCLUDED.map((i) => (
        <View key={i.label} style={styles.item} accessible accessibilityLabel={`${i.ok ? 'Incluido' : 'No incluido'}: ${i.label}`}>
          <Feather name={i.ok ? 'check' : 'x'} size={18} color={i.ok ? '#15803D' : t.colors.textSubtle} />
          <AppText variant="bodySm" color={i.ok ? t.colors.text : t.colors.textMuted}>
            {i.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

export function StampNote() {
  return (
    <View style={styles.note}>
      <AppText variant="bodySm" color={t.palette.rust900}>
        Si creas tu cuenta después de tu primer pedido, te guardamos ese sello.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 16 },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: t.palette.rust100, borderRadius: t.radii.pill, paddingHorizontal: 12, paddingVertical: 6 },
  meterWrap: { gap: 6 },
  meter: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: t.palette.stone200 },
  card: { backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, borderRadius: t.radii.card, padding: 16, gap: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 28 },
  note: { backgroundColor: t.palette.rust100, borderRadius: t.radii.control, padding: 14 },
  alt: { borderColor: t.colors.primary },
});
