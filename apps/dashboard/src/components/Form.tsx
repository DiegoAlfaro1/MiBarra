import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { bodyFont, colors, tones, typography } from '../theme.ts';

/** Building blocks shared by the shop and menu management screens. */

interface FieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  hint?: string;
  error?: string;
  /** Fixed width for short fields such as times; otherwise the field fills the row. */
  width?: number;
}

export function Field({ label, hint, error, width, editable = true, ...input }: FieldProps) {
  return (
    <View style={[styles.field, width ? { width } : { flexGrow: 1, flexBasis: 240 }]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        aria-invalid={error ? true : undefined}
        placeholderTextColor={colors.textSubtle}
        editable={editable}
        style={[styles.input, !editable && styles.inputDisabled, error && styles.inputError]}
        {...input}
      />
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite" role="alert">{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

type ButtonKind = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  label,
  onPress,
  kind = 'primary',
  busy = false,
  disabled = false,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
  busy?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const off = disabled || busy;
  const look = BUTTONS[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [styles.button, look.box, off && styles.buttonOff, pressed && { opacity: 0.85 }]}
    >
      {busy ? <ActivityIndicator color={look.text.color} /> : null}
      <Text style={[styles.buttonText, look.text]}>{label}</Text>
    </Pressable>
  );
}

/** Open/closed style switch with a visible state label. */
export function Toggle({ label, value, onChange, disabled }: { label: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={[styles.track, { backgroundColor: value ? tones.success.solid : colors.disabled, justifyContent: value ? 'flex-end' : 'flex-start' }, disabled && styles.buttonOff]}
    >
      <View style={styles.knob} />
    </Pressable>
  );
}

export function Notice({ tone, children }: { tone: 'danger' | 'success' | 'neutral'; children: ReactNode }) {
  const t = tones[tone];
  return (
    <View style={[styles.notice, { backgroundColor: t.tint, borderColor: t.border }]} accessibilityLiveRegion="polite" role={tone === 'danger' ? 'alert' : 'status'}>
      <Text style={[typography.bodySm, { color: t.onTint }]}>{children}</Text>
    </View>
  );
}

/** Full-card loading, error (with retry) or empty state. */
export function StateView({ kind, message, onRetry }: { kind: 'loading' | 'error' | 'empty'; message: string; onRetry?: () => void }) {
  return (
    <View style={styles.state}>
      {kind === 'loading' ? <ActivityIndicator color={colors.primary} accessibilityLabel={message} /> : null}
      <Text style={[typography.body, { color: kind === 'error' ? colors.textDanger : colors.textMuted, textAlign: 'center' }]}>{message}</Text>
      {onRetry ? <Button label="Reintentar" kind="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

export function Card({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={{ flexShrink: 1, gap: 2 }}>
          <Text accessibilityRole="header" style={styles.cardTitle}>{title}</Text>
          {subtitle ? <Text style={styles.hint}>{subtitle}</Text> : null}
        </View>
        {actions ? <View style={styles.row}>{actions}</View> : null}
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

const BUTTONS: Record<ButtonKind, { box: object; text: { color: string } }> = {
  primary: { box: { backgroundColor: colors.primary }, text: { color: colors.onPrimary } },
  secondary: { box: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong }, text: { color: colors.text } },
  danger: { box: { backgroundColor: tones.danger.solid }, text: { color: tones.danger.onSolid } },
  ghost: { box: { backgroundColor: 'transparent' }, text: { color: colors.textAccent } },
};

export const formStyles = StyleSheet.create({
  page: { width: '100%', maxWidth: 1000, alignSelf: 'center', padding: 24, gap: 20 },
  pageNarrow: { padding: 12, gap: 14 },
  head: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  sub: { fontFamily: bodyFont, fontSize: 15, color: colors.textMuted },
});

const styles = StyleSheet.create({
  field: { gap: 6, minWidth: 0 },
  label: { fontFamily: bodyFont, fontSize: 14, fontWeight: '600', color: colors.text },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, paddingHorizontal: 14, fontFamily: bodyFont, fontSize: 16, color: colors.text },
  inputDisabled: { backgroundColor: colors.surfaceMuted, color: colors.textMuted },
  inputError: { borderColor: tones.danger.solid, borderWidth: 2 },
  error: { fontFamily: bodyFont, fontSize: 13, fontWeight: '600', color: colors.textDanger },
  hint: { fontFamily: bodyFont, fontSize: 13, color: colors.textMuted },
  button: { minHeight: 48, paddingHorizontal: 18, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonOff: { opacity: 0.5 },
  buttonText: { fontFamily: bodyFont, fontSize: 15, fontWeight: '700' },
  track: { width: 72, height: 44, borderRadius: 22, padding: 4, flexDirection: 'row' },
  knob: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF' },
  notice: { borderWidth: 1, borderRadius: 12, padding: 14 },
  state: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 32, alignItems: 'center', gap: 14 },
  card: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  cardHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#FAFAF9', borderBottomWidth: 1, borderBottomColor: colors.border },
  cardTitle: { fontFamily: bodyFont, fontSize: 16, fontWeight: '700', color: colors.text },
  cardBody: { padding: 20, gap: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
