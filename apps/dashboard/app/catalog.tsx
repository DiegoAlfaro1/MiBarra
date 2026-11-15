import {
  can,
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  lempirasInput,
  listMenu,
  MenuManagementError,
  parseLempiras,
  updateCategory,
  updateItem,
  uploadMenuPhoto,
  type MenuCategory,
  type MenuData,
  type MenuItem,
} from '@mibarra/shared';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button, Card, Field, formStyles, Notice, StateView, Toggle } from '../src/components/Form.tsx';
import { newUploadId, pickImage } from '../src/lib/pickImage.ts';
import { supabase } from '../src/lib/supabase.ts';
import { formatLempiras } from '../src/logic/dashboard.ts';
import { useAuth } from '../src/state/AuthState.tsx';
import { colors, tones, typography } from '../src/theme.ts';

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; menu: MenuData };
type Editing = { kind: 'category'; category?: MenuCategory } | { kind: 'item'; categoryId: string; item?: MenuItem } | null;
type Errors = Partial<Record<string, string>>;

function errorOf(e: unknown): { message: string; fields: Errors } {
  if (e instanceof MenuManagementError) return { message: e.message, fields: (e.fieldErrors ?? {}) as Errors };
  return { message: 'No pudimos guardar los cambios. Revisa tu conexión e inténtalo de nuevo.', fields: {} };
}

