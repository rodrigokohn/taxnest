import { getDb } from '@/data/db';
import { type TaxConfig } from '@/tax-config/types';

type Row = { json: string };

/** Local cache of TaxConfigs fetched from the backend, keyed by tax year. */
export const taxConfigCacheRepo = {
  /** Returns the raw parsed JSON (unvalidated) for a year, or null. */
  async get(taxYear: number): Promise<unknown | null> {
    const row = await getDb().getFirstAsync<Row>(
      'SELECT json FROM tax_config_cache WHERE tax_year = ?',
      taxYear,
    );
    if (!row) return null;
    try {
      return JSON.parse(row.json);
    } catch {
      return null;
    }
  },

  async save(config: TaxConfig): Promise<void> {
    await getDb().runAsync(
      `INSERT OR REPLACE INTO tax_config_cache (tax_year, json, last_updated, cached_at)
       VALUES (?, ?, ?, ?)`,
      config.tax_year,
      JSON.stringify(config),
      config.last_updated,
      new Date().toISOString(),
    );
  },
};
