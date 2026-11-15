import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  defaultOptionIds,
  describeOptions,
  getMenuItem,
  itemChoices,
  loadShopMenu,
  menuSections,
  optionChoiceError,
  toggleOption,
  unitPriceWithOptions,
} from './customerMenu.ts';
import type { ItemOption, MenuCategory, MenuItem } from './types.ts';

const SHOP = '00000000-0000-4000-8000-000000000001';
const ITEM = '00000000-0000-4000-8000-0000000000d2';

const category = (id: string, name: string, sort_order: number): MenuCategory => ({ id, shop_id: SHOP, name, sort_order, created_at: '' });
const item = (id: string, category_id: string, name: string, price_cents = 5000): MenuItem => ({
  id, shop_id: SHOP, category_id, name, description: 'Con leche', price_cents, photo_url: null, available: true, created_at: '',
});
const option = (id: string, kind: 'size' | 'extra', name: string, price_change_cents: number, available = true): ItemOption => ({
  id, item_id: ITEM, kind, name, price_change_cents, available, created_at: '',
});

const OPTIONS = [
  option('large', 'size', 'Grande', 1000),
  option('medium', 'size', 'Mediano', 0),
  option('vanilla', 'extra', 'Vainilla', 1500),
  option('gone', 'extra', 'Caramelo', 1000, false),
];

describe('menu sections', () => {
  it('orders categories, sorts items by name and skips empty categories', () => {
    const sections = menuSections({
      categories: [category('c2', 'Repostería', 2), category('c1', 'Café', 1), category('c3', 'Vacía', 3)],
      items: [item('i2', 'c1', 'Latte'), item('i1', 'c1', 'Espresso'), item('i3', 'c2', 'Croissant')],
      options: [],
    });
    assert.deepEqual(sections.map((s) => s.category.name), ['Café', 'Repostería']);
    assert.deepEqual(sections[0]!.items.map((i) => i.name), ['Espresso', 'Latte']);
  });
});

describe('item options', () => {
  const choices = itemChoices(OPTIONS, ITEM);

  it('offers available sizes cheapest first and hides sold-out options', () => {
    assert.deepEqual(choices.sizes.map((o) => o.id), ['medium', 'large']);
    assert.deepEqual(choices.extras.map((o) => o.id), ['vanilla']);
    assert.deepEqual(defaultOptionIds(choices), ['medium']);
  });

  it('lists sold-out options too for the dashboard', () => {
    const all = itemChoices(OPTIONS, ITEM, { includeSoldOut: true });
    const shown = all.sizes.length + all.extras.length;
    assert.equal(shown, OPTIONS.filter((o) => o.item_id === ITEM).length);
  });

  it('keeps one size and toggles extras', () => {
    let chosen = defaultOptionIds(choices);
    chosen = toggleOption(choices, chosen, 'large');
    chosen = toggleOption(choices, chosen, 'vanilla');
    assert.deepEqual([...chosen].sort(), ['large', 'vanilla']);
    assert.deepEqual(toggleOption(choices, chosen, 'vanilla'), ['large']);
  });

  it('prices and describes the chosen options', () => {
    const chosen = ['large', 'vanilla'];
    assert.equal(unitPriceWithOptions({ price_cents: 5500 }, choices, chosen), 8000);
    assert.equal(describeOptions({ description: 'x' }, choices, chosen), 'Grande · Vainilla');
    assert.equal(describeOptions({ description: 'Con leche' }, itemChoices([], ITEM), []), 'Con leche');
  });

  it('rejects a missing size, sold-out options and duplicates', () => {
    assert.equal(optionChoiceError(choices, ['medium']), null);
    assert.match(optionChoiceError(choices, ['vanilla']) ?? '', /Elige un tamaño/);
    assert.match(optionChoiceError(choices, ['medium', 'gone']) ?? '', /ya no está disponible/);
    assert.match(optionChoiceError(choices, ['medium', 'vanilla', 'vanilla']) ?? '', /dos veces/);
    assert.equal(optionChoiceError(itemChoices([], ITEM), []), null);
  });
});

describe('reading the menu', () => {
  function fakeClient(results: Record<string, { data: unknown; error: unknown }>) {
    const calls: string[] = [];
    const client = {
      from(table: string) {
        calls.push(table);
        const result = results[table] ?? { data: [], error: null };
        const builder = {
          select: () => builder,
          eq: () => builder,
          in: () => builder,
          order: () => builder,
          maybeSingle: async () => result,
          then: (resolve: (v: unknown) => void) => resolve(result),
        };
        return builder;
      },
      rpc: async () => ({ data: null, error: null }),
    };
    return { client: client as unknown as Parameters<typeof loadShopMenu>[0], calls };
  }

  it('does not query for ids that are not uuids', async () => {
    const { client, calls } = fakeClient({});
    assert.equal(await getMenuItem(client, 'capuchino'), null);
    assert.deepEqual(await loadShopMenu(client, 'lempa'), { categories: [], items: [], options: [] });
    assert.equal(calls.length, 0);
  });

  it('returns null for an item that is missing or hidden', async () => {
    const { client } = fakeClient({ menu_items: { data: null, error: null } });
    assert.equal(await getMenuItem(client, ITEM), null);
  });

  it('turns read errors into a loading message', async () => {
    const { client } = fakeClient({ menu_categories: { data: null, error: { code: 'XX000', message: 'boom' } } });
    await assert.rejects(loadShopMenu(client, SHOP), /No pudimos cargar el menú/);
  });
});
