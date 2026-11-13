import { Feather } from '@expo/vector-icons';
import { theme, type ToneName, type TypographyVariant } from '@mibarra/shared';
import { router } from 'expo-router';
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resolveFontFamily } from '../theme/fontNames.ts';

export const t = theme;
export type IconName = ComponentProps<typeof Feather>['name'];

export function textStyle(variant: TypographyVariant): TextStyle {
  const { fontFamily, fontWeight, ...rest } = t.typography[variant];
  // The design token weight is baked into the loaded font file name.
  return { ...rest, fontFamily: resolveFontFamily(fontFamily, fontWeight) };
}

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
}

export function AppText({ variant = 'body', color = t.colors.text, style, ...rest }: AppTextProps) {
  return <Text {...rest} style={[textStyle(variant), { color }, style]} />;
}

/** Page shell: background, status-bar safe area, optional scroll. */
export function Screen({
  children,
  scroll = true,
  footer,
  header,
  padded = true,
}: {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  header?: ReactNode;
  padded?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scroll, padded && { paddingHorizontal: t.layout.gutter }]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padded && { paddingHorizontal: t.layout.gutter }]}>{children}</View>
  );
  return (
    <View style={[styles.flex, { backgroundColor: t.colors.background, paddingTop: insets.top + 8 }]}>
      {header}
      {body}
      {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>{footer}</View> : null}
    </View>
  );
}

export function BackHeader({
  title,
  subtitle,
  backLabel = 'Volver',
  onBack,
  icon = 'chevron-left',
}: {
  title?: string;
  subtitle?: string;
  backLabel?: string;
  onBack?: () => void;
  icon?: IconName;
}) {
  return (
    <View style={styles.backHeader}>
      <IconButton icon={icon} label={backLabel} onPress={onBack ?? goBack} />
      <View style={styles.flex}>
        {title ? (
          <AppText variant="h2" accessibilityRole="header">
            {title}
          </AppText>
        ) : null}
        {subtitle ? (
          <AppText variant="caption" color={t.colors.textMuted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function IconButton({
  icon,
  label,
  onPress,
  color = t.colors.text,
  background = t.colors.surface,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  background?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.iconButton, { backgroundColor: background }]}
    >
      <Feather name={icon} size={22} color={color} />
    </Pressable>
  );
}

type ButtonVariant = 'primary' | 'dark' | 'outline' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  right,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  right?: string;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = {
    primary: { bg: t.colors.primary, fg: t.colors.onPrimary, border: t.colors.primary },
    dark: { bg: t.colors.secondary, fg: t.colors.onSecondary, border: t.colors.secondary },
    outline: { bg: t.colors.surface, fg: t.colors.text, border: t.colors.borderStrong },
    danger: { bg: t.colors.surface, fg: t.colors.textDanger, border: t.colors.textDanger },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={right ? `${label}, ${right}` : label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: disabled ? t.colors.disabled : palette.bg,
          borderColor: disabled ? t.colors.disabled : palette.border,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {icon ? <Feather name={icon} size={18} color={disabled ? t.colors.onDisabled : palette.fg} /> : null}
      <AppText variant="button" color={disabled ? t.colors.onDisabled : palette.fg}>
        {label}
      </AppText>
      {right ? (
        <AppText variant="button" color={disabled ? t.colors.onDisabled : palette.fg} style={styles.buttonRight}>
          {right}
        </AppText>
      ) : null}
    </Pressable>
  );
}

export function LinkText({ label, onPress, color = t.colors.textAccent }: { label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={onPress} style={styles.linkTarget} hitSlop={6}>
      <AppText variant="buttonSm" color={color}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: ToneName }) {
  const tone_ = t.tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: tone_.tint }]}>
      <AppText variant="badge" color={tone_.onTint}>
        {label}
      </AppText>
    </View>
  );
}

export function DemoBadge({ label = 'DEMO' }: { label?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: t.tones.demo.tint, borderColor: t.tones.demo.border, borderWidth: 1 }]}>
      <AppText variant="overline" color={t.tones.demo.onTint}>
        {label}
      </AppText>
    </View>
  );
}

/** Tinted banner with icon (alerts, notices). */
export function Banner({ tone, icon, title, children }: { tone: ToneName; icon: IconName; title?: string; children: ReactNode }) {
  const c = t.tones[tone];
  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: c.tint, borderColor: c.border }]}
    >
      <Feather name={icon} size={20} color={c.onTint} />
      <View style={styles.flex}>
        {title ? (
          <AppText variant="bodyStrong" color={c.onTint}>
            {title}
          </AppText>
        ) : null}
        <AppText variant="bodySm" color={c.onTint}>
          {children}
        </AppText>
      </View>
    </View>
  );
}

export function Avatar({ initials, size = 48 }: { initials: string; size?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.avatar, { width: size, height: size, borderRadius: t.radii.controlLg }]}
    >
      <AppText variant="h3" color={t.colors.onPlaceholder}>
        {initials}
      </AppText>
    </View>
  );
}

export function Chip({ label, selected, onPress, sub, disabled, minHeight = 44 }: { label: string; selected: boolean; onPress: () => void; sub?: string; disabled?: boolean; minHeight?: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!disabled }}
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.chip,
        { minHeight },
        selected
          ? { backgroundColor: t.colors.secondary, borderColor: t.colors.secondary }
          : { backgroundColor: disabled ? t.colors.surfaceMuted : t.colors.surface, borderColor: t.colors.border },
        disabled && { borderStyle: 'dashed' },
      ]}
    >
      <AppText
        variant="buttonSm"
        color={selected ? t.colors.onSecondary : disabled ? t.colors.textSubtle : t.colors.text}
        style={disabled ? { textDecorationLine: 'line-through' } : undefined}
      >
        {label}
      </AppText>
      {sub ? (
        <AppText variant="caption" color={selected ? t.colors.textInverseMuted : t.colors.textMuted}>
          {sub}
        </AppText>
      ) : null}
    </Pressable>
  );
}

