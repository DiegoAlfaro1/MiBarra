import { createMiBarraClient, readSupabaseEnv } from '@mibarra/shared';

// Read literally so Expo inlines the values at build time.
const env = readSupabaseEnv({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});

// Web only: sessions are kept in localStorage.
export const supabase = createMiBarraClient(env, { detectSessionInUrl: true });
