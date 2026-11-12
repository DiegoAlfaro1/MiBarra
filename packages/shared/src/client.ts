import { createClient, type SupabaseClient, type SupportedStorage } from '@supabase/supabase-js';

import type { SupabaseEnv } from './env.ts';

export interface CreateClientOptions {
  /** Session storage. Use AsyncStorage on native; omit on web to use localStorage. */
  storage?: SupportedStorage;
  /** Set to true on web so OAuth / magic-link redirects are picked up from the URL. */
  detectSessionInUrl?: boolean;
}

export function createMiBarraClient(env: SupabaseEnv, options: CreateClientOptions = {}): SupabaseClient {
  return createClient(env.url, env.anonKey, {
    auth: {
      storage: options.storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: options.detectSessionInUrl ?? false,
    },
  });
}