export function Stepper({ value, onChange, min = 1, max = 9 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quitar uno"
        disabled={value <= min}
        onPress={() => onChange(value - 1)}
        style={styles.stepperBtn}
      >
        <AppText variant="h3" color={value <= min ? t.colors.textSubtle : t.colors.text}>
          −
        </AppText>
      </Pressable>
      <AppText variant="number" accessibilityLiveRegion="polite" style={styles.stepperValue}>
        {value}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Agregar uno"
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
        style={styles.stepperBtn}
      >
        <AppText variant="h3" color={value >= max ? t.colors.textSubtle : t.colors.text}>
          +
        </AppText>
      </Pressable>
    </View>
  );
}

export function Field({
  label,
  error,
  prefix,
  ...input
}: { label: string; error?: string; prefix?: string } & ComponentProps<typeof TextInput>) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      <View
        style={[
          styles.input,
          { borderColor: error ? t.colors.textDanger : focused ? t.colors.focus : t.colors.borderStrong },
        ]}
      >
        {prefix ? (
          <AppText variant="bodyStrong" color={t.colors.textMuted}>
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          {...input}
          accessibilityLabel={label}
          placeholderTextColor={t.colors.textSubtle}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          style={[textStyle('body'), styles.inputText, input.multiline && styles.inputMultiline]}
        />
      </View>
      {error ? (
        <AppText variant="caption" color={t.colors.textDanger} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

export function StampDots({ filled, total, filledColor = t.colors.primary, emptyColor = t.palette.stone700 }: { filled: number; total: number; filledColor?: string; emptyColor?: string }) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${filled} de ${total} sellos`}
      style={styles.dots}
    >
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: i < filled ? filledColor : emptyColor }]} />
      ))}
    </View>
  );
}

/** Decorative QR placeholder, same pattern as the design. Not a scannable code. */
export function QrPlaceholder({ seed = 1, size = 168, label }: { seed?: number; size?: number; label: string }) {
  const N = 21;
  const cell = size / N;
  const finder = (r: number, c: number) => {
    for (const [r0, c0] of [[0, 0], [0, N - 7], [N - 7, 0]] as const) {
      const y = r - r0;
      const x = c - c0;
      if (y >= 0 && y < 7 && x >= 0 && x < 7) {
        return y === 0 || y === 6 || x === 0 || x === 6 || (y >= 2 && y <= 4 && x >= 2 && x <= 4);
      }
      if (y >= -1 && y <= 7 && x >= -1 && x <= 7) return false;
    }
    return null;
  };
  const cells = [];
  for (let r = 0; r < N; r += 1) {
    for (let c = 0; c < N; c += 1) {
      const f = finder(r, c);
      const on = f ?? (r * (5 + seed * 2) + c * (13 - seed * 2) + r * c * (3 + seed * 2)) % 5 < 2;
      if (on) {
        cells.push(
          <View
            key={`${r}-${c}`}
            style={{ position: 'absolute', left: c * cell, top: r * cell, width: cell, height: cell, backgroundColor: t.colors.text }}
          />,
        );
      }
    }
  }
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width: size, height: size }}>
      {cells}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: string; right?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <AppText variant="h2" accessibilityRole="header">
        {children}
      </AppText>
      {right ? (
        <AppText variant="caption" color={t.colors.textMuted}>
          {right}
        </AppText>
      ) : null}
    </View>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Feather name={icon} size={32} color={t.colors.onPlaceholder} />
      </View>
      <AppText variant="h2" style={styles.center}>
        {title}
      </AppText>
      <AppText variant="body" color={t.colors.textMuted} style={styles.center}>
        {body}
      </AppText>
      {action}
    </View>
  );
}

export const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  scroll: { paddingTop: 8, paddingBottom: 24, gap: 16 },
  footer: {
    paddingHorizontal: t.layout.gutter,
    paddingTop: 12,
    gap: 10,
    backgroundColor: t.colors.surface,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  backHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: t.layout.gutter, paddingBottom: 12 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.colors.border },
  button: { minHeight: t.controlHeights.xl, borderRadius: t.radii.controlLg, borderWidth: 1, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonRight: { marginLeft: 'auto' },
  linkTarget: { minHeight: t.minTouchTarget, justifyContent: 'center' },
  card: { backgroundColor: t.colors.surface, borderRadius: t.radii.card, borderWidth: 1, borderColor: t.colors.border, padding: 16 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: t.radii.sm, alignSelf: 'flex-start' },
  banner: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: t.radii.cardSm, borderWidth: 1 },
  avatar: { backgroundColor: t.colors.placeholder, alignItems: 'center', justifyContent: 'center' },
  chip: { borderRadius: t.radii.pill, borderWidth: 1.5, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.colors.surface, borderRadius: t.radii.pill, borderWidth: 1, borderColor: t.colors.border },
  stepperBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { minWidth: 24, textAlign: 'center' },
  field: { gap: 6 },
  input: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: t.controlHeights.lg, paddingHorizontal: 14, backgroundColor: t.colors.surface, borderWidth: 1.5, borderRadius: t.radii.controlLg },
  inputText: { flex: 1, color: t.colors.text, minHeight: t.controlHeights.lg },
  inputMultiline: { minHeight: 64, paddingVertical: 10, textAlignVertical: 'top' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { flex: 1, height: 10, borderRadius: 5 },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 16 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: t.colors.placeholder, alignItems: 'center', justifyContent: 'center' },
});
