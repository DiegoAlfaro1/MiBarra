import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Field, Screen, t } from '../src/components/ui';
import { validateGuest, type FieldErrors } from '../src/lib/validation';
import { AccessTop } from '../src/screens/accessParts';
import { useAppState } from '../src/state/AppState';

const INCLUDED = [
  { ok: true, label: 'Ver menús, pedir y pagar' },
  { ok: true, label: 'Seguir tu pedido en vivo' },
  { ok: false, label: 'Juntar sellos y recompensas' },
  { ok: false, label: 'Guardar historial y pedir de nuevo' },
];

/** Guest screen (ACC-02, NOT-03). UI mockup: name required, phone optional; no anonymous session is created. */
export default function Guest() {
  const { signIn } = useAppState();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const submit = () => {
    const found = validateGuest({ name, phone });
    setErrors(found);
    if (Object.keys(found).length === 0) {
      signIn({ name: name.trim() });
      router.replace('/');
    }
  };

  return (
    <Screen header={<View style={styles.pad}><AccessTop skip={false} /></View>}>
      <View style={styles.gap}>
        <AppText variant="h1" accessibilityRole="header">
          Pide sin crear cuenta
        </AppText>
        <AppText variant="body" color={t.colors.textMuted}>
          Solo dinos cómo llamarte en la barra. Puedes crear tu cuenta cuando quieras.
        </AppText>
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
        <View style={styles.card}>
          {INCLUDED.map((i) => (
            <View key={i.label} style={styles.item} accessible accessibilityLabel={`${i.ok ? 'Incluido' : 'No incluido'}: ${i.label}`}>
              <Feather name={i.ok ? 'check' : 'x'} size={18} color={i.ok ? '#15803D' : t.colors.textSubtle} />
              <AppText variant="bodySm" color={i.ok ? t.colors.text : t.colors.textMuted}>
                {i.label}
              </AppText>
            </View>
          ))}
        </View>
        <View style={styles.note}>
          <AppText variant="bodySm" color={t.palette.rust900}>
            Si creas tu cuenta después de tu primer pedido, te guardamos ese sello.
          </AppText>
        </View>
        <Button label="Empezar a pedir" variant="dark" onPress={submit} />
        <Button label="Mejor crear cuenta" variant="outline" onPress={() => router.replace('/signup')} style={styles.alt} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: t.layout.gutter },
  gap: { gap: 16, paddingBottom: 24 },
  card: { backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, borderRadius: t.radii.card, padding: 16, gap: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 28 },
  note: { backgroundColor: t.palette.rust100, borderRadius: t.radii.control, padding: 14 },
  alt: { borderColor: t.colors.primary },
});
