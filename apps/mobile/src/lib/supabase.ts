import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMiBarraClient, readSupabaseEnv } from '@mibarra/shared';
import { Platform } from 'react-native';

// Read literally so Expo inlines the values at build time.
const env = readSupabaseEnv({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});

export const supabase = createMiBarraClient(env, {
  // On web supabase-js uses localStorage; AsyncStorage on native.
  storage: Platform.OS === 'web' ? undefined : AsyncStorage,
  detectSessionInUrl: Platform.OS === 'web',
});
