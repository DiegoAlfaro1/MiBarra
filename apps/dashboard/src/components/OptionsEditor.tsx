import {
  createOption,
  deleteOption,
  formatPriceChange,
  itemChoices,
  lempirasInput,
  MenuManagementError,
  parsePriceChange,
  updateOption,
  type ItemOption,
  type OptionKind,
} from '@mibarra/shared';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { supabase } from '../lib/supabase.ts';
import { colors, tones } from '../theme.ts';
import { Button, Field, Notice, Toggle } from './Form.tsx';

type Errors = Partial<Record<string, string>>;
type Failure = { message: string; fields: Errors };

const KINDS: { kind: OptionKind; label: string; plural: string; empty: string }[] = [
  { kind: 'size', label: 'Tamaño', plural: 'Tamaños', empty: 'Sin tamaños. El cliente pide el producto a su precio base.' },
  { kind: 'extra', label: 'Extra', plural: 'Extras', empty: 'Sin extras.' },
];

const PRICE_ERROR = 'Escribe un cambio de precio en lempiras, por ejemplo 10, -5 o 0.';

function failureOf(e: unknown): Failure {
  if (e instanceof MenuManagementError) return { message: e.message, fields: (e.fieldErrors ?? {}) as Errors };
  return { message: 'No pudimos guardar la opción. Revisa tu conexión e inténtalo de nuevo.', fields: {} };
}

/** One line per kind for the item list, e.g. `Tamaños: Pequeño, Grande +L 15`. Empty when there are none. */
export function optionSummary(options: readonly ItemOption[], itemId: string): string[] {
  const choices = itemChoices(options, itemId, { includeSoldOut: true });
  return KINDS.flatMap(({ kind, plural }) => {
    const list = kind === 'size' ? choices.sizes : choices.extras;
    if (!list.length) return [];
    const names = list.map((o) => `${o.name}${o.price_change_cents ? ` ${formatPriceChange(o.price_change_cents)}` : ''}${o.available ? '' : ' (agotado)'}`);
    return [`${plural}: ${names.join(', ')}`];
  });
}

/**
 * Sizes and extras of a saved item. Each change is saved right away (independent of the item form),
 * so the list always matches what customers see. Customers pick exactly one size (when there are
 * sizes) and any number of extras; each option adds its price change to the item price.
 */
