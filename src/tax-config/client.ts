import { env } from '@/config/env';
import { taxConfigCacheRepo } from '@/data/repositories/tax-config-cache';
import { supabase } from '@/services/supabase';
import { SEED_TAX_CONFIG_2025 } from '@/tax-config/seed-2025';
import { validateTaxConfig } from '@/tax-config/schema';
import { type TaxConfig } from '@/tax-config/types';

/** Bundled offline-first fallbacks, keyed by tax year. */
const SEEDS: Record<number, TaxConfig> = {
  2025: SEED_TAX_CONFIG_2025,
};

export type TaxConfigSource = 'backend' | 'cache' | 'seed';
export type LoadedTaxConfig = { config: TaxConfig; source: TaxConfigSource };

async function fetchFromBackend(year: number): Promise<unknown | null> {
  const { data, error } = await supabase
    .from('tax_configs')
    .select('config')
    .eq('tax_year', year)
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

  throw new Error(`No TaxConfig available for tax year ${year}`);
}
