/**
 * Public runtime config. `EXPO_PUBLIC_*` vars are inlined at build time from
 * `.env`. The Supabase anon key is public by design (it identifies the app, not
 * authorize data access — RLS does that).
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const revenueCatIosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;

export const env = {
  supabaseUrl: url ?? '',
  supabaseAnonKey: anonKey ?? '',
  /** True when Supabase credentials are configured (backend available). */
  hasSupabase: Boolean(url && anonKey),
  /** RevenueCat iOS public SDK key — safe to embed (identifies the app, not authorizes). */
  revenueCatIosKey: revenueCatIosKey ?? '',
  /** True when RevenueCat is configured (in-app purchases available). */
  hasPurchases: Boolean(revenueCatIosKey),
};
