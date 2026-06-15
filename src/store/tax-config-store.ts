import { create } from 'zustand';

import { loadTaxConfig, type TaxConfigSource } from '@/tax-config/client';
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
