/**
 * Public runtime config. `EXPO_PUBLIC_*` vars are inlined at build time from
 * `.env`. The Supabase anon key is public by design (Row Level Security guards
 * the data), so it is safe in the client bundle.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const env = {
  supabaseUrl: url ?? '',
  supabaseAnonKey: anonKey ?? '',
  /** True when Supabase credentials are configured (backend available). */
  hasSupabase: Boolean(url && anonKey),
};