/** Owner/manager screen: build the menu with categories and items (name, description, photo, price in lempiras). */
export default function MenuCatalog() {
  const { access } = useAuth();
  const shopId = access?.shopId ?? null;
  const canEdit = can(access?.role, 'editMenu');
  const narrow = useWindowDimensions().width < 640;

  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [editing, setEditing] = useState<Editing>(null);
  const [notice, setNotice] = useState<{ tone: 'danger' | 'success'; text: string } | null>(null);

  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    if (!shopId) return;
    let active = true;
    listMenu(supabase, shopId)
      .then((menu) => active && setLoad({ status: 'ready', menu }))
      .catch((e: unknown) => active && setLoad({ status: 'error', message: e instanceof Error ? e.message : 'No pudimos cargar el menú.' }));
    return () => {
      active = false;
    };
  }, [shopId, reloads]);

  const fetchMenu = useCallback(() => {
    setLoad({ status: 'loading' });
    setReloads((n) => n + 1);
  }, []);

  const done = (text: string) => {
    setEditing(null);
    setNotice({ tone: 'success', text });
    setReloads((n) => n + 1); // refresh in the background; the list stays on screen
  };

  const menu = load.status === 'ready' ? load.menu : null;
  const nextSort = menu ? Math.max(0, ...menu.categories.map((c) => c.sort_order)) + 1 : 1;

  return (
    <View style={[formStyles.page, narrow && formStyles.pageNarrow]}>
      <View style={formStyles.head}>
        <View style={{ flexShrink: 1, gap: 4 }}>
          <Text accessibilityRole="header" style={typography.h1}>Editar menú</Text>
          <Text style={formStyles.sub}>Organiza tus productos en categorías. Los precios son en lempiras.</Text>
        </View>
        {canEdit && menu && editing?.kind !== 'category' ? (
          <Button label="+ Nueva categoría" onPress={() => { setNotice(null); setEditing({ kind: 'category' }); }} />
        ) : null}
      </View>

      {!canEdit ? <Notice tone="neutral">Solo encargados y dueños pueden editar el menú. Para marcar productos agotados, usa la pestaña Menú.</Notice> : null}
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      {!shopId ? (
        <StateView kind="empty" message="Esta cuenta no tiene una tienda asignada todavía." />
      ) : load.status === 'loading' ? (
        <StateView kind="loading" message="Cargando el menú…" />
      ) : load.status === 'error' ? (
        <StateView kind="error" message={load.message} onRetry={fetchMenu} />
      ) : (
        <>
          {editing?.kind === 'category' && !editing.category ? (
            <CategoryForm shopId={shopId} sortOrder={nextSort} onCancel={() => setEditing(null)} onSaved={() => done('Categoría creada.')} />
          ) : null}

          {load.menu.categories.length === 0 && editing?.kind !== 'category' ? (
            <StateView kind="empty" message="Todavía no hay categorías. Crea la primera (por ejemplo «Bebidas calientes») para empezar tu menú." />
          ) : null}

          {load.menu.categories.map((category) => {
            const items = load.menu.items.filter((i) => i.category_id === category.id);
            if (editing?.kind === 'category' && editing.category?.id === category.id) {
              return (
                <CategoryForm key={category.id} shopId={shopId} category={category} sortOrder={category.sort_order} itemCount={items.length}
                  onCancel={() => setEditing(null)} onSaved={(deleted) => done(deleted ? 'Categoría borrada.' : 'Categoría guardada.')} />
              );
            }
            return (
              <Card
                key={category.id}
                title={category.name}
                subtitle={items.length === 1 ? '1 producto' : `${items.length} productos`}
                actions={canEdit ? (
                  <>
                    <Button kind="ghost" label="Editar" accessibilityLabel={`Editar categoría ${category.name}`} onPress={() => { setNotice(null); setEditing({ kind: 'category', category }); }} />
                    <Button kind="secondary" label="+ Producto" accessibilityLabel={`Agregar producto a ${category.name}`} onPress={() => { setNotice(null); setEditing({ kind: 'item', categoryId: category.id }); }} />
                  </>
                ) : undefined}
              >
                {editing?.kind === 'item' && !editing.item && editing.categoryId === category.id ? (
                  <ItemForm shopId={shopId} categories={load.menu.categories} categoryId={category.id} onCancel={() => setEditing(null)} onSaved={() => done('Producto creado.')} />
                ) : null}
                {items.length === 0 && !(editing?.kind === 'item' && editing.categoryId === category.id) ? (
                  <Text style={styles.empty}>Esta categoría no tiene productos todavía.</Text>
                ) : null}
                {items.map((item) =>
                  editing?.kind === 'item' && editing.item?.id === item.id ? (
                    <ItemForm key={item.id} shopId={shopId} categories={load.menu.categories} categoryId={item.category_id} item={item}
                      onCancel={() => setEditing(null)} onSaved={(deleted) => done(deleted ? 'Producto borrado.' : 'Producto guardado.')} />
                  ) : (
                    <ItemRow key={item.id} item={item} canEdit={canEdit} onEdit={() => { setNotice(null); setEditing({ kind: 'item', categoryId: item.category_id, item }); }} />
                  ),
                )}
              </Card>
            );
          })}
        </>
      )}
    </View>
  );
}

function Photo({ uri, size, label }: { uri: string | null; size: number; label: string }) {
  // Remember which link failed, so typing a new link tries again.
  const [brokenUri, setBrokenUri] = useState<string | null>(null);
  const broken = uri !== null && brokenUri === uri;
  return (
    <View style={[styles.photo, { width: size, height: size }]} accessibilityLabel={uri && !broken ? `Foto de ${label}` : `${label}, sin foto`}>
      {uri && !broken ? (
        <Image source={{ uri }} style={{ width: size, height: size }} onError={() => setBrokenUri(uri)} accessibilityIgnoresInvertColors />
      ) : (
        <Text style={{ fontSize: size * 0.4 }} accessibilityElementsHidden>☕</Text>
      )}
    </View>
  );
}

function ItemRow({ item, canEdit, onEdit }: { item: MenuItem; canEdit: boolean; onEdit: () => void }) {
  return (
    <View style={styles.itemRow}>
      <Photo uri={item.photo_url} size={56} label={item.name} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={[styles.itemName, !item.available && styles.itemOut]}>{item.name}</Text>
        {item.description ? <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text> : null}
        <Text style={styles.itemPrice}>
          {formatLempiras(item.price_cents / 100)}
          {item.available ? '' : ' · Agotado'}
        </Text>
      </View>
      {canEdit ? <Button kind="ghost" label="Editar" accessibilityLabel={`Editar ${item.name}`} onPress={onEdit} /> : null}
    </View>
  );
}

