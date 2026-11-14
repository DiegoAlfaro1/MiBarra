import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Banner, Button, LinkText, Screen, t } from '../src/components/ui';
import { validateAuth, type FieldErrors } from '../src/lib/validation';
import { AccessTop, ContactField, MethodTabs, PasswordField, type Method } from '../src/screens/accessParts';
import { useAppState } from '../src/state/AppState';

/** Sign-in screen (ACC-03). UI mockup: any valid input signs in as a demo user; no backend. */
export default function SignIn() {
  const { signIn } = useAppState();
  const [method, setMethod] = useState<Method>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failed, setFailed] = useState(false);

  const submit = () => {
    const found = validateAuth({ signup: false, method, name: '', phone, email, password });
    setErrors(found);
    setFailed(Object.keys(found).length > 0);
    if (Object.keys(found).length === 0) {
      signIn({ name: 'Diego' });
      router.replace('/');
    }
  };

  return (
    <Screen header={<View style={styles.pad}><AccessTop /></View>}>
      <View style={styles.gap}>
        <AppText variant="h1" accessibilityRole="header">
          Hola de nuevo
        </AppText>
        <AppText variant="body" color={t.colors.textMuted}>
          Inicia sesión para ver tus sellos y pedidos.
        </AppText>
        <MethodTabs value={method} onChange={(m) => { setMethod(m); setErrors({}); setFailed(false); }} />
        {failed ? (
          <Banner tone="danger" icon="alert-circle">
            {method === 'phone' ? 'Revisa tu número y contraseña. Intenta de nuevo.' : 'Revisa tu correo y contraseña. Intenta de nuevo.'}
          </Banner>
        ) : null}
        <ContactField method={method} phone={phone} email={email} onPhone={setPhone} onEmail={setEmail} errors={errors} />
        <PasswordField value={password} onChange={setPassword} error={errors.password} autoComplete="current-password" show={show} onToggle={() => setShow((v) => !v)} />
        <LinkText label="¿Olvidaste tu contraseña?" onPress={() => undefined} />
        <Button label="Iniciar sesión" onPress={submit} />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: t.layout.gutter },
  gap: { gap: 16, paddingBottom: 24 },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
});
