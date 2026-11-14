// Guards against the TypeScript domain types drifting from the SQL schema.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

import { OPTION_KINDS, ORDER_STATUSES, PAYMENT_PROVIDERS, PAYMENT_STATUSES, STAFF_ROLES } from './types.ts';

const dir = new URL('../../../supabase/migrations/', import.meta.url);
const sql = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(new URL(f, dir), 'utf8'))
  .join('\n');

const MODEL_TABLES = [
  'shops',
  'menu_categories',
  'menu_items',
  'item_options',
  'customers',
  'orders',
  'order_items',
  'loyalty_cards',
];

/** Values listed in `check (<column> in ('a', 'b'))`. */
function checkValues(column: string): string[] {
  const match = new RegExp(`${column}\\s+in\\s*\\(([^)]*)\\)`).exec(sql);
  assert.ok(match?.[1], `no check constraint found for ${column}`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1] as string);
}

// Tables created before they were renamed had RLS enabled under their original name.
const ORIGINAL_NAME: Record<string, string> = { menu_items: 'products', customers: 'profiles' };

test('every model table exists and has row level security enabled', () => {
  for (const table of MODEL_TABLES) {
    const original = ORIGINAL_NAME[table];
    const created = original
      ? `alter table public\\.${original} rename to ${table}\\b`
      : `create table public\\.${table}\\b`;
    assert.match(sql, new RegExp(created), `${table} is created`);
    assert.match(sql, new RegExp(`alter table public\\.(${original ?? table}) enable row level security`), `${table} RLS`);
  }
});

test('TypeScript enums match the SQL check constraints', () => {
  assert.deepEqual(checkValues('status'), [...ORDER_STATUSES]);
  assert.deepEqual(checkValues('payment_status'), [...PAYMENT_STATUSES]);
  assert.deepEqual(checkValues('payment_provider'), [...PAYMENT_PROVIDERS]);
  assert.deepEqual(checkValues('kind'), [...OPTION_KINDS]);
  assert.deepEqual(checkValues('role'), [...STAFF_ROLES]);
});

test('money is integer cents and one loyalty card exists per customer and shop', () => {
  assert.match(sql, /unit_price_cents integer not null/);
  assert.match(sql, /price_change_cents integer not null/);
  assert.match(sql, /unique \(customer_id, shop_id\)/);
  assert.match(sql, /unique \(customer_id, idempotency_key\)/);
});