/** Two taps to delete: the first asks, the second confirms. */
function DeleteButton({ label, onConfirm, busy }: { label: string; onConfirm: () => void; busy: boolean }) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <Button kind="secondary" label="Borrar" accessibilityLabel={`Borrar ${label}`} onPress={() => setAsking(true)} disabled={busy} />;
  return (
    <View style={styles.actions}>
      <Text style={styles.confirm}>¿Borrar «{label}»?</Text>
      <Button kind="secondary" label="No" onPress={() => setAsking(false)} disabled={busy} />
      <Button kind="danger" label="Sí, borrar" onPress={onConfirm} busy={busy} />
    </View>
  );
}

function CategoryForm({ shopId, category, sortOrder, itemCount = 0, onCancel, onSaved }: {
  shopId: string;
  category?: MenuCategory;
  sortOrder: number;
  itemCount?: number;
  onCancel: () => void;
  onSaved: (deleted?: boolean) => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; fields: Errors } | null>(null);

  const run = async (action: () => Promise<unknown>, deleted = false) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      onSaved(deleted);
    } catch (e) {
      setError(errorOf(e));
      setBusy(false);
    }
  };

  const save = () =>
    run(() => (category ? updateCategory(supabase, category.id, { name, sort_order: sortOrder }) : createCategory(supabase, shopId, { name, sort_order: sortOrder })));

  return (
    <Card title={category ? 'Editar categoría' : 'Nueva categoría'}>
      <Field label="Nombre de la categoría" value={name} onChangeText={setName} error={error?.fields.name} maxLength={60} placeholder="Bebidas calientes" autoFocus onSubmitEditing={save} />
      {error ? <Notice tone="danger">{error.message}</Notice> : null}
      <View style={styles.formActions}>
        {category ? (
          itemCount > 0 ? (
            <Text style={styles.hint}>Para borrar esta categoría, primero mueve o borra sus productos.</Text>
          ) : (
            <DeleteButton label={category.name} busy={busy} onConfirm={() => run(() => deleteCategory(supabase, category.id), true)} />
          )
        ) : <View />}
        <View style={styles.actions}>
          <Button kind="secondary" label="Cancelar" onPress={onCancel} disabled={busy} />
          <Button label={busy ? 'Guardando…' : 'Guardar'} onPress={save} busy={busy} />
        </View>
      </View>
    </Card>
  );
}

