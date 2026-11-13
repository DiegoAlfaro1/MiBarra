import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText, Button, EmptyState, Stepper, t, textStyle } from '../components/ui';
import { CATEGORIES, PRODUCTS, type MockProduct, type MockShop } from '../data/mock';
import { MILKS, SIZES } from '../data/options';
import { cartTotalCents, defaultSelection, type Selection } from '../lib/cart';
import { formatExtra, formatLempiras } from '../lib/format';
import { buildCartLine } from '../lib/menu';
import { useAppState } from '../state/AppState';
import { WEB_MAX_WIDTH, WebFooter, WebHeader } from './WebHeader';

function Pill({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} aria-pressed={on} onPress={onPress} style={[styles.opt, on && styles.optOn]}>
      <AppText variant="label" color={on ? t.colors.textInverse : t.colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

function CustomizeDialog({ product, onClose, onAdd }: { product: MockProduct; onClose: () => void; onAdd: (s: Selection, qty: number) => void }) {
  const [sel, setSel] = useState<Selection>(defaultSelection());
  const [qty, setQty] = useState(1);
  const unit = buildCartLine(product, 'preview', sel).unitCents;
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose} visible>
      <Pressable accessibilityLabel="Cerrar" style={styles.scrim} onPress={onClose}>
        <Pressable accessible={false} aria-modal role="dialog" aria-label={`Personalizar ${product.name}`} style={styles.dialog} onPress={() => undefined}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <AppText variant="h1" accessibilityRole="header">
                {product.name}
              </AppText>
              <AppText variant="body" color={t.colors.textMuted}>
                {product.description}
              </AppText>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={styles.close}>
              <Feather name="x" size={18} color={t.colors.text} />
            </Pressable>
          </View>
          <View style={styles.group}>
            <AppText variant="bodyStrong">Tamaño</AppText>
            <View style={styles.opts}>
              {SIZES.map((s) => (
                <Pill key={s.id} label={s.extraCents ? `${s.label} ${formatExtra(s.extraCents)}` : s.label} on={sel.sizeId === s.id} onPress={() => setSel({ ...sel, sizeId: s.id })} />
              ))}
            </View>
          </View>
          <View style={styles.group}>
            <AppText variant="bodyStrong">Leche</AppText>
            <View style={styles.opts}>
              {MILKS.map((m) => (
                <Pill key={m.id} label={m.extraCents ? `${m.label} ${formatExtra(m.extraCents)}` : m.label} on={sel.milkId === m.id} onPress={() => setSel({ ...sel, milkId: m.id })} />
              ))}
            </View>
          </View>
          <View style={styles.row}>
            <Stepper value={qty} onChange={setQty} />
            <Button style={styles.flex} label="Agregar al pedido" right={formatLempiras(unit * qty)} onPress={() => onAdd(sel, qty)} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function WebShop({ shop }: { shop: MockShop }) {
  const { cart, dispatch, session } = useAppState();
  const [category, setCategory] = useState<string>(CATEGORIES[0].id);
  const [active, setActive] = useState<MockProduct | null>(null);

  const inCart = cart.shopId === shop.id ? cart : { ...cart, lines: [] };
  const total = cartTotalCents(inCart.lines);
  const items = PRODUCTS.filter((p) => p.categoryId === category);
  const title = CATEGORIES.find((c) => c.id === category)?.label ?? '';

  const add = (product: MockProduct, selection: Selection | null, qty = 1) => {
    dispatch({ type: 'add', line: buildCartLine(product, shop.id, selection, qty) });
    setActive(null);
  };
  const pick = (product: MockProduct) => (product.customizable ? setActive(product) : add(product, null));

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <WebHeader />
        <View style={styles.band}>
          <View style={[styles.inner, styles.bandInner]}>
            <View style={styles.row}>
              <View style={styles.logo}>
                <AppText variant="h2" color={t.colors.textAccent}>
                  {shop.initials}
                </AppText>
              </View>
              <View>
                <AppText variant="display" color={t.colors.textInverse} accessibilityRole="header" aria-level={1} style={styles.shopName}>
                  {shop.name}
                </AppText>
                <AppText variant="bodySm" color={t.colors.textInverse}>
                  {`${shop.area} · ${shop.hoursLabel} · ${shop.waitLabel}`}
                </AppText>
              </View>
            </View>
            <View style={styles.stamps}>
              <AppText variant="label" color={t.colors.textInverse}>{`Tienes ${shop.stamps}/${shop.stampGoal} sellos aquí`}</AppText>
            </View>
          </View>
        </View>

        <View style={[styles.inner, styles.body]}>
          <View accessibilityRole="navigation" aria-label="Categorías" style={styles.cats}>
            {CATEGORIES.map((c) => {
              const on = c.id === category;
              return (
                <Pressable key={c.id} accessibilityRole="button" accessibilityState={{ selected: on }} aria-current={on ? 'true' : undefined} onPress={() => setCategory(c.id)} style={[styles.cat, on && styles.catOn]}>
                  <AppText variant={on ? 'bodyStrong' : 'body'} color={on ? t.colors.textInverse : t.colors.text}>
                    {c.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.menu}>
            <AppText variant="h1" accessibilityRole="header" aria-level={2}>
              {title}
            </AppText>
            {items.length ? (
              <View style={styles.grid}>
                {items.map((item) =>
                  item.soldOut ? (
                    <View key={item.id} accessible aria-disabled accessibilityLabel={`${item.name}. Agotado hoy`} style={[styles.item, styles.itemOut]}>
                      <View style={[styles.photo, { backgroundColor: t.colors.border }]} />
                      <View style={styles.itemBody}>
                        <AppText variant="bodyStrong" color={t.colors.textMuted}>
                          {item.name}
                        </AppText>
                        <AppText variant="bodySm" color={t.colors.textMuted}>
                          {item.description}
                        </AppText>
                        <AppText variant="overline" color={t.colors.textDanger}>
                          Agotado hoy
                        </AppText>
                      </View>
                    </View>
                  ) : (
                    <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.name}, ${formatLempiras(item.priceCents)}. ${item.description}. Agregar al pedido`} onPress={() => pick(item)} style={styles.item}>
                      <View style={[styles.photo, { backgroundColor: t.colors.placeholder }]}>
                        <Feather name="coffee" size={44} color={t.colors.onPlaceholder} />
                      </View>
                      <View style={styles.itemBody}>
                        <AppText variant="bodyStrong">{item.name}</AppText>
                        <AppText variant="bodySm" color={t.colors.textMuted}>
                          {item.description}
                        </AppText>
                        <View style={styles.row}>
                          <AppText variant="bodyStrong" style={styles.flex}>
                            {formatLempiras(item.priceCents)}
                          </AppText>
                          <View style={styles.plus}>
                            <Feather name="plus" size={20} color={t.colors.textInverse} />
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  ),
                )}
              </View>
            ) : (
              <EmptyState icon="coffee" title="Sin productos" body="Esta categoría no tiene productos por ahora." />
            )}
          </View>

          <View accessibilityRole="complementary" aria-label="Tu pedido" style={styles.cart}>
            <AppText variant="h2" accessibilityRole="header" aria-level={2}>
              Tu pedido
            </AppText>
            {inCart.lines.length === 0 ? (
              <AppText variant="body" color={t.colors.textMuted}>
                Aún no has agregado nada.
              </AppText>
            ) : (
              inCart.lines.map((line) => (
                <View key={line.id} style={styles.line}>
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong">{`${line.quantity} × ${line.name}`}</AppText>
                    <AppText variant="caption" color={t.colors.textMuted}>
                      {line.optionsLabel}
                    </AppText>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Quitar ${line.name}`} onPress={() => dispatch({ type: 'remove', id: line.id })} style={styles.remove}>
                      <AppText variant="label" color={t.colors.textDanger} style={styles.underline}>
                        Quitar
                      </AppText>
                    </Pressable>
                  </View>
                  <AppText variant="bodyStrong">{formatLempiras(line.unitCents * line.quantity)}</AppText>
                </View>
              ))
            )}
            <View style={styles.noteWrap}>
              <AppText variant="label">Nota para la cafetería</AppText>
              <TextInput
                accessibilityLabel="Nota para la cafetería"
                placeholder="Ej.: sin tapa, extra caliente"
                placeholderTextColor={t.colors.textSubtle}
                value={cart.note}
                onChangeText={(note) => dispatch({ type: 'setNote', note })}
                multiline
                maxLength={200}
                style={[textStyle('bodySm'), styles.note]}
              />
            </View>
            <View style={styles.row}>
              <AppText variant="bodyStrong" style={styles.flex}>
                Total
              </AppText>
              <AppText variant="h2">{formatLempiras(total)}</AppText>
            </View>
            <Button label="Continuar al pago" disabled={inCart.lines.length === 0} onPress={() => router.push(session ? '/checkout' : '/login')} />
            <AppText variant="caption" color={t.colors.textMuted} style={styles.center}>
              Este pedido suma 1 sello
            </AppText>
          </View>
        </View>
        <WebFooter />
      </ScrollView>
      {active ? <CustomizeDialog product={active} onClose={() => setActive(null)} onAdd={(s, q) => add(active, s, q)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1, backgroundColor: t.colors.background },
  scroll: { flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inner: { width: '100%', maxWidth: WEB_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 24 },
  band: { backgroundColor: t.colors.primary },
  bandInner: { paddingVertical: 32, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  logo: { width: 72, height: 72, borderRadius: 20, backgroundColor: t.colors.surface, alignItems: 'center', justifyContent: 'center' },
  shopName: { fontSize: 36, lineHeight: 42 },
  stamps: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.25)' },
  body: { paddingTop: 28, paddingBottom: 64, flexDirection: 'row', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' },
  cats: { flexGrow: 1, flexBasis: 180, maxWidth: 220, gap: 4 },
  cat: { minHeight: 44, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center' },
  catOn: { backgroundColor: t.colors.surfaceInverse },
  menu: { flexGrow: 999, flexShrink: 1, flexBasis: 460, minWidth: 0, gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  item: { flexGrow: 1, flexBasis: 240, maxWidth: 340, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, borderRadius: 20, overflow: 'hidden' },
  itemOut: { backgroundColor: t.colors.surfaceMuted, borderStyle: 'dashed', borderColor: t.colors.borderStrong },
  photo: { height: 120, alignItems: 'center', justifyContent: 'center' },
  itemBody: { gap: 6, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 16 },
  plus: { width: 36, height: 36, borderRadius: 18, backgroundColor: t.colors.surfaceInverse, alignItems: 'center', justifyContent: 'center' },
  cart: { flexGrow: 1, flexBasis: 300, maxWidth: 360, gap: 14, padding: 20, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, borderRadius: 22 },
  line: { flexDirection: 'row', gap: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: t.colors.surfaceMuted },
  remove: { minHeight: 32, justifyContent: 'center', alignSelf: 'flex-start' },
  underline: { textDecorationLine: 'underline' },
  noteWrap: { gap: 6 },
  note: { minHeight: 60, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: t.colors.borderStrong, color: t.colors.text, textAlignVertical: 'top' },
  center: { textAlign: 'center' },
  scrim: { flex: 1, backgroundColor: 'rgba(28,25,23,0.55)', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 96, paddingHorizontal: 16 },
  dialog: { width: '100%', maxWidth: 520, backgroundColor: t.colors.surface, borderRadius: 24, padding: 24, gap: 18 },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  group: { gap: 10 },
  opts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opt: { minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: t.colors.border, backgroundColor: t.colors.surface, justifyContent: 'center' },
  optOn: { backgroundColor: t.colors.surfaceInverse, borderColor: t.colors.surfaceInverse },
});
