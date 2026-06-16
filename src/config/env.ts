/**
 * Public runtime config. `EXPO_PUBLIC_*` vars are inlined at build time from
 * `.env`. The Supabase anon key and Google client IDs are public by design
 * (they identify the app, not authorize data access).
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

export const env = {
  supabaseUrl: url ?? '',
  supabaseAnonKey: anonKey ?? '',
  /** True when Supabase credentials are configured (backend available). */
  hasSupabase: Boolean(url && anonKey),
  /** Google OAuth Web client ID — the audience Supabase validates the idToken against. */
  googleWebClientId: googleWebClientId ?? '',
  /** Google OAuth iOS client ID — used by the native sign-in flow. */
  googleIosClientId: googleIosClientId ?? '',
};
