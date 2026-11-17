import {
  can,
  getShop,
  shopProfileForm,
  ShopProfileError,
  updateShopProfile,
  WEEKDAY_LABELS,
  WEEKDAYS,
  type ShopProfileErrors,
  type ShopProfileInput,
  type Weekday,
} from '@mibarra/shared';
import { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button, Card, Field, formStyles, Notice, StateView, Toggle } from '../src/components/Form.tsx';
import { supabase } from '../src/lib/supabase.ts';
import { useAuth } from '../src/state/AuthState.tsx';
import { bodyFont, colors, typography } from '../src/theme.ts';

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready' };

const DEFAULT_DAY = { open: '07:00', close: '19:00' };

/** Owner screen: the shop's general information (name, logo, address, phone and opening hours). */
export default function ShopProfile() {
  const { access } = useAuth();
  const shopId = access?.shopId ?? null;
  const canEdit = can(access?.role, 'editShopSettings');
  const narrow = useWindowDimensions().width < 640;

  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [form, setForm] = useState<ShopProfileInput | null>(null);
  const [errors, setErrors] = useState<ShopProfileErrors>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'danger' | 'success'; text: string } | null>(null);
  const [logoBroken, setLogoBroken] = useState(false);

  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    if (!shopId) return;
    let active = true;
    getShop(supabase, shopId)
      .then((shop) => {
        if (!active) return;
        setForm(shopProfileForm(shop));
        setLoad({ status: 'ready' });
      })
      .catch((e: unknown) => active && setLoad({ status: 'error', message: e instanceof Error ? e.message : 'No pudimos cargar la tienda.' }));
    return () => {
      active = false;
    };
  }, [shopId, reloads]);

  const fetchShop = useCallback(() => {
    setLoad({ status: 'loading' });
    setReloads((n) => n + 1);
  }, []);

  const set = <K extends keyof ShopProfileInput>(key: K, value: ShopProfileInput[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setMessage(null);
  };
  const setDay = (day: Weekday, value: { open: string; close: string } | null) => {
    setForm((f) => (f ? { ...f, hours: { ...f.hours, [day]: value } } : f));
    setMessage(null);
  };

  const save = async () => {
    if (!form || !shopId) return;
    setSaving(true);
    setMessage(null);
    try {
      const shop = await updateShopProfile(supabase, shopId, form);
      setForm(shopProfileForm(shop));
      setErrors({});
      setMessage({ tone: 'success', text: 'Cambios guardados. Los clientes ya ven los datos nuevos.' });
    } catch (e) {
      const err = e instanceof ShopProfileError ? e : null;
      setErrors(err?.fieldErrors ?? {});
      setMessage({ tone: 'danger', text: err?.message ?? 'No pudimos guardar los cambios. Inténtalo de nuevo.' });
    } finally {
      setSaving(false);
    }
  };

  const page = [formStyles.page, narrow && formStyles.pageNarrow];

  return (
    <View style={page}>
      <View style={formStyles.head}>
        <View style={{ flexShrink: 1, gap: 4 }}>
          <Text accessibilityRole="header" style={typography.h1}>Tu tienda</Text>
          <Text style={formStyles.sub}>Así te encuentran los clientes: nombre, logo, dirección, teléfono y horario.</Text>
        </View>
      </View>

      {!shopId ? (
        <StateView kind="empty" message="Esta cuenta no tiene una tienda asignada todavía." />
      ) : load.status === 'loading' ? (
        <StateView kind="loading" message="Cargando los datos de la tienda…" />
      ) : load.status === 'error' || !form ? (
        <StateView kind="error" message={load.status === 'error' ? load.message : 'No pudimos cargar la tienda.'} onRetry={fetchShop} />
      ) : (
        <>
          {!canEdit ? <Notice tone="neutral">Solo la persona dueña de la tienda puede cambiar estos datos.</Notice> : null}

          <Card title="Datos generales">
            <View style={styles.fields}>
              <Field label="Nombre de la tienda" value={form.name} onChangeText={(v) => set('name', v)} error={errors.name} editable={canEdit} maxLength={120} placeholder="Café Lempa" />
              <Field
                label="Teléfono"
                value={form.phone}
                onChangeText={(v) => set('phone', v)}
                error={errors.phone}
                editable={canEdit}
                keyboardType="phone-pad"
                autoComplete="tel"
                placeholder="2222-3333"
                hint="8 dígitos. Agrega +504 o el código de otro país si quieres."
              />
            </View>
            <Field
              label="Dirección"
              value={form.address}
              onChangeText={(v) => set('address', v)}
              error={errors.address}
              editable={canEdit}
              multiline
              maxLength={240}
              placeholder="Col. Palmira, Tegucigalpa"
            />
          </Card>

          <Card title="Logo" subtitle="Pega el enlace de una imagen cuadrada (PNG o JPG).">
            <View style={[styles.logoRow, narrow && { flexDirection: 'column', alignItems: 'stretch' }]}>
              <View style={styles.logoPreview} accessibilityLabel={form.logo_url && !logoBroken ? 'Vista previa del logo' : 'Sin logo'}>
                {form.logo_url && !logoBroken ? (
                  <Image source={{ uri: form.logo_url }} style={styles.logoImage} onError={() => setLogoBroken(true)} accessibilityIgnoresInvertColors />
                ) : (
                  <Text style={styles.logoInitial}>{form.name.trim().charAt(0).toUpperCase() || '☕'}</Text>
                )}
              </View>
              <Field
                label="Enlace del logo"
                value={form.logo_url}
                onChangeText={(v) => {
                  setLogoBroken(false);
                  set('logo_url', v);
                }}
                error={errors.logo_url ?? (logoBroken ? 'No pudimos abrir esta imagen. Revisa el enlace.' : undefined)}
                editable={canEdit}
                keyboardType="url"
                autoCapitalize="none"
                placeholder="https://…/logo.png"
              />
            </View>
          </Card>

          <Card title="Horario" subtitle="Hora de 24 horas, por ejemplo 07:00 a 19:00. Apaga los días que cierras.">
            {WEEKDAYS.map((day) => {
              const value = form.hours[day];
              const dayError = errors.hours?.[day];
              return (
                <View key={day} style={styles.day}>
                  <View style={styles.dayHead}>
                    <Text style={styles.dayName}>{WEEKDAY_LABELS[day]}</Text>
                    <Text style={[styles.dayState, { color: value ? colors.textSuccess : colors.textMuted }]}>{value ? 'Abierto' : 'Cerrado'}</Text>
                    <Toggle label={`Abierto el ${WEEKDAY_LABELS[day].toLowerCase()}`} value={!!value} onChange={(open) => setDay(day, open ? DEFAULT_DAY : null)} disabled={!canEdit} />
                  </View>
                  {value ? (
                    <View style={styles.times}>
                      <Field label="Abre" width={120} value={value.open} onChangeText={(v) => setDay(day, { ...value, open: v })} editable={canEdit} maxLength={5} placeholder="07:00" accessibilityLabel={`${WEEKDAY_LABELS[day]}: abre`} />
                      <Field label="Cierra" width={120} value={value.close} onChangeText={(v) => setDay(day, { ...value, close: v })} editable={canEdit} maxLength={5} placeholder="19:00" accessibilityLabel={`${WEEKDAY_LABELS[day]}: cierra`} />
                    </View>
                  ) : null}
                  {dayError ? <Text style={styles.dayError} role="alert">{dayError}</Text> : null}
                </View>
              );
            })}
          </Card>

          {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
          {canEdit ? (
            <View style={styles.actions}>
              <Button label={saving ? 'Guardando…' : 'Guardar cambios'} onPress={save} busy={saving} />
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  logoPreview: { width: 88, height: 88, borderRadius: 20, backgroundColor: colors.placeholder, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', alignSelf: 'flex-start' },
  logoImage: { width: 88, height: 88 },
  logoInitial: { fontFamily: bodyFont, fontSize: 36, fontWeight: '700', color: colors.onPlaceholder },
  day: { gap: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayName: { flex: 1, fontFamily: bodyFont, fontSize: 16, fontWeight: '600', color: colors.text },
  dayState: { fontFamily: bodyFont, fontSize: 14, fontWeight: '700' },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  dayError: { fontFamily: bodyFont, fontSize: 13, fontWeight: '600', color: colors.textDanger },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
});