export function OptionsEditor({ itemId, itemName, options, onChanged }: {
  itemId: string;
  itemName: string;
  options: readonly ItemOption[];
  onChanged: () => void;
}) {
  const [list, setList] = useState<ItemOption[]>(() => options.filter((o) => o.item_id === itemId));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState<OptionKind | null>(null);

  const saved = (next: ItemOption[]) => {
    setList(next);
    setEditingId(null);
    setAdding(null);
    onChanged();
  };
  const choices = itemChoices(list, itemId, { includeSoldOut: true });

  return (
    <View style={styles.box}>
      <View style={{ gap: 2 }}>
        <Text accessibilityRole="header" style={styles.title}>Tamaños y extras</Text>
        <Text style={styles.hint}>
          El cliente elige un tamaño y los extras que quiera. Cada opción suma su precio al de {itemName || 'el producto'}. Los cambios aquí se guardan al momento.
        </Text>
      </View>
      {KINDS.map(({ kind, label, plural, empty }) => {
        const rows = kind === 'size' ? choices.sizes : choices.extras;
        return (
          <View key={kind} style={{ gap: 8 }}>
            <Text style={styles.label}>{plural}</Text>
            {rows.length === 0 && adding !== kind ? <Text style={styles.hint}>{empty}</Text> : null}
            {rows.map((option) =>
              editingId === option.id ? (
                <OptionForm key={option.id} itemId={itemId} kind={kind} option={option}
                  onCancel={() => setEditingId(null)}
                  onSaved={(row) => saved(row ? list.map((o) => (o.id === row.id ? row : o)) : list.filter((o) => o.id !== option.id))} />
              ) : (
                <OptionRow key={option.id} option={option} onEdit={() => { setAdding(null); setEditingId(option.id); }}
                  onSaved={(row) => saved(list.map((o) => (o.id === row.id ? row : o)))} />
              ),
            )}
            {adding === kind ? (
              <OptionForm itemId={itemId} kind={kind} onCancel={() => setAdding(null)} onSaved={(row) => row && saved([...list, row])} />
            ) : (
              <View style={styles.row}>
                <Button kind="secondary" label={`+ ${label}`} accessibilityLabel={`Agregar ${label.toLowerCase()} a ${itemName || 'el producto'}`}
                  onPress={() => { setEditingId(null); setAdding(kind); }} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function OptionRow({ option, onEdit, onSaved }: { option: ItemOption; onEdit: () => void; onSaved: (row: ItemOption) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAvailable = async (available: boolean) => {
    setBusy(true);
    setError(null);
    try {
      onSaved(await updateOption(supabase, option.id, { kind: option.kind, name: option.name, price_change_cents: option.price_change_cents, available }));
    } catch (e) {
      setError(failureOf(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 6 }}>
      <View style={styles.optionRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.optionName, !option.available && styles.muted]}>{option.name}</Text>
          <Text style={styles.hint}>
            {formatPriceChange(option.price_change_cents)}
            {option.available ? '' : ' · Agotado'}
          </Text>
        </View>
        <Toggle label={`Disponible: ${option.name}`} value={option.available} onChange={setAvailable} disabled={busy} />
        <Button kind="ghost" label="Editar" accessibilityLabel={`Editar opción ${option.name}`} onPress={onEdit} disabled={busy} />
      </View>
      {error ? <Notice tone="danger">{error}</Notice> : null}
    </View>
  );
}

function OptionForm({ itemId, kind, option, onCancel, onSaved }: {
  itemId: string;
  kind: OptionKind;
  option?: ItemOption;
  onCancel: () => void;
  /** The saved row, or null when the option was deleted. */
  onSaved: (row: ItemOption | null) => void;
}) {
  const [name, setName] = useState(option?.name ?? '');
  const [price, setPrice] = useState(option && option.price_change_cents !== 0 ? lempirasInput(option.price_change_cents) : '');
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<Failure | null>(null);

  const run = async (action: () => Promise<ItemOption | null>) => {
    setBusy(true);
    setError(null);
    try {
      onSaved(await action());
    } catch (e) {
      setError(failureOf(e));
      setBusy(false);
    }
  };

  const save = () => {
    const price_change_cents = parsePriceChange(price);
    if (price_change_cents === null) {
      setError({ message: 'Revisa los campos marcados.', fields: { price_change_cents: PRICE_ERROR } });
      return;
    }
    const input = { kind, name, price_change_cents, available: option?.available ?? true };
    run(() => (option ? updateOption(supabase, option.id, input) : createOption(supabase, itemId, input)));
  };

  const f = error?.fields ?? {};
  const what = kind === 'size' ? 'tamaño' : 'extra';
  return (
    <View style={styles.form}>
      <View style={styles.row}>
        <Field label={kind === 'size' ? 'Nombre del tamaño' : 'Nombre del extra'} value={name} onChangeText={setName} error={f.name}
          maxLength={60} placeholder={kind === 'size' ? 'Grande 16 oz' : 'Shot extra de espresso'} autoFocus onSubmitEditing={save} />
        <Field label="Cambio de precio (L)" width={180} value={price} onChangeText={setPrice} error={f.price_change_cents}
          keyboardType="numbers-and-punctuation" placeholder="0.00" hint="Vacío o 0: sin costo. Usa - para restar." onSubmitEditing={save} />
      </View>
      {error ? <Notice tone="danger">{error.message}</Notice> : null}
      <View style={styles.actionsSpread}>
        {option ? (
          asking ? (
            <View style={styles.row}>
              <Text style={styles.confirm}>¿Borrar «{option.name}»?</Text>
              <Button kind="secondary" label="No" onPress={() => setAsking(false)} disabled={busy} />
              <Button kind="danger" label="Sí, borrar" busy={busy}
                onPress={() => run(async () => { await deleteOption(supabase, option.id); return null; })} />
            </View>
          ) : (
            <Button kind="secondary" label="Borrar" accessibilityLabel={`Borrar opción ${option.name}`} onPress={() => setAsking(true)} disabled={busy} />
          )
        ) : <View />}
        <View style={styles.row}>
          <Button kind="secondary" label="Cancelar" onPress={onCancel} disabled={busy} />
          <Button label={busy ? 'Guardando…' : option ? 'Guardar' : `Agregar ${what}`} onPress={save} busy={busy} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.surfaceMuted },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  hint: { fontSize: 13, color: colors.textMuted, flexShrink: 1 },
  muted: { color: colors.textMuted },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  actionsSpread: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted },
  optionName: { fontSize: 15, fontWeight: '600', color: colors.text },
  form: { gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: tones.accent.border, backgroundColor: colors.surface },
  confirm: { fontSize: 14, fontWeight: '600', color: colors.textDanger },
});