function ItemForm({ shopId, categories, categoryId, item, onCancel, onSaved }: {
  shopId: string;
  categories: MenuCategory[];
  categoryId: string;
  item?: MenuItem;
  onCancel: () => void;
  onSaved: (deleted?: boolean) => void;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [price, setPrice] = useState(item ? lempirasInput(item.price_cents) : '');
  const [photo, setPhoto] = useState(item?.photo_url ?? '');
  const [category, setCategory] = useState(categoryId);
  const [available, setAvailable] = useState(item?.available ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; fields: Errors } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>, deleted = false) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      onSaved(deleted);
    } catch (e) {
      setError(errorOf(e));
      setBusy(false);
    }
  };

  const upload = async () => {
    setPhotoError(null);
    const file = await pickImage();
    if (!file) return;
    setUploading(true);
    try {
      setPhoto(await uploadMenuPhoto(supabase, shopId, file, newUploadId()));
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : 'No pudimos subir la foto. Inténtalo de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const save = () => {
    const price_cents = parseLempiras(price);
    if (price_cents === null) {
      setError({ message: 'Revisa los campos marcados.', fields: { price_cents: 'Escribe un precio en lempiras, por ejemplo 55 o 55.50.' } });
      return;
    }
    const input = { category_id: category, name, description, price_cents, photo_url: photo, available };
    run(() => (item ? updateItem(supabase, item.id, input) : createItem(supabase, shopId, input)));
  };

  const f = error?.fields ?? {};
  return (
    <View style={styles.itemForm}>
      <Text accessibilityRole="header" style={styles.formTitle}>{item ? `Editar ${item.name}` : 'Nuevo producto'}</Text>
      <View style={styles.fields}>
        <Field label="Nombre" value={name} onChangeText={setName} error={f.name} maxLength={60} placeholder="Latte" autoFocus />
        <Field label="Precio (L)" width={160} value={price} onChangeText={setPrice} error={f.price_cents} keyboardType="decimal-pad" placeholder="55.00" hint="En lempiras." />
      </View>
      <Field label="Descripción" value={description} onChangeText={setDescription} error={f.description} multiline maxLength={280} placeholder="Espresso con leche vaporizada" hint={`${description.length}/280`} />
      <View style={[styles.fields, { alignItems: 'flex-end' }]}>
        <Photo uri={photo.trim() || null} size={72} label={name || 'el producto'} />
        <Field label="Enlace de la foto" value={photo} onChangeText={setPhoto} error={photoError ?? f.photo_url} keyboardType="url" autoCapitalize="none" placeholder="https://…/latte.jpg" hint="Opcional. Sube una imagen JPG, PNG o WebP (máx. 5 MB) o pega un enlace. Sin foto se muestra una taza." />
        <Button kind="secondary" label={uploading ? 'Subiendo…' : 'Subir foto'} accessibilityLabel="Subir foto del producto" onPress={upload} busy={uploading} disabled={busy} />
      </View>
      {categories.length > 1 ? (
        <View style={{ gap: 6 }}>
          <Text style={styles.label}>Categoría</Text>
          <View style={styles.actions} accessibilityRole="radiogroup">
            {categories.map((c) => (
              <Pressable key={c.id} accessibilityRole="radio" accessibilityState={{ checked: c.id === category }} onPress={() => setCategory(c.id)}
                style={[styles.chip, c.id === category && styles.chipOn]}>
                <Text style={[styles.chipText, c.id === category && { color: colors.onSecondary }]}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
          {f.category_id ? <Text style={styles.error}>{f.category_id}</Text> : null}
        </View>
      ) : null}
      <View style={styles.availRow}>
        <Text style={[styles.label, { flex: 1 }]}>{available ? 'Disponible' : 'Agotado'}</Text>
        <Toggle label={`Disponible: ${name || 'producto'}`} value={available} onChange={setAvailable} />
      </View>
      {error ? <Notice tone="danger">{error.message}</Notice> : null}
      <View style={styles.formActions}>
        {item ? <DeleteButton label={item.name} busy={busy} onConfirm={() => run(() => deleteItem(supabase, item.id), true)} /> : <View />}
        <View style={styles.actions}>
          <Button kind="secondary" label="Cancelar" onPress={onCancel} disabled={busy} />
          <Button label={busy ? 'Guardando…' : 'Guardar producto'} onPress={save} busy={busy} disabled={uploading} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 15, color: colors.textMuted },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted },
  itemName: { fontSize: 17, fontWeight: '600', color: colors.text },
  itemOut: { color: colors.textMuted },
  itemDesc: { fontSize: 14, color: colors.textMuted },
  itemPrice: { fontSize: 15, fontWeight: '700', color: colors.text },
  photo: { borderRadius: 14, backgroundColor: colors.placeholder, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  itemForm: { gap: 14, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: tones.accent.border, backgroundColor: '#FFFDFB' },
  formTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  hint: { fontSize: 13, color: colors.textMuted, flexShrink: 1 },
  error: { fontSize: 13, fontWeight: '600', color: colors.textDanger },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: colors.borderStrong, justifyContent: 'center', backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.text },
  availRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  formActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  confirm: { fontSize: 14, fontWeight: '600', color: colors.textDanger },
});
