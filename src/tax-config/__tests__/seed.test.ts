import { describe, expect, it } from '@jest/globals';

import { validateTaxConfig } from '@/tax-config/schema';
import { SEED_TAX_CONFIG_2025 } from '@/tax-config/seed-2025';

describe('seed TaxConfig 2025', () => {
  it('passes the deterministic validation gate', () => {
    const result = validateTaxConfig(SEED_TAX_CONFIG_2025);
    // Surface the actual problems if it fails.
    if (!result.ok) throw new Error(`seed failed validation:\n${result.errors.join('\n')}`);
    expect(result.ok).toBe(true);
  });

  it('is for tax year 2025 with four quarterly deadlines', () => {
    expect(SEED_TAX_CONFIG_2025.tax_year).toBe(2025);
    expect(SEED_TAX_CONFIG_2025.quarterly_deadlines).toHaveLength(4);
  });

  it('marks no-income-tax states as type "none"', () => {
    expect(SEED_TAX_CONFIG_2025.states.TX).toEqual({ type: 'none' });
  });
});
