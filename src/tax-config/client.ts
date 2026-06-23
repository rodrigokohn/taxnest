import { env } from '@/config/env';
import { taxConfigCacheRepo } from '@/data/repositories/tax-config-cache';
import { supabase } from '@/services/supabase';
import { SEED_TAX_CONFIG_2025 } from '@/tax-config/seed-2025';
import { SEED_TAX_CONFIG_2026 } from '@/tax-config/seed-2026';
import { validateTaxConfig } from '@/tax-config/schema';
import { type TaxConfig } from '@/tax-config/types';

/** Bundled offline-first fallbacks, keyed by tax year. */
const SEEDS: Record<number, TaxConfig> = {
  2025: SEED_TAX_CONFIG_2025,
  2026: SEED_TAX_CONFIG_2026,
};

/** Newest bundled seed year — the offline fallback the UI defaults to before load. */
export const LATEST_SEED_YEAR = Math.max(...Object.keys(SEEDS).map(Number));

export type TaxConfigSource = 'backend' | 'cache' | 'seed';
export type LoadedTaxConfig = { config: TaxConfig; source: TaxConfigSource };

async function fetchFromBackend(year: number): Promise<unknown | null> {
  // Most recent config at or before the requested year, so adding a newer year
  // to the backend advances the app automatically (no app update needed).
  const { data, error } = await supabase
    .from('tax_configs')
    .select('config')
    .lte('tax_year', year)
    .order('tax_year', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as { config: unknown } | null)?.config ?? null;
}

/**
 * Load the TaxConfig for a tax year.
 *
 * Resolution order: backend (validated, then cached) → validated local cache →
 * bundled seed. EVERY path runs through {@link validateTaxConfig}, so a
 * malformed config — whatever its origin — can never reach the engine
 * (PRD §8.2: fall back to the last saved rates).
 */
export async function loadTaxConfig(year: number): Promise<LoadedTaxConfig> {
  if (env.hasSupabase) {
    try {
      const remote = await fetchFromBackend(year);
      if (remote) {
        const result = validateTaxConfig(remote);
        if (result.ok) {
          await taxConfigCacheRepo.save(result.config);
          return { config: result.config, source: 'backend' };
        }
      }
    } catch {
      // Network/backend error — fall through to cache, then seed.
    }
  }

  const cached = await taxConfigCacheRepo.get(year);
  if (cached) {
    const result = validateTaxConfig(cached);
    if (result.ok) return { config: result.config, source: 'cache' };
  }

  const seed = SEEDS[year];
  if (seed) return { config: seed, source: 'seed' };

  // Never leave the app without a config (it would crash the projections).
  // Fall back to the most recent bundled year we have at or before the
  // requested one (else the newest we ship). The config's own `tax_year`
  // tells the UI which year it actually is ("using last saved rates").
  const seedYears = Object.keys(SEEDS)
    .map(Number)
    .filter((y) => Number.isFinite(y));
  if (seedYears.length > 0) {
    const atOrBefore = seedYears.filter((y) => y <= year).sort((a, b) => b - a);
    const fallbackYear = atOrBefore[0] ?? Math.max(...seedYears);
    return { config: SEEDS[fallbackYear], source: 'seed' };
  }

  throw new Error(`No TaxConfig available for tax year ${year}`);
}
