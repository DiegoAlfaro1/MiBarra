export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Validates the public Supabase settings.
 *
 * Expo only inlines `EXPO_PUBLIC_*` variables when they are read literally,
 * so callers pass the values in: `readSupabaseEnv({ url: process.env.EXPO_PUBLIC_SUPABASE_URL, ... })`.
 */
export function readSupabaseEnv(raw: { url?: string; anonKey?: string }): SupabaseEnv {
  const url = raw.url?.trim();
  const anonKey = raw.anonKey?.trim();

  if (!url) {
    throw new ConfigError('Missing EXPO_PUBLIC_SUPABASE_URL. Copy .env.example to .env and fill it in.');
  }
  if (!anonKey) {
    throw new ConfigError('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env and fill it in.');
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ConfigError(`EXPO_PUBLIC_SUPABASE_URL is not a valid URL: "${url}".`);
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new ConfigError('EXPO_PUBLIC_SUPABASE_URL must start with http:// or https://.');
  }

  return { url: url.replace(/\/+$/, ''), anonKey };
}
