import { create } from 'zustand';

import { LATEST_SEED_YEAR, loadTaxConfig, type TaxConfigSource } from '@/tax-config/client';
import { type TaxConfig } from '@/tax-config/types';

type Status = 'idle' | 'loading' | 'ready' | 'error';

type TaxConfigState = {
  config: TaxConfig | null;
  source: TaxConfigSource | null;
  status: Status;
  load: (year: number) => Promise<void>;
};

export const useTaxConfigStore = create<TaxConfigState>()((set) => ({
  config: null,
  source: null,
  status: 'idle',

  async load(year) {
    set({ status: 'loading' });
    try {
      const { config, source } = await loadTaxConfig(year);
      set({ config, source, status: 'ready' });
    } catch {
      set({ status: 'error' });
    }
  },
}));

/**
 * The tax year the app operates on: the loaded config's own year (so it follows
 * whatever the backend serves), falling back to the newest bundled seed before
 * the config loads. Drives the year shown in the UI and which year data is keyed to.
 */
export function useActiveTaxYear(): number {
  return useTaxConfigStore((s) => s.config?.tax_year ?? LATEST_SEED_YEAR);
}
