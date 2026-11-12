import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ConfigError, readSupabaseEnv } from './env.ts';

test('returns trimmed values and drops trailing slashes', () => {
  assert.deepEqual(readSupabaseEnv({ url: ' http://127.0.0.1:54321/ ', anonKey: ' key ' }), {
    url: 'http://127.0.0.1:54321',
    anonKey: 'key',
  });
});

test('rejects a missing URL with a clear message', () => {
  assert.throws(() => readSupabaseEnv({ anonKey: 'key' }), {
    name: ConfigError.name,
    message: /Missing EXPO_PUBLIC_SUPABASE_URL/,
  });
});

test('rejects a missing key with a clear message', () => {
  assert.throws(() => readSupabaseEnv({ url: 'https://x.supabase.co', anonKey: '  ' }), {
    message: /Missing EXPO_PUBLIC_SUPABASE_ANON_KEY/,
  });
});

test('rejects invalid URLs and non-http protocols', () => {
  assert.throws(() => readSupabaseEnv({ url: 'not a url', anonKey: 'k' }), { message: /not a valid URL/ });
  assert.throws(() => readSupabaseEnv({ url: 'ftp://x.supabase.co', anonKey: 'k' }), { message: /http/ });
});
