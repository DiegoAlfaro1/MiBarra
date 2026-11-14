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

/** Same storage the Supabase session lives in; used for the "stay logged in" deadline. */
export const keepStorage = {
  getItem: async (key: string) => (Platform.OS === 'web' ? globalThis.localStorage.getItem(key) : AsyncStorage.getItem(key)),
  setItem: async (key: string, value: string) =>
    Platform.OS === 'web' ? globalThis.localStorage.setItem(key, value) : AsyncStorage.setItem(key, value),
  removeItem: async (key: string) =>
    Platform.OS === 'web' ? globalThis.localStorage.removeItem(key) : AsyncStorage.removeItem(key),
};
