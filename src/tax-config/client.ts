import { taxConfigCacheRepo } from '@/data/repositories/tax-config-cache';
import { SEED_TAX_CONFIG_2025 } from '@/tax-config/seed-2025';
import { validateTaxConfig } from '@/tax-config/schema';
import { type TaxConfig } from '@/tax-config/types';

/** Bundled offline-first fallbacks, keyed by tax year. */
const SEEDS: Record<number, TaxConfig> = {
  2025: SEED_TAX_CONFIG_2025,
};

export type TaxConfigSource = 'backend' | 'cache' | 'seed';
export type LoadedTaxConfig = { config: TaxConfig; source: TaxConfigSource };

/**
 * Load the TaxConfig for a tax year.
 *
 * Phase 1 resolution order: validated local cache → bundled seed. The backend
 * fetch (and "store to cache") is layered in at Phase 3 ahead of the cache step;
 * every path runs through {@link validateTaxConfig} so a malformed config can
 * never reach the engine (PRD §8.2 error handling).
 */
export async function loadTaxConfig(year: number): Promise<LoadedTaxConfig> {
  const cached = await taxConfigCacheRepo.get(year);
  if (cached) {
    const result = validateTaxConfig(cached);
    if (result.ok) return { config: result.config, source: 'cache' };
  }

  const seed = SEEDS[year];
  if (seed) return { config: seed, source: 'seed' };

  throw new Error(`No TaxConfig available for tax year ${year}`);
}
